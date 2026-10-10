/* ============================== GAME LOGIC (pure) ============================== */
const COLORS = ['red','black','blue','yellow'];
const OPEN_MIN = 101;        // per/set ile açmak için gereken minimum toplam
const OPEN_MIN_PAIRS = 5;    // çift ile açmak için gereken minimum çift sayısı
const COLOR_HEX = {red:'#b5321f', black:'#1c1c1c', blue:'#1e5aa8', yellow:'#b8790f'};

function createDeck(){
  const tiles=[];
  for(const color of COLORS){
    for(let num=1; num<=13; num++){
      for(let copy=0; copy<2; copy++){
        tiles.push({id:`${color}-${num}-${copy}`, color, number:num, fake:false});
      }
    }
  }
  tiles.push({id:'fake-0', color:null, number:null, fake:true});
  tiles.push({id:'fake-1', color:null, number:null, fake:true});
  return tiles;
}
function shuffle(arr, rng){
  const a=arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor((rng?rng():Math.random())*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function dealRoundRaw(playerCount, dealerSeat){
  let deck = shuffle(createDeck());
  let indicator = deck.pop();
  // extremely rare: indicator is a fake joker -> put back, reshuffle remainder, redraw
  let guard=0;
  while(indicator.fake && guard<50){
    deck.push(indicator);
    deck = shuffle(deck);
    indicator = deck.pop();
    guard++;
  }
  const okeyColor = indicator.color;
  const okeyNumber = indicator.number===13 ? 1 : indicator.number+1;
  const hands={};
  for(let s=0;s<playerCount;s++) hands[s]=[];
  for(let s=0;s<playerCount;s++){
    const count = s===dealerSeat ? 22 : 21;   // 101: herkese 21, başlayana 22
    for(let i=0;i<count;i++) hands[s].push(deck.pop().id);
  }
  const allTilesById={};
  createDeck().forEach(t=>allTilesById[t.id]=t);
  return {hands, deck:deck.map(t=>t.id), indicatorTileId:indicator.id, okeyColor, okeyNumber, allTilesById};
}
// Sahte okey joker DEĞİLDİR: gerçek okeyin temsil ettiği taşın (renk+sayı) değerini taşıyan sıradan taştır.
function normTile(t, okeyColor, okeyNumber){
  return t.fake ? {id:t.id, color:okeyColor, number:okeyNumber, fake:false, _fk:true} : t;
}
function isOkey(tile, okeyColor, okeyNumber){
  if(tile.fake || tile._fk) return false;
  return tile.color===okeyColor && tile.number===okeyNumber;
}
function tileValue(tile, okeyColor, okeyNumber){
  if(tile.fake || tile._fk) return okeyNumber;
  if(isOkey(tile, okeyColor, okeyNumber)) return okeyNumber*2;
  return tile.number;
}
function validateGroup(tiles, okeyColor, okeyNumber){
  tiles = tiles.map(t=>normTile(t, okeyColor, okeyNumber));
  if(tiles.length<3) return {valid:false, reason:'min3'};
  const wilds = tiles.filter(t=>isOkey(t, okeyColor, okeyNumber));
  const real = tiles.filter(t=>!isOkey(t, okeyColor, okeyNumber));

  const setResult = (()=>{
    if(real.length===0){
      if(tiles.length>4) return null;
      return {type:'set', value: tiles.reduce((s,t)=>s+tileValue(t,okeyColor,okeyNumber),0)};
    }
    const num = real[0].number;
    if(!real.every(t=>t.number===num)) return null;
    const colorsUsed = new Set(real.map(t=>t.color));
    if(colorsUsed.size !== real.length) return null;
    if(tiles.length>4) return null;
    const value = real.reduce((s,t)=>s+t.number,0) + wilds.reduce((s)=>s+num,0);
    return {type:'set', value};
  })();
  if(setResult) return {valid:true, ...setResult};

  const runPre = (()=>{
    if(real.length===0) return {allWild:true};
    const color = real[0].color;
    if(!real.every(t=>t.color===color)) return null;
    const nums = real.map(t=>t.number).sort((a,b)=>a-b);
    for(let i=1;i<nums.length;i++) if(nums[i]===nums[i-1]) return null;
    const minNum=nums[0], maxNum=nums[nums.length-1];
    const span = maxNum-minNum+1;
    if(span>tiles.length) return null;
    const gapsToFill = span-real.length;
    if(gapsToFill>wilds.length) return null;
    const extraWilds = wilds.length-gapsToFill;
    const totalLen = span+extraWilds;
    if(totalLen>13) return null;
    return {minNum, maxNum, extraWilds};
  })();
  if(runPre && !runPre.allWild){
    let {minNum, maxNum, extraWilds} = runPre;
    let lo=minNum, hi=maxNum, left=extraWilds;
    while(left>0 && lo>1){lo--; left--;}
    while(left>0 && hi<13){hi++; left--;}
    let value=0;
    for(let k=lo;k<=hi;k++) value+=k;
    return {valid:true, type:'run', value};
  }
  if(runPre && runPre.allWild){
    if(tiles.length>13) return {valid:false, reason:'no_match'};
    return {valid:true, type:'run', value:tiles.length};
  }
  return {valid:false, reason:'no_match'};
}
function validateClose(groupsOfTileObjs, okeyColor, okeyNumber){
  let total=0, tileCount=0, containsOkey=false;
  for(const g of groupsOfTileObjs){
    const res = validateMeldOrdered(g, okeyColor, okeyNumber);
    if(!res.valid) return {valid:false, reason:res.reason, badGroup:g};
    total+=res.value; tileCount+=g.length;
    if(g.some(t=>isOkey(t,okeyColor,okeyNumber))) containsOkey=true;
  }
  return {valid:true, meldValue:total, tileCount, containsOkey};
}
function validatePairs(tiles, okeyColor, okeyNumber){
  tiles = tiles.map(t=>normTile(t, okeyColor, okeyNumber));
  if(tiles.length%2!==0) return {valid:false};
  const wilds = tiles.filter(t=>isOkey(t,okeyColor,okeyNumber));
  const real = tiles.filter(t=>!isOkey(t,okeyColor,okeyNumber));
  const counts={};
  for(const t of real){ const k=t.color+'-'+t.number; counts[k]=(counts[k]||0)+1; }
  let neededWilds=0;
  for(const k of Object.keys(counts)){
    const c=counts[k];
    if(c%2===1) neededWilds+=1;
    if(c>2) return {valid:false};
  }
  if(neededWilds>wilds.length) return {valid:false};
  const leftover = wilds.length-neededWilds;
  if(leftover%2!==0) return {valid:false};
  return {valid:true, pairCount:tiles.length/2, containsOkey:wilds.length>0};
}

/* ---- per düzenleme, işleme, açabilme hesabı ---- */
// Geçerli bir perin taşlarını sıralar (seri: sayıya göre; okey boşluğa/uca yerleşir). reps: her konumun temsil ettiği sayı.
function arrangeMeld(ids, room){
  const oc=room.okeyColor, on=room.okeyNumber;
  const T=ids.map(id=>({id, t:normTile(room.allTilesById[id],oc,on)}));
  const res=validateGroup(T.map(x=>x.t),oc,on);
  if(!res.valid) return null;
  const wild=T.filter(x=>isOkey(x.t,oc,on)), real=T.filter(x=>!isOkey(x.t,oc,on));
  if(res.type==='set'){
    return {type:'set', ids:real.map(x=>x.id).concat(wild.map(x=>x.id)), num: real.length?real[0].t.number:null, colors:real.map(x=>x.t.color), wildIdx:wild.map((_,i)=>real.length+i)};
  }
  if(!real.length) return {type:'run', ids:ids.slice(), color:null, nums:[], wildIdx:[]};
  const color=real[0].t.color;
  real.sort((a,b)=>a.t.number-b.t.number);
  const lo0=real[0].t.number, hi0=real[real.length-1].t.number;
  const seq=[]; const pool=wild.slice(); let ri=0;
  for(let k=lo0;k<=hi0;k++){
    if(ri<real.length && real[ri].t.number===k){ seq.push({num:k,id:real[ri].id,wild:false}); ri++; }
    else seq.push({num:k,id:pool.pop().id,wild:true});
  }
  let hi=hi0, lo=lo0;
  while(pool.length && hi<13){ hi++; seq.push({num:hi,id:pool.pop().id,wild:true}); }
  while(pool.length && lo>1){ lo--; seq.unshift({num:lo,id:pool.pop().id,wild:true}); }
  return {type:'run', ids:seq.map(x=>x.id), color, nums:seq.map(x=>x.num), wildIdx:seq.map((x,i)=>x.wild?i:-1).filter(i=>i>=0)};
}
// bir taş verilen pere (uçlarından) eklenebilir mi?
function canExtendMeld(tileId, meldIds, room){ return !!extendMeldIds(tileId, meldIds, room); }
// masadaki herhangi bir (seri/set ile açılmış) pere işlenebilir mi?
function canExtendAnywhere(tileId, room){
  for(const seat of Object.keys(room.table||{})){
    const info=room.opened && room.opened[seat];
    if(!info || info.mode!=='groups') continue;
    for(const g of room.table[seat]) if(g.length>=3 && canExtendMeld(tileId,g,room)) return true;
  }
  return false;
}
// perdeki okeyin bulunduğu konumdaki gerçek taş elde varsa: okeyin id'sini döndür (sıra korunur)
function findSwapOkey(tileId, meldIds, room){
  const oc=room.okeyColor, on=room.okeyNumber;
  if(isOkey(normTile(room.allTilesById[tileId],oc,on),oc,on)) return null;
  for(let k=0;k<meldIds.length;k++){
    if(!isOkey(normTile(room.allTilesById[meldIds[k]],oc,on),oc,on)) continue;
    const r=meldIds.slice(); r[k]=tileId;
    if(meldInfo(r, room).valid) return meldIds[k];
  }
  return null;
}
// eldeki taşlarla (çekilen taş dahil) hemen açılabilir mi? 101 per toplamı ya da çift; en az 1 taş elde kalmalı.
const _openCache = new Map();
function canOpenWith(ids, room){
  const key=ids.slice().sort().join(',')+'|'+room.okeyColor+room.okeyNumber;
  if(_openCache.has(key)) return _openCache.get(key);
  const r=_canOpenWith(ids, room);
  if(_openCache.size>200) _openCache.clear();
  _openCache.set(key,r); return r;
}
function _canOpenWith(ids, room){
  const oc=room.okeyColor, on=room.okeyNumber;
  const tiles=ids.map(id=>normTile(room.allTilesById[id],oc,on));
  let wilds=0; const cnt=Array(52).fill(0);
  for(const t of tiles){ if(isOkey(t,oc,on)) wilds++; else cnt[COLORS.indexOf(t.color)*13+t.number-1]++; }
  let P=0, singles=0;
  for(const c of cnt){ P+=Math.floor(c/2); if(c%2) singles++; }
  const pairsMax = P + Math.min(wilds,singles) + Math.floor(Math.max(0,wilds-singles)/2);
  if(pairsMax>=OPEN_MIN_PAIRS && tiles.length>2*OPEN_MIN_PAIRS) return true;
  const memo=new Map();
  function rec(w, flag){
    let i=0; while(i<52 && cnt[i]===0) i++;
    if(i===52) return (flag||w>0)?0:-1e9;
    const key=cnt.join('')+'|'+w+'|'+flag;
    if(memo.has(key)) return memo.get(key);
    const c=Math.floor(i/13), n=i%13+1;
    let best=-1e9;
    cnt[i]--; best=Math.max(best, rec(w,1)); cnt[i]++;
    for(let s0=Math.max(1,n-2); s0<=n; s0++){
      for(let L=3; s0+L-1<=13; L++){
        const e=s0+L-1; if(e<n) continue;
        let need=0; const used=[];
        for(let k=s0;k<=e;k++){
          const idx=c*13+k-1;
          if(k===n || (k>n && cnt[idx]>0)) used.push(idx); else need++;
        }
        if(need>w) continue;
        let v=0; for(let k=s0;k<=e;k++) v+=k;
        used.forEach(x=>cnt[x]--);
        best=Math.max(best, v+rec(w-need,flag));
        used.forEach(x=>cnt[x]++);
      }
    }
    const avail=[]; for(let cc=c+1;cc<4;cc++) if(cnt[cc*13+n-1]>0) avail.push(cc*13+n-1);
    for(let mask=0; mask<(1<<avail.length); mask++){
      const sel=avail.filter((_,b)=>mask&(1<<b));
      const base=1+sel.length;
      for(let j=0;j<=w && base+j<=4;j++){
        if(base+j<3) continue;
        sel.forEach(x=>cnt[x]--); cnt[i]--;
        best=Math.max(best, n*(base+j)+rec(w-j,flag));
        cnt[i]++; sel.forEach(x=>cnt[x]++);
      }
    }
    memo.set(key,best); return best;
  }
  return rec(wilds,0)>=OPEN_MIN;
}


// ---- Eli en yüksek puanlı perlere ayırma (Seri Diz) ----
// Dönen: {groups:[[id..]..], leftover:[id..], value}. Per toplamını en büyükleyen kombinasyon.
function bestMeldPlan(ids, room){
  const oc=room.okeyColor, on=room.okeyNumber;
  const pools=Array.from({length:52},()=>[]), wildIds=[];
  for(const id of ids){
    const t=normTile(room.allTilesById[id],oc,on);
    if(isOkey(t,oc,on)) wildIds.push(id); else pools[COLORS.indexOf(t.color)*13+t.number-1].push(id);
  }
  const cnt=pools.map(p=>p.length);
  const memo=new Map();
  function rec(w){
    let i=0; while(i<52 && cnt[i]===0) i++;
    if(i===52) return {v:0, ch:null};
    const key=cnt.join('')+'|'+w;
    if(memo.has(key)) return memo.get(key);
    const c=Math.floor(i/13), n=i%13+1;
    cnt[i]--; let best={v:rec(w).v, ch:{t:'skip', i}}; cnt[i]++;
    for(let s0=Math.max(1,n-2); s0<=n; s0++){
      for(let L=3; s0+L-1<=13; L++){
        const e=s0+L-1; if(e<n) continue;
        let need=0; const used=[];
        for(let k=s0;k<=e;k++){ const idx=c*13+k-1; if(k===n || (k>n && cnt[idx]>0)) used.push(idx); else need++; }
        if(need>w) continue;
        let v=0; for(let k=s0;k<=e;k++) v+=k;
        used.forEach(x=>cnt[x]--);
        const r=v+rec(w-need).v;
        used.forEach(x=>cnt[x]++);
        if(r>best.v) best={v:r, ch:{t:'run', c, s0, e, used:used.slice(), need}};
      }
    }
    const avail=[]; for(let cc=c+1;cc<4;cc++) if(cnt[cc*13+n-1]>0) avail.push(cc*13+n-1);
    for(let mask=0; mask<(1<<avail.length); mask++){
      const sel=avail.filter((_,b)=>mask&(1<<b)), base=1+sel.length;
      for(let j=0;j<=w && base+j<=4;j++){
        if(base+j<3) continue;
        sel.forEach(x=>cnt[x]--); cnt[i]--;
        const r=n*(base+j)+rec(w-j).v;
        cnt[i]++; sel.forEach(x=>cnt[x]++);
        if(r>best.v) best={v:r, ch:{t:'set', idxs:[i].concat(sel), j}};
      }
    }
    memo.set(key,best); return best;
  }
  const total=rec(wildIds.length).v;
  const groups=[], leftover=[];
  let guard=0;
  while(guard++<200){
    const b=rec(wildIds.length); if(!b.ch) break;
    const ch=b.ch;
    if(ch.t==='skip'){ cnt[ch.i]--; leftover.push(pools[ch.i].pop()); }
    else if(ch.t==='run'){
      const g=[];
      for(let k=ch.s0;k<=ch.e;k++){ const idx=ch.c*13+k-1; if(ch.used.includes(idx)){ cnt[idx]--; g.push(pools[idx].pop()); } else g.push(wildIds.pop()); }
      groups.push(g);
    } else {
      const g=ch.idxs.map(idx=>{ cnt[idx]--; return pools[idx].pop(); });
      for(let k=0;k<ch.j;k++) g.push(wildIds.pop());
      groups.push(g);
    }
  }
  return {groups, leftover:leftover.concat(wildIds), value:total};
}
// ---- Eli çiftlere ayırma (Çift Diz) ----
function bestPairPlan(ids, room){
  const oc=room.okeyColor, on=room.okeyNumber, T=id=>normTile(room.allTilesById[id],oc,on);
  const pools={}, wilds=[];
  for(const id of ids){ const t=T(id); if(isOkey(t,oc,on)) wilds.push(id); else (pools[t.color+'-'+t.number]=pools[t.color+'-'+t.number]||[]).push(id); }
  const pairs=[]; let singles=[];
  Object.keys(pools).forEach(k=>{ const p=pools[k]; while(p.length>=2) pairs.push([p.pop(),p.pop()]); if(p.length) singles.push(p.pop()); });
  singles.sort((a,b)=>T(b).number-T(a).number);            // okeyler en yüksek teklerle eşlenir
  while(wilds.length && singles.length) pairs.push([singles.shift(), wilds.pop()]);
  while(wilds.length>=2) pairs.push([wilds.pop(), wilds.pop()]);
  const sk=id=>{ const t=T(id); return isOkey(t,oc,on)?999:COLORS.indexOf(t.color)*13+t.number; };
  pairs.sort((a,b)=>sk(a[0])-sk(b[0]));
  return {pairs, leftover:singles.concat(wilds)};
}

// ---- Sıralı per doğrulama (masaya açma, ıstaka tanıma, işleme) ----
// Taşların VERİLEN SIRASI önemlidir: seri küçükten büyüğe dizilmeli (9-10-11 geçerli, 9-11-10 geçersiz).
// Okey bulunduğu konumdaki taşı temsil eder. 1 yalnızca en küçük taştır (12-13-1 geçersiz). Set: aynı sayı, farklı renk, en çok 4.
function validateMeldOrdered(tiles, okeyColor, okeyNumber){
  tiles = tiles.map(t=>normTile(t, okeyColor, okeyNumber));
  const n = tiles.length;
  if(n<3) return {valid:false, reason:'min3'};
  const real = tiles.map((t,k)=>({t,k})).filter(x=>!isOkey(x.t, okeyColor, okeyNumber));
  if(real.length===0) return {valid:false, reason:'no_real'};
  if(n<=4){
    const num = real[0].t.number;
    if(real.every(x=>x.t.number===num) && new Set(real.map(x=>x.t.color)).size===real.length)
      return {valid:true, type:'set', value:num*n, num};
  }
  const color = real[0].t.color, s = real[0].t.number - real[0].k;
  const sameColor = real.every(x=>x.t.color===color);
  if(!sameColor) return {valid:false, reason:'no_match'};
  if(!real.every(x=>x.t.number - x.k === s)) return {valid:false, reason:'order'};
  if(s<1 || s+n-1>13) return {valid:false, reason:'range'};
  let value=0; for(let k=0;k<n;k++) value += s+k;
  return {valid:true, type:'run', value, start:s, color};
}
function meldInfo(ids, room){ return validateMeldOrdered(ids.map(id=>room.allTilesById[id]), room.okeyColor, room.okeyNumber); }
// Neden geçersiz? (kullanıcıya gösterilecek kısa açıklama)
function meldErrorText(ids, room){
  const r = meldInfo(ids, room);
  if(r.valid) return '';
  if(ids.length<3) return 'Per en az 3 taş olmalı.';
  if(validateGroup(ids.map(id=>room.allTilesById[id]), room.okeyColor, room.okeyNumber).valid) return 'Seri küçükten büyüğe sıralı olmalı (ör. 9-10-11).';
  if(r.reason==='range') return 'Seri 1 ile 13 arasında kalmalı (12-13-1 olmaz).';
  return 'Geçerli bir seri ya da set değil.';
}
// Taşı perin uygun ucuna ekler; olmuyorsa null. (Sıra korunur, taş sınırı yok: seri 13'e kadar, set 4 renk)
function extendMeldIds(tileId, meldIds, room){
  const a = meldIds.concat([tileId]); if(meldInfo(a, room).valid) return a;
  const b = [tileId].concat(meldIds); if(meldInfo(b, room).valid) return b;
  return null;
}
// Çiftte okey varsa ve taş okeyin tamamladığı taşla aynıysa okeyin id'si
function findSwapOkeyPair(tileId, pairIds, room){
  const oc=room.okeyColor, on=room.okeyNumber, T=id=>normTile(room.allTilesById[id],oc,on);
  if(isOkey(T(tileId),oc,on) || pairIds.length!==2) return null;
  for(let k=0;k<2;k++){
    const w=pairIds[k], other=pairIds[1-k];
    if(!isOkey(T(w),oc,on) || isOkey(T(other),oc,on)) continue;
    const a=T(tileId), b=T(other);
    if(a.color===b.color && a.number===b.number) return w;
  }
  return null;
}

// ---- Çift işleme (seri açan da masadaki çiftlerin yanına yeni çift ekleyebilir) ----
// Masadaki bir grup çift mi? (çift ile açanın tüm grupları ya da 2 taşlı gruplar)
function isPairMeld(room, seat, g){ const i=room.opened && room.opened[seat]; return !!((i && i.mode==='pairs') || (g && g.length===2)); }
// Elde taşın çift eşi: önce aynı taş, yoksa okey. Bulunamazsa null.
function findPairPartner(tileId, handIds, room){
  const oc=room.okeyColor, on=room.okeyNumber, T=id=>normTile(room.allTilesById[id],oc,on);
  const t=T(tileId); if(isOkey(t,oc,on)) return null;
  const same=handIds.find(id=>id!==tileId && !isOkey(T(id),oc,on) && T(id).color===t.color && T(id).number===t.number);
  if(same) return same;
  return handIds.find(id=>id!==tileId && isOkey(T(id),oc,on)) || null;
}
