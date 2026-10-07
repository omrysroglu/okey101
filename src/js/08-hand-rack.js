/* ============================== SORT / SELECT HAND ============================== */
function sortSingles(ids, room){
  const oc=room.okeyColor, on=room.okeyNumber;
  const k=id=>{ const t=normTile(room.allTilesById[id],oc,on); return isOkey(t,oc,on)?999:COLORS.indexOf(t.color)*13+t.number; };
  return ids.slice().sort((a,b)=>k(a)-k(b));
}
// grupları ıstakaya yerleştir: grup satır taşmaz, gruplar arası 1 boşluk (sığmazsa boşluksuz), kalanlar sona
function layoutRack(groups, rest){
  const cols=rackCols();
  const tryLayout=(gap)=>{
    const slots=Array(RACK_SLOTS).fill(null); let pos=0;
    for(const g of groups){
      if(pos%cols && pos%cols+g.length>cols) pos=Math.ceil(pos/cols)*cols;
      if(pos+g.length>RACK_SLOTS) return null;
      g.forEach(id=>{ slots[pos++]=id; });
      if(gap && pos%cols) pos++;
    }
    if(!gap && rest.length && pos%cols) pos++;
    for(const id of rest){ if(pos>=RACK_SLOTS) return null; slots[pos++]=id; }
    return slots;
  };
  S.rackSlots = tryLayout(true) || tryLayout(false) || (()=>{ const s=Array(RACK_SLOTS).fill(null); groups.flat().concat(rest).forEach((id,i)=>{ s[i]=id; }); return s; })();
  S.selectedTid=null;
}
// Seri Diz: ulaşılabilecek en yüksek puanlı perleri kurar
function sortMyHand(){
  const room=S.room, plan=bestMeldPlan(room.hands[S.mySeat], room);
  const groups=plan.groups.map(g=>{ const a=arrangeMeld(g,room); return a?a.ids:g; }).sort((a,b)=>b.length-a.length);
  layoutRack(groups, sortSingles(plan.leftover, room));
  notify(plan.groups.length ? `Seri diz: ${plan.groups.length} per, toplam ${plan.value} puan${plan.value>=OPEN_MIN?' (açabilirsin)':''}.` : 'Elinde per oluşmuyor.');
}
// Çift Diz: çiftleri (okeyle tamamlananlar dahil) yan yana dizer
function sortPairsHand(){
  const room=S.room, plan=bestPairPlan(room.hands[S.mySeat], room);
  layoutRack(plan.pairs, sortSingles(plan.leftover, room));
  notify(`Çift diz: ${plan.pairs.length} çift${plan.pairs.length>=OPEN_MIN_PAIRS?' (açabilirsin)':''}.`);
}

/* ============================== RACK (ıstaka) + DRAG & DROP ============================== */
const RACK_SLOTS = 30;
function rackCols(){ return window.innerWidth < 760 ? 10 : 15; }   // masaüstü 2x15, telefon 3x10

function syncRack(hand){
  if(!Array.isArray(S.rackSlots) || S.rackSlots.length!==RACK_SLOTS) S.rackSlots = Array(RACK_SLOTS).fill(null);
  const inHand = new Set(hand);
  S.rackSlots = S.rackSlots.map(id => (id && inHand.has(id)) ? id : null);
  const placed = new Set(S.rackSlots.filter(Boolean));
  const missing = hand.filter(id=>!placed.has(id));
  if(missing.length===0) return;
  if(placed.size===0){
    // yeni dağıtım: taşları satırlara eşit yay
    const cols=rackCols(), rows=Math.ceil(missing.length/cols), perRow=Math.ceil(missing.length/rows);
    missing.forEach((id,i)=>{ S.rackSlots[Math.floor(i/perRow)*cols + (i%perRow)] = id; });
  } else {
    for(const id of missing){ const i=S.rackSlots.indexOf(null); if(i===-1) break; S.rackSlots[i]=id; }
  }
}
function moveRackTile(tid, toIdx){
  const from = S.rackSlots.indexOf(tid);
  if(from===-1 || from===toIdx) return;
  const other = S.rackSlots[toIdx];          // boşsa taşınır, doluysa yer değiştirir
  S.rackSlots[toIdx]=tid; S.rackSlots[from]=other;
}
// Istakada yan yana duran ve kurala uygun (seri/set) taşları otomatik per olarak tanır.
function rackMelds(room){
  const cols=rackCols(), rows=RACK_SLOTS/cols, oc=room.okeyColor, on=room.okeyNumber, out=[];
  for(let r=0;r<rows;r++){
    let c=0;
    while(c<cols){
      if(!S.rackSlots[r*cols+c]){ c++; continue; }
      let e=c; while(e<cols && S.rackSlots[r*cols+e]) e++;
      const idxs=[]; for(let k=c;k<e;k++) idxs.push(r*cols+k);
      const ids=idxs.map(i=>S.rackSlots[i]), n=ids.length;
      const best=[{cov:0,val:0,prev:-1,grp:false}];
      for(let i=1;i<=n;i++){
        let b={cov:best[i-1].cov,val:best[i-1].val,prev:i-1,grp:false};
        for(let L=3;L<=Math.min(13,i);L++){
          const res=validateGroup(ids.slice(i-L,i).map(id=>room.allTilesById[id]),oc,on);
          if(!res.valid) continue;
          const cand={cov:best[i-L].cov+L,val:best[i-L].val+res.value,prev:i-L,grp:true,gval:res.value};
          if(cand.cov>b.cov || (cand.cov===b.cov && cand.val>b.val)) b=cand;
        }
        best.push(b);
      }
      let i=n;
      while(i>0){ const b=best[i]; if(b.grp) out.push({slots:idxs.slice(b.prev,i), ids:ids.slice(b.prev,i), value:b.gval}); i=b.prev; }
      c=e;
    }
  }
  return out;
}

// Per içindeki bir taş sürüklenirse perin tamamı taşınır. Seçili (kaldırılmış) taş tek başına taşınır.
function meldOfTile(tid){
  if(!S.room || S.selectedTid===tid) return null;
  const m=rackMelds(S.room).find(m=>m.ids.includes(tid)) || rackPairs(S.room).find(m=>m.ids.includes(tid));
  return m && m.ids.length>1 ? m : null;
}
function groupTargetStart(grp, idx){
  const cols=rackCols(), rs=Math.floor(idx/cols)*cols;
  return Math.max(rs, Math.min(idx-grp.k, rs+cols-grp.ids.length));
}
function moveRackGroup(ids, st){
  const slots=S.rackSlots;
  const from=ids.map(id=>slots.indexOf(id));
  if(from.some(i=>i<0)) return;
  from.forEach(i=>{ slots[i]=null; });
  const targets=ids.map((_,k)=>st+k);
  const displaced=targets.map(i=>slots[i]).filter(Boolean);
  targets.forEach((i,k)=>{ slots[i]=ids[k]; });
  const free=from.filter(i=>!slots[i]);
  displaced.forEach(id=>{ let i=free.length?free.shift():slots.indexOf(null); if(i>=0) slots[i]=id; });
}
// Istakada yan yana duran çiftleri tanır (2'li gruplar; aralıksız dizilmiş çift blokları da bölünür)
function rackPairs(room){
  const cols=rackCols(), rows=RACK_SLOTS/cols, oc=room.okeyColor, on=room.okeyNumber, out=[];
  for(let r=0;r<rows;r++){
    let c=0;
    while(c<cols){
      if(!S.rackSlots[r*cols+c]){ c++; continue; }
      let e=c; while(e<cols && S.rackSlots[r*cols+e]) e++;
      const idxs=[]; for(let k=c;k<e;k++) idxs.push(r*cols+k);
      if(idxs.length%2===0){
        const ps=[];
        for(let k=0;k<idxs.length;k+=2){
          const ids=[S.rackSlots[idxs[k]], S.rackSlots[idxs[k+1]]];
          if(!validatePairs(ids.map(id=>room.allTilesById[id]),oc,on).valid){ ps.length=0; break; }
          ps.push({slots:[idxs[k],idxs[k+1]], ids});
        }
        ps.forEach(p=>out.push(p));
      }
      c=e;
    }
  }
  return out;
}
function canDiscardNow(){ return !!(S.room && S.room.status==='playing' && isMyTurn() && S.room.turnPhase==='discard'); }

function clearOver(){ document.querySelectorAll('.slot.over,.mid.over,.meld.over').forEach(x=>x.classList.remove('over')); }
// Taş masadaki bir pere işlenebiliyorsa, bırakılan noktaya en yakın uygun peri döndür
function nearestWorkTarget(tid, x, y){
  const r=S.room, me=S.mySeat, mi=r && r.opened && r.opened[me];
  if(!mi || mi.mode!=='groups' || !r.hands[me].includes(tid) || r.hands[me].length<2) return null;
  let best=null, bd=Infinity;
  document.querySelectorAll('.meld[data-seat]').forEach(el=>{
    const seat=parseInt(el.dataset.seat,10), gi=parseInt(el.dataset.gi,10);
    const oi=r.opened[seat]; if(!oi || oi.mode!=='groups') return;
    const meld=r.table[seat] && r.table[seat][gi]; if(!meld) return;
    if(!findSwapOkey(tid, meld, r) && !canExtendMeld(tid, meld, r)) return;
    const b=el.getBoundingClientRect();
    const dx=Math.max(b.left-x,0,x-b.right), dy=Math.max(b.top-y,0,y-b.bottom), dist=Math.hypot(dx,dy);
    if(dist<bd){ bd=dist; best={seat, gi, el}; }
  });
  return best;
}
function dragListenersOff(){
  window.removeEventListener('pointermove', dragMove);
  window.removeEventListener('pointerup', dragEnd);
  window.removeEventListener('pointercancel', dragCancel);
  window.removeEventListener('blur', dragCancel);
}
function rackPointerDown(e, tid){
  if(e.pointerType==='mouse' && e.button!==0) return;
  e.preventDefault();
  const el=e.currentTarget, r=el.getBoundingClientRect();
  const m=meldOfTile(tid);
  let grp=null, fr=r;
  if(m){
    grp={ids:m.ids.slice(), k:m.ids.indexOf(tid)};
    const first=document.querySelector(`.slot[data-idx="${m.slots[0]}"] .tile`);
    if(first) fr=first.getBoundingClientRect();
  }
  S.drag={tid, el, grp, x0:e.clientX, y0:e.clientY, offX:e.clientX-fr.left, offY:e.clientY-fr.top, w:r.width, h:r.height, active:false, ghost:null};
  window.addEventListener('pointermove', dragMove);
  window.addEventListener('pointerup', dragEnd);
  window.addEventListener('pointercancel', dragCancel);
  window.addEventListener('blur', dragCancel);
}
function dragMove(e){
  const d=S.drag; if(!d) return;
  if(!d.active){
    if(Math.hypot(e.clientX-d.x0, e.clientY-d.y0) < 6) return;
    d.active=true;
    if(d.grp){
      const g=document.createElement('div'); g.className='drag-ghost group-ghost';
      d.grp.ids.forEach(id=>{
        const src=document.querySelector(`.slot[data-idx="${S.rackSlots.indexOf(id)}"] .tile`); if(!src) return;
        const c=src.cloneNode(true); c.classList.remove('selected'); c.removeAttribute('onpointerdown');
        c.style.width=d.w+'px'; c.style.height=d.h+'px';
        g.appendChild(c); src.style.opacity='.25';
      });
      document.body.appendChild(g); d.ghost=g;
    } else {
      const g=d.el.cloneNode(true);
      g.classList.remove('selected'); g.classList.add('drag-ghost');
      g.removeAttribute('onpointerdown');
      g.style.width=d.w+'px'; g.style.height=d.h+'px';
      document.body.appendChild(g); d.ghost=g;
      d.el.style.opacity='.25';
    }
  }
  d.ghost.style.left=(e.clientX-d.offX)+'px';
  d.ghost.style.top=(e.clientY-d.offY)+'px';
  clearOver();
  const t=document.elementFromPoint(e.clientX,e.clientY);
  const slot=t && t.closest ? t.closest('.slot') : null;
  if(slot && d.grp){
    const st=groupTargetStart(d.grp, parseInt(slot.dataset.idx,10));
    d.grp.ids.forEach((_,k)=>{ const s=document.querySelector(`.slot[data-idx="${st+k}"]`); if(s) s.classList.add('over'); });
    return;
  }
  if(slot){ slot.classList.add('over'); return; }
  if(d.grp) return;
  const meldEl=t && t.closest ? t.closest('.meld[data-seat]') : null;
  if(meldEl && canDiscardNow()){ meldEl.classList.add('over'); return; }
  const mid=t && t.closest ? t.closest('.mid') : null;
  if(mid && canDiscardNow()){
    const inRuns=t.closest('.mz-runs');   // yalnızca per alanına bırakılırsa işle; başka yer = at
    const tgt=inRuns?nearestWorkTarget(d.tid, e.clientX, e.clientY):null;
    if(tgt) tgt.el.classList.add('over'); else mid.classList.add('over');
  }
}
async function dragEnd(e){
  const d=S.drag; dragListenersOff(); if(!d) return;
  const target = d.active ? document.elementFromPoint(e.clientX,e.clientY) : null;
  if(d.ghost) d.ghost.remove();
  clearOver();
  S.drag=null;
  if(!d.active){
    // sürükleme yok: tıklama. Aynı taşa hızlı çift tık = at
    const now=Date.now();
    if(S.lastClick && S.lastClick.tid===d.tid && now-S.lastClick.t<350 && canDiscardNow()){
      S.lastClick=null; S.selectedTid=null; await discardTile(d.tid); return;
    }
    S.lastClick={tid:d.tid, t:now};
    S.selectedTid = (S.selectedTid===d.tid) ? null : d.tid;
    render(); return;
  }
  const slot=target && target.closest ? target.closest('.slot') : null;
  if(slot && d.grp){ moveRackGroup(d.grp.ids, groupTargetStart(d.grp, parseInt(slot.dataset.idx,10))); render(); return; }
  if(slot){ moveRackTile(d.tid, parseInt(slot.dataset.idx,10)); render(); return; }
  if(d.grp){ render(); return; }   // per ortaya atılamaz; yerine döner
  const meldEl=target && target.closest ? target.closest('.meld[data-seat]') : null;
  if(meldEl && canDiscardNow()){ await meldClick(parseInt(meldEl.dataset.seat,10), parseInt(meldEl.dataset.gi,10), d.tid); return; }
  const mid=target && target.closest ? target.closest('.mid') : null;
  if(mid && canDiscardNow()){
    const inRuns=target.closest('.mz-runs');
    const tgt=inRuns?nearestWorkTarget(d.tid, e.clientX, e.clientY):null;
    if(tgt){ await meldClick(tgt.seat, tgt.gi, d.tid); return; }
    S.selectedTid=null; await discardTile(d.tid); return;
  }
  render();   // başka yere bırakıldı: taş yerine döner
}
function dragCancel(){
  const d=S.drag; dragListenersOff(); if(!d) return;
  if(d.ghost) d.ghost.remove();
  clearOver(); S.drag=null; render();
}

