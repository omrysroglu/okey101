/* ============================== GAMEPLAY ACTIONS ============================== */
async function drawFromDeck(){
  if(!isMyTurn() || S.room.turnPhase!=='draw') return;
  const room = deepClone(S.room);
  if(room.deck.length===0){ scoreRound(room, null, null); await persist(room); return; }
  const tid = room.deck.pop();
  room.hands[S.mySeat].push(tid);
  room.turnPhase='discard';
  room.turnDeadline = room.turnSeconds ? Date.now()+room.turnSeconds*1000 : null;
  pushLog(room, `${myName()} yerden taş çekti.`);
  await persist(room);
}

function canDrawFromDiscard(){
  return isMyTurn() && S.room.turnPhase==='draw' && discardSourceSeat()!==null && S.room.noRetakeSeat!==S.mySeat;
}
function discardSourceSeat(){
  const src = prevSeat(S.room.turnSeat);
  if(S.room.discards[src] && S.room.discards[src].length>0) return src;
  return null;
}
async function drawFromDiscard(){
  const src = discardSourceSeat();
  if(!canDrawFromDiscard()) return;
  const iOpened = !!(S.room.opened && S.room.opened[S.mySeat]);
  if(!iOpened){
    const top = S.room.discards[src][S.room.discards[src].length-1];
    if(!canOpenWith(S.room.hands[S.mySeat].concat([top]), S.room)){
      notify('Bu taşla elini hemen açamıyorsun; yalnızca açabiliyorsan atıktan taş alabilirsin. Yerden çek.');
      return;
    }
  }
  const room = deepClone(S.room);
  const tid = room.discards[src].pop();
  if(!iOpened) room.mustOpenSeat = S.mySeat;
  room.hands[S.mySeat].push(tid);
  room.turnPhase='discard';
  room.turnDeadline = room.turnSeconds ? Date.now()+room.turnSeconds*1000 : null;
  room.takeEvents = room.takeEvents || [];
  room.takeEvents.push({takerSeat:S.mySeat, fromSeat:src, tileId:tid, atTurn:room.turnSeat});
  const t = room.allTilesById[tid];
  pushLog(room, `${myName()}, ${seatName(room, src)} oyuncusunun attığı ${describeTile(t)} taşını aldı.`);
  if(!iOpened) pushAlert('Atıktan taş aldın: elini aç ya da açamıyorsan "Taşı Geri Bırak" ile geri koy.', 'warn');
  await persist(room);
}

async function discardTile(tid){
  if(!isMyTurn() || S.room.turnPhase!=='discard') return;
  if(mustReturnNow()){ notify('Atıktan aldığın taşla elini açmalısın ya da "Taşı Geri Bırak" ile geri koymalısın.'); render(); return; }
  const room = deepClone(S.room);
  room.noRetakeSeat=null; room.turnSnap=null;
  const hand = room.hands[S.mySeat];
  const idx = hand.indexOf(tid);
  if(idx===-1) return;
  hand.splice(idx,1);
  room.discards[S.mySeat].push(tid);
  const t = room.allTilesById[tid];
  pushLog(room, `${myName()}, ${describeTile(t)} taşını attı.`);
  if(hand.length===0 && room.opened && room.opened[S.mySeat]){
    const info = room.opened[S.mySeat];
    S.room = room; S.selectedIdx=null;
    await finalizeClose({mode:info.mode, meldValue:info.meldValue||0, pairCount:info.pairCount||null, lastOkey:isOkey(t, room.okeyColor, room.okeyNumber)});
    return;
  }
  // +101 ceza durumları
  const msgs=[];
  if(isOkey(t, room.okeyColor, room.okeyNumber)){ addPenalty(room,S.mySeat,101,'Okeyi yere attı'); msgs.push('Okeyi yere attın: +101 ceza.'); }
  if(canExtendAnywhere(tid, room)){ addPenalty(room,S.mySeat,101,'İşlenebilir taş attı'); msgs.push('Masadaki bir pere işlenebilecek taşı attın: +101 ceza.'); }
  if(room.mustOpenSeat===S.mySeat){
    if(!(room.opened && room.opened[S.mySeat])){ addPenalty(room,S.mySeat,101,'Atıktan aldığı taşla elini açmadı'); msgs.push('Atıktan aldığın taşla elini açmadın: +101 ceza.'); }
    room.mustOpenSeat=null;
  }
  msgs.forEach(m=>pushLog(room, `${myName()}: ${m}`));
  if(room.deck.length===0){
    S.selectedIdx=null;
    scoreRound(room, null, null);
    await persist(room);
    return;
  }
  room.turnSeat = nextSeat(S.mySeat);
  room.turnPhase='draw';
  room.turnDeadline = room.turnSeconds ? Date.now()+room.turnSeconds*1000 : null;
  S.selectedIdx=null;
  await persist(room);
}

async function autoDrawOnTimeout(){
  // draw from deck automatically then immediately discard the same tile drawn (simplest safe auto-move) and pass turn
  const room = deepClone(S.room);
  if(room.turnPhase!=='draw' || room.turnSeat!==S.mySeat) return;
  if(room.deck.length===0){ render(); return; }
  const tid = room.deck.pop();
  pushLog(room, `${myName()} süresi doldu, otomatik taş çekildi ve atıldı.`);
  room.discards[S.mySeat].push(tid);
  room.turnSeat = nextSeat(S.mySeat);
  room.turnPhase='draw';
  room.turnDeadline = room.turnSeconds ? Date.now()+room.turnSeconds*1000 : null;
  if(room.deck.length===0) scoreRound(room, null, null);
  await persist(room);
}

// Ceza uyarıları: masadaki herhangi bir oyuncuya yeni ceza yazıldığında herkese anında gösterilir
function pushAlert(msg, kind){
  S.alerts = (S.alerts||[]).filter(a=>a.until>Date.now());
  S.alerts.push({msg, kind:kind||'pen', until:Date.now()+7000});
  if(S.alerts.length>3) S.alerts=S.alerts.slice(-3);
}
function checkPenaltyAlerts(){
  const r=S.room; if(!r) return;
  const key=(r.code||'solo')+'|'+(r.round||1);
  const pens=r.penalties||[];
  if(S.penKey!==key){ S.penSeen = S.penKey===null ? pens.length : 0; S.penKey=key; }   // ilk açılışta eski cezaları gösterme
  if(pens.length<S.penSeen) S.penSeen=pens.length;
  for(let i=S.penSeen;i<pens.length;i++){
    const p=pens[i];
    const who = p.seat===S.mySeat ? 'Sen' : seatName(r,p.seat);
    pushAlert(`${who}: ${p.label} · +${p.amount} ceza`, p.seat===S.mySeat ? 'pen-me' : 'pen');
  }
  S.penSeen=pens.length;
}
function alertsHTML(){
  const now=Date.now();
  S.alerts=(S.alerts||[]).filter(a=>a.until>now);
  if(!S.alerts.length) return '';
  return `<div class="pen-toasts" role="alert" aria-live="assertive">${S.alerts.map(a=>`<div class="pen-toast ${a.kind}"><span class="pt-ico">!</span><span>${escapeHtml(a.msg)}</span></div>`).join('')}</div>`;
}
// ---- Atıktan alınan taşı geri bırakma ----
function mustReturnNow(){
  const r=S.room; return !!(r && isMyTurn() && r.turnPhase==='discard' && r.mustOpenSeat===S.mySeat && !(r.opened && r.opened[S.mySeat]));
}
function returnTakenToRoom(room, seat){
  const evs=room.takeEvents||[]; let k=-1;
  for(let i=evs.length-1;i>=0;i--) if(evs[i].takerSeat===seat){ k=i; break; }
  if(k<0) return null;
  const ev=evs[k], h=room.hands[seat], i=h.indexOf(ev.tileId);
  if(i<0) return null;
  evs.splice(k,1);
  h.splice(i,1);
  room.discards[ev.fromSeat].push(ev.tileId);
  room.mustOpenSeat=null; room.turnPhase='draw'; room.noRetakeSeat=seat;   // aynı taşı tekrar alamaz, yerden çeker
  return ev;
}
async function returnTakenTile(){
  if(!mustReturnNow()) return;
  const room=deepClone(S.room);
  const ev=returnTakenToRoom(room, S.mySeat); if(!ev) return;
  pushLog(room, `${myName()}, aldığı ${describeTile(room.allTilesById[ev.tileId])} taşını geri bıraktı.`);
  S.selectedTid=null;
  await persist(room);
}

// ---- Süre dolması: aldığı taşı geri bırak, gerekirse yerden çek, en küçük taşı at ----
function pickAutoDiscard(room, seat){
  const h=room.hands[seat], oc=room.okeyColor, on=room.okeyNumber, T=id=>room.allTilesById[id];
  const noOkey=h.filter(id=>!isOkey(T(id),oc,on));
  const safe=noOkey.filter(id=>!canExtendAnywhere(id,room));
  const pool=safe.length?safe:(noOkey.length?noOkey:h);
  return pool.reduce((b,id)=>tileValue(T(id),oc,on)<tileValue(T(b),oc,on)?id:b, pool[0]);
}
async function handleMyTimeout(){
  const r=S.room;
  if(S.timeoutBusy || !r || r.status!=='playing' || r.turnSeat!==S.mySeat || !r.turnDeadline || Date.now()<=r.turnDeadline) return;
  S.timeoutBusy=true;
  try{
    const room=deepClone(r), me=S.mySeat, notes=[];
    if(room.turnPhase==='discard' && room.mustOpenSeat===me && !(room.opened && room.opened[me])){
      const ev=returnTakenToRoom(room, me);
      if(ev) notes.push(`aldığın ${describeTile(room.allTilesById[ev.tileId])} geri bırakıldı`);
    }
    if(room.turnPhase==='draw'){
      if(room.deck.length===0){ scoreRound(room,null,null); await persist(room); return; }
      room.hands[me].push(room.deck.pop()); room.turnPhase='discard'; notes.push('yerden taş çekildi');
    }
    if(room.hands[me].length<=1 && room.opened && room.opened[me]){ S.timeoutBusy=false; S.room=room; await discardTile(room.hands[me][0]); return; }
    const tid=pickAutoDiscard(room, me);
    room.hands[me].splice(room.hands[me].indexOf(tid),1);
    room.discards[me].push(tid);
    notes.push(`en küçük taş (${describeTile(room.allTilesById[tid])}) atıldı`);
    pushLog(room, `${myName()}: süre doldu, ${notes.join(', ')}.`);
    pushAlert('Süren doldu: '+notes.join(', ')+'.', 'warn');
    room.noRetakeSeat=null; room.turnSnap=null; if(room.mustOpenSeat===me) room.mustOpenSeat=null;
    S.closeModalOpen=false; S.selectedTid=null;
    if(room.deck.length===0){ scoreRound(room,null,null); await persist(room); return; }
    room.turnSeat=nextSeat(me); room.turnPhase='draw';
    room.turnDeadline = room.turnSeconds ? Date.now()+room.turnSeconds*1000 : null;
    await persist(room);
  } finally { S.timeoutBusy=false; }
}

function notify(msg){ S.notice=msg; S.noticeUntil=Date.now()+6000; render(); }
function addPenalty(room, seat, amount, label){ room.penalties=room.penalties||[]; room.penalties.push({seat, amount, label}); }
function pushLog(room, msg){
  room.log = room.log || [];
  room.log.push(msg);
  if(room.log.length>60) room.log = room.log.slice(-60);
}
function isMyTurn(){ return S.room && S.room.status==='playing' && S.room.turnSeat===S.mySeat; }
function myName(){ const p=S.room.players.find(p=>p.seat===S.mySeat); return p?p.name:'?'; }
function seatName(room, seat){ const p=room.players.find(p=>p.seat===seat); return p?p.name:('Koltuk '+seat); }
function deepClone(o){ return JSON.parse(JSON.stringify(o)); }

