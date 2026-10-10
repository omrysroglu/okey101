/* ============================== CLOSING / SCORING ============================== */
const NOT_OPENED_PENALTY = 200;   // eli açamayan oyuncu, elindeki taşlardan bağımsız +200 yazar
function openOpenModal(){
  if(!isMyTurn() || S.room.turnPhase!=='discard') return;
  const myInfo = S.room.opened && S.room.opened[S.mySeat];
  S.modalKind = myInfo ? 'lay' : 'open';       // açmışsa: yeni per indir
  S.closeModalOpen=true;
  syncRack(S.room.hands[S.mySeat]);
  if(myInfo) S.closeMode=myInfo.mode;
  else {
    const mv=rackMelds(S.room).reduce((a,m)=>a+m.value,0), pc=rackPairs(S.room).length;
    S.closeMode = (pc>=OPEN_MIN_PAIRS && mv<OPEN_MIN) ? 'pairs' : 'groups';
  }
  prefillFromRack();
  render();
}
// ıstakada dizili perler / çiftler pencereye hazır gelir
function prefillFromRack(){
  syncRack(S.room.hands[S.mySeat]);
  const pre = S.closeMode==='pairs' ? rackPairs(S.room) : rackMelds(S.room);
  S.groups = pre.map(m=>m.ids.slice());
  const usedIds = new Set(S.groups.flat());
  S.ungrouped = S.room.hands[S.mySeat].filter(id=>!usedIds.has(id));
  S.pendingSelection=[];
  S.closeError='';
}
function setCloseMode(m){
  S.closeMode=m;
  prefillFromRack();
  render();
}
function openPreview(){
  const room=S.room; let total=0, bad=0;
  for(const g of S.groups){
    const tiles=g.map(id=>room.allTilesById[id]);
    if(S.closeMode==='pairs'){
      if(g.length===2 && validatePairs(tiles, room.okeyColor, room.okeyNumber).valid) total+=1; else bad++;
    } else {
      const r=meldInfo(g, room);
      if(r.valid) total+=r.value; else bad++;
    }
  }
  return {total, bad};
}
async function attemptOpen(){
  const room=S.room;
  const okeyColor=room.okeyColor, okeyNumber=room.okeyNumber;
  if(S.groups.length===0){ S.closeError='Önce masaya indirmek istediğin perleri oluştur.'; render(); return; }
  if(S.ungrouped.length<1){ S.closeError='Atmak için elinde en az 1 taş kalmalı.'; render(); return; }
  const groupsAsTiles = S.groups.map(g=>g.map(id=>room.allTilesById[id]));
  if(S.modalKind==='lay'){
    const myInfo=room.opened[S.mySeat];
    for(const g of groupsAsTiles){
      if(myInfo.mode==='pairs'){
        if(g.length!==2 || !validatePairs(g, okeyColor, okeyNumber).valid){ S.closeError='Geçersiz çift var.'; render(); return; }
      }
    }
    if(myInfo.mode!=='pairs'){ const bad=S.groups.find(g=>!meldInfo(g,room).valid); if(bad){ S.closeError=meldErrorText(bad,room); render(); return; } }
    const r3=deepClone(room);
    ensureTurnSnap(r3);
    const used3=new Set(S.groups.flat());
    r3.hands[S.mySeat]=r3.hands[S.mySeat].filter(id=>!used3.has(id));
    const added=S.groups.map(g=>g.slice());   // sıra oyuncunun dizdiği gibi kalır
    r3.table[S.mySeat]=(r3.table[S.mySeat]||[]).concat(added);
    if(myInfo.mode==='pairs') r3.opened[S.mySeat].pairCount=(r3.opened[S.mySeat].pairCount||0)+added.length;
    pushLog(r3, `${myName()} masaya ${added.length} yeni per indirdi.`);
    S.closeModalOpen=false; S.selectedIdx=null; S.selectedTid=null;
    await persist(r3);
    return;
  }
  let info;
  if(S.closeMode==='pairs'){
    for(const g of groupsAsTiles){
      if(g.length!==2 || !validatePairs(g, okeyColor, okeyNumber).valid){ S.closeError='Geçersiz çift var (iki özdeş taş ya da okey ile tamamlanan çift olmalı).'; render(); return; }
    }
    if(S.groups.length<OPEN_MIN_PAIRS){ S.closeError=`Çift ile açmak için en az ${OPEN_MIN_PAIRS} çift gerekli (şu an ${S.groups.length}).`; render(); return; }
    info={mode:'pairs', pairCount:S.groups.length, meldValue:0, containsOkey:groupsAsTiles.some(g=>g.some(t=>isOkey(t,okeyColor,okeyNumber)))};
  } else {
    const res=validateClose(groupsAsTiles, okeyColor, okeyNumber);
    if(!res.valid){ const bad=S.groups.find(g=>!meldInfo(g,room).valid); S.closeError=bad?meldErrorText(bad,room):'Gruplardan biri geçerli bir per değil.'; render(); return; }
    if(res.meldValue<OPEN_MIN){ S.closeError=`Açmak için perlerin toplamı en az ${OPEN_MIN} olmalı (şu an ${res.meldValue}).`; render(); return; }
    info={mode:'groups', meldValue:res.meldValue, pairCount:null, containsOkey:res.containsOkey};
  }
  const r2=deepClone(room);
  ensureTurnSnap(r2);
  const used=new Set(S.groups.flat());
  r2.hands[S.mySeat]=r2.hands[S.mySeat].filter(id=>!used.has(id));
  r2.table = r2.table || {0:[],1:[],2:[],3:[]};
  r2.opened = r2.opened || {0:null,1:null,2:null,3:null};
  r2.table[S.mySeat]=S.groups.map(g=>g.slice());   // sıra oyuncunun dizdiği gibi kalır
  r2.opened[S.mySeat]=info;
  if(r2.mustOpenSeat===S.mySeat) r2.mustOpenSeat=null;
  pushLog(r2, `${myName()} perlerini açtı (${info.mode==='pairs'? info.pairCount+' çift' : info.meldValue+' puan'}).`);
  S.closeModalOpen=false; S.selectedIdx=null;
  await persist(r2);
}

function openCloseModal(){
  S.modalKind='close';
  S.closeModalOpen=true;
  S.closeMode='groups';
  prefillFromRack();
  render();
}
function closeCloseModal(){ S.closeModalOpen=false; render(); }

function toggleSelectUngrouped(tid){
  const i = S.pendingSelection.indexOf(tid);
  if(i===-1) S.pendingSelection.push(tid); else S.pendingSelection.splice(i,1);
  render();
}
function makeGroupFromSelection(){
  if(S.pendingSelection.length<2) { S.closeError='Bir grup için en az birkaç taş seç.'; render(); return; }
  if((S.modalKind==='open'||S.modalKind==='lay') && S.closeMode==='pairs' && S.pendingSelection.length!==2){ S.closeError='Çift için tam olarak 2 taş seç.'; render(); return; }
  const g = S.pendingSelection.slice();
  S.groups.push(g);
  S.ungrouped = S.ungrouped.filter(t=>!g.includes(t));
  S.pendingSelection=[];
  S.closeError='';
  render();
}
function disbandGroup(gi){
  const g = S.groups[gi];
  S.ungrouped = S.ungrouped.concat(g);
  S.groups.splice(gi,1);
  render();
}

async function attemptClose(){
  const room = S.room;
  const okeyColor=room.okeyColor, okeyNumber=room.okeyNumber;
  if(S.closeMode==='pairs'){
    const allTiles = S.room.hands[S.mySeat].map(id=>room.allTilesById[id]);
    const res = validatePairs(allTiles, okeyColor, okeyNumber);
    if(!res.valid){ S.closeError='Bu taşlar çift olarak kapanmıyor.'; render(); return; }
    if(S.ungrouped.length>0 || S.groups.length>0){} // not used in pairs mode
    await finalizeClose({mode:'pairs', pairCount:res.pairCount, meldValue:0});
    return;
  }
  if(S.ungrouped.length>0){ S.closeError='Elindeki tüm taşları gruplara yerleştirmelisin.'; render(); return; }
  const groupsAsTiles = S.groups.map(g=>g.map(id=>room.allTilesById[id]));
  const res = validateClose(groupsAsTiles, okeyColor, okeyNumber);
  if(!res.valid){ const bad=S.groups.find(g=>!meldInfo(g,room).valid); S.closeError=bad?meldErrorText(bad,room):'Gruplardan biri geçerli bir per değil.'; render(); return; }
  if(res.tileCount !== room.hands[S.mySeat].length){ S.closeError='Taş sayısı tutmuyor.'; render(); return; }
  await finalizeClose({mode:'groups', meldValue:res.meldValue});
}

async function finalizeClose(meldInfo){
  const room = deepClone(S.room);
  scoreRound(room, S.mySeat, meldInfo);
  S.closeModalOpen=false;
  await persist(room);
}

// winnerSeat=null -> deste bitişi (kimse bitiremedi)
function scoreRound(room, winnerSeat, meldInfo){
  const okeyColor=room.okeyColor, okeyNumber=room.okeyNumber;
  const n = room.players.length;
  const breakdown = {};
  for(let s=0;s<n;s++) breakdown[s]=[];
  const addDelta = (seat, amount, label, cat)=>{ breakdown[seat].push({label, amount, cat:cat||'diger'}); };
  const hasWinner = winnerSeat!==null && winnerSeat!==undefined;

  if(hasWinner){
    addDelta(winnerSeat, -100, 'Eli bitirme bonusu', 'bonus');
    if(meldInfo.lastOkey) addDelta(winnerSeat, -100, 'Okey atarak bitirme bonusu', 'bonus');
    if(meldInfo.mode==='groups'){
      if(meldInfo.meldValue>60) addDelta(winnerSeat, -200, '60 üstü açılış bonusu (x2)', 'bonus');
      else if(meldInfo.meldValue>50) addDelta(winnerSeat, -100, '50 üstü açılış bonusu', 'bonus');
    }
    if(meldInfo.mode==='pairs'){
      if(meldInfo.pairCount>=9) addDelta(winnerSeat, -200, `${meldInfo.pairCount} çift açılış bonusu (x2)`, 'bonus');
      else if(meldInfo.pairCount>=7) addDelta(winnerSeat, -100, `${meldInfo.pairCount} çift açılış bonusu`, 'bonus');
    }
  }

  // atıktan alma: alan −sayı, atan +sayı (kazanan çift ile bittiyse kazananın kendi alışları x2)
  for(const ev of (room.takeEvents||[])){
    const t = room.allTilesById[ev.tileId];
    const faceVal = t.fake ? okeyNumber : t.number;
    let takerAmt = -faceVal, discAmt = faceVal;
    if(hasWinner && meldInfo.mode==='pairs' && ev.takerSeat===winnerSeat){ takerAmt*=2; discAmt*=2; }
    addDelta(ev.takerSeat, takerAmt, `Atıktan taş alma bonusu (${describeTile(t)})`, 'alma');
    addDelta(ev.fromSeat, discAmt, `Atılan taş alındı cezası (${describeTile(t)})`, 'alma');
  }

  // +101 ceza durumları ve perdesinden okey alınması
  for(const p of (room.penalties||[])) addDelta(p.seat, p.amount, p.label, 'ceza');

  // elde kalan taşlar: açamayan direkt +200, açmış olan elindeki taşların toplamı
  for(let s=0;s<n;s++){
    if(hasWinner && s===winnerSeat) continue;
    if(!(room.opened && room.opened[s])){ addDelta(s, NOT_OPENED_PENALTY, 'Açamadı cezası', 'acamadi'); continue; }
    const sum = room.hands[s].map(id=>room.allTilesById[id]).reduce((acc,t)=>acc+tileValue(t, okeyColor, okeyNumber), 0);
    if(sum>0) addDelta(s, sum, 'Elde kalan taş puanı', 'kalan');
  }

  const deltaTotals = {};
  for(let s=0;s<n;s++){
    const total = breakdown[s].reduce((a,b)=>a+b.amount,0);
    deltaTotals[s]=total;
    room.scores[s] = (room.scores[s]||0) + total;
  }
  room.roundResult = {
    winnerSeat: hasWinner?winnerSeat:null, deckEnd:!hasWinner, breakdown, deltaTotals,
    meldMode: meldInfo?meldInfo.mode:null,
    meldValue:(meldInfo&&meldInfo.meldValue)||0, pairCount:(meldInfo&&meldInfo.pairCount)||null,
  };
  // puan tablosu için el geçmişi
  room.history = room.history || [];
  room.history.push({
    round: room.round||1, winnerSeat: hasWinner?winnerSeat:null, deckEnd: !hasWinner,
    rows: Array.from({length:n},(_,s)=>({
      seat:s, delta:deltaTotals[s], total:room.scores[s], items:breakdown[s],
      tiles:(room.hands[s]||[]).length,
      handValue:(room.hands[s]||[]).map(id=>room.allTilesById[id]).reduce((a,t)=>a+tileValue(t,okeyColor,okeyNumber),0),
      opened: (room.opened && room.opened[s]) ? {mode:room.opened[s].mode, value:openedSummaryValue(room,s)} : null,
      manual:0,
    })),
  });
  room.turnSnap=null;
  room.status='roundEnd';
  room.mustOpenSeat=null;
  pushLog(room, hasWinner ? `${seatName(room,winnerSeat)} eli bitirdi.` : 'Deste bitti, el kimse bitiremeden sona erdi.');
}

// ---- Tur içi anlık görüntü: bu turda açılan/indirilen perler ✕ ile geri alınabilsin ----
function ensureTurnSnap(room){
  const me=S.mySeat;
  if(room.turnSnap && room.turnSnap.seat===me) return;
  room.turnSnap={seat:me, hand:room.hands[me].slice(), table:deepClone(room.table||{0:[],1:[],2:[],3:[]}),
    opened:deepClone(room.opened||{0:null,1:null,2:null,3:null}), penalties:deepClone(room.penalties||[]),
    mustOpenSeat:(room.mustOpenSeat===undefined?null:room.mustOpenSeat)};
}
function laidThisTurn(room, seat, gi){
  const sn=room.turnSnap;
  return !!(sn && sn.seat===seat && seat===S.mySeat && gi >= ((sn.table && sn.table[seat]) || []).length);
}
async function takeBackMeld(gi){
  if(!canDiscardNow()) return;
  const r0=S.room, me=S.mySeat;
  if(!laidThisTurn(r0, me, gi)) return;
  const room=deepClone(r0), sn=room.turnSnap, info=room.opened[me];
  const rest=room.table[me].filter((_,i)=>i!==gi);
  const openedThisTurn=!(sn.opened && sn.opened[me]);
  let full=false;
  if(openedThisTurn){
    full = info.mode==='pairs' ? rest.length<OPEN_MIN_PAIRS : rest.reduce((a,g)=>a+(meldInfo(g,room).value||0),0)<OPEN_MIN;
  }
  if(full || rest.length===0){
    room.hands[me]=sn.hand.slice(); room.table=sn.table; room.opened=sn.opened; room.penalties=sn.penalties;
    room.mustOpenSeat=sn.mustOpenSeat; room.turnSnap=null;
    pushLog(room, `${myName()} bu turdaki açışını geri aldı.`);
    notify(openedThisTurn ? 'Açış geri alındı: kalan perler açmaya yetmiyordu, bu turdaki tüm perler ıstakana döndü.' : 'Bu turda indirdiğin perler ıstakana döndü.');
  } else {
    const g=room.table[me][gi];
    room.table[me]=rest; room.hands[me]=room.hands[me].concat(g);
    if(info.mode==='pairs') info.pairCount=rest.length;
    else if(openedThisTurn) info.meldValue=rest.reduce((a,x)=>a+(meldInfo(x,room).value||0),0);
    pushLog(room, `${myName()} bir peri geri aldı.`);
  }
  S.selectedTid=null;
  await persist(room);
}

// İşleme: seçili/sürüklenen taşı masadaki bir pere işle.
// Kurallar: açmış her oyuncu (seri ya da çift açmış) seri/set perlere uçlardan taş işleyebilir ve perdeki okeyi gerçek taşla değiştirebilir.
// Çiftler büyütülemez; çiftte okey varsa aynı taşı koyup okeyi almak (işleme) mümkündür.
async function meldClick(seat, gi, tidArg){
  if(!canDiscardNow()) return;
  const me=S.mySeat, r0=S.room;
  const mi=r0.opened && r0.opened[me];
  if(!mi){ notify('İşlemek için önce elini açmalısın.'); return; }
  const oi=r0.opened[seat];
  if(!oi){ notify('Bu per işlenemez.'); return; }
  const tid=tidArg||S.selectedTid;
  if(!tid || !r0.hands[me].includes(tid)){ notify('Önce ıstakandan işlenecek taşı seç, sonra pere tıkla ya da taşı pere sürükle.'); return; }
  if(r0.hands[me].length<2){ notify('Atmak için elinde en az 1 taş kalmalı.'); return; }
  const room=deepClone(r0);
  const meld=room.table[seat][gi];
  const hand=room.hands[me];
  const T=id=>describeTile(room.allTilesById[id]);
  let swapId=null;
  if(isPairMeld(room, seat, meld)){
    swapId=findSwapOkeyPair(tid, meld, room);
    if(!swapId) return workPair(tid);   // çifte taş eklenmez; eşiyle birlikte yeni çift olarak işlenir
  } else {
    swapId=findSwapOkey(tid, meld, room);
  }
  ensureTurnSnap(room);
  if(swapId){
    meld[meld.indexOf(swapId)]=tid;
    hand.splice(hand.indexOf(tid),1);
    hand.push(swapId);
    pushLog(room, `${myName()}, ${seatName(room,seat)} oyuncusunun perindeki okeyi ${T(tid)} ile değiştirip aldı.`);
    if(seat!==me){ addPenalty(room, seat, 101, 'Perinden okey alındı'); pushLog(room, `${seatName(room,seat)}: perinden okey alındı, +101 ceza.`); }
  } else {
    const ext=extendMeldIds(tid, meld, room);
    if(!ext){ notify('Bu taş o pere işlenemez: seriye sıralı olarak bir uca, sete eksik renk olarak eklenmeli.'); return; }
    hand.splice(hand.indexOf(tid),1);
    room.table[seat][gi]=ext;
    pushLog(room, `${myName()}, ${seatName(room,seat)} oyuncusunun perine ${T(tid)} taşını işledi.`);
  }
  S.selectedTid=null; S.selectedIdx=null;
  await persist(room);
}

// Çift işleme: taşı elindeki eşiyle (yoksa okeyle) masaya yeni çift olarak indirir.
// Çift açan her zaman, seri açan ise masada açılmış çift varsa yapabilir.
function canWorkPairs(room, me){
  const mi=room.opened && room.opened[me]; if(!mi) return false;
  if(mi.mode==='pairs') return true;
  return Object.keys(room.table||{}).some(s=>(room.table[s]||[]).some(g=>isPairMeld(room, +s, g)));
}
async function workPair(tidArg){
  if(!canDiscardNow()) return;
  const me=S.mySeat, r0=S.room;
  if(!(r0.opened && r0.opened[me])){ notify('İşlemek için önce elini açmalısın.'); return; }
  if(!canWorkPairs(r0, me)){ notify('Masada açılmış çift yok; çift işlenemez.'); return; }
  const tid=tidArg||S.selectedTid;
  if(!tid || !r0.hands[me].includes(tid)){ notify('Önce ıstakandan taş seç, sonra çift alanına tıkla ya da taşı oraya sürükle.'); return; }
  const partner=findPairPartner(tid, r0.hands[me], r0);
  if(!partner){ notify('Bu taşın elinde eşi (ya da okey) yok; çift işlenemez.'); return; }
  if(r0.hands[me].length<3){ notify('Atmak için elinde en az 1 taş kalmalı.'); return; }
  const room=deepClone(r0);
  ensureTurnSnap(room);
  const hand=room.hands[me];
  [tid,partner].forEach(id=>hand.splice(hand.indexOf(id),1));
  room.table[me]=(room.table[me]||[]).concat([[tid,partner]]);
  if(room.opened[me].mode==='pairs') room.opened[me].pairCount=(room.opened[me].pairCount||0)+1;
  pushLog(room, `${myName()} masaya çift işledi: ${describeTile(room.allTilesById[tid])}.`);
  S.selectedTid=null; S.selectedIdx=null;
  await persist(room);
}
function pairZoneClick(ev){
  if(ev.target.closest('.meld') || !S.selectedTid) return;
  workPair(S.selectedTid);
}

async function startNextRound(){
  const room = deepClone(S.room);
  const n = room.players.length;
  const newDealer = nextSeat(room.dealerSeat);
  const dealt = dealRoundRaw(n, newDealer);
  room.status='playing';
  room.round = (room.round||1)+1;
  room.dealerSeat = newDealer;
  room.hands = dealt.hands;
  room.deck = dealt.deck;
  room.indicatorTileId = dealt.indicatorTileId;
  room.okeyColor = dealt.okeyColor;
  room.okeyNumber = dealt.okeyNumber;
  room.allTilesById = dealt.allTilesById;
  room.discards = {0:[],1:[],2:[],3:[]};
  room.turnSeat = newDealer;
  room.turnPhase='discard';   // başlayan 22 taşla başlar, önce taş atar
  room.turnDeadline = room.turnSeconds ? Date.now()+room.turnSeconds*1000 : null;
  room.takeEvents=[]; room.penalties=[]; room.mustOpenSeat=null; room.turnSnap=null; room.table={0:[],1:[],2:[],3:[]}; room.opened={0:null,1:null,2:null,3:null};
  room.roundResult=null;
  pushLog(room, `El ${room.round} başladı. Gösterge: ${describeTile(room.allTilesById[room.indicatorTileId])}`);
  await persist(room);
}

async function endGame(){
  const room = deepClone(S.room);
  room.status='gameEnd';
  await persist(room);
}

async function applyManualAdjustment(){
  const seat = parseInt(S.adjustSeat,10);
  const amt = parseInt(S.adjustAmount,10);
  if(isNaN(seat) || isNaN(amt)) return;
  const room = deepClone(S.room);
  room.scores[seat] = (room.scores[seat]||0) + amt;
  const last=(room.history||[])[room.history?room.history.length-1:0];
  if(last && last.rows[seat]){ last.rows[seat].manual=(last.rows[seat].manual||0)+amt; last.rows[seat].total=room.scores[seat]; }
  pushLog(room, `Manuel düzeltme: ${seatName(room,seat)} ${amt>0?'+':''}${amt} puan (${S.adjustNote||'not yok'})`);
  S.adjustSeat=null; S.adjustAmount=''; S.adjustNote='';
  await persist(room);
}


// Masadaki perlerin anlık değeri (seri/set: toplam sayı, çift: çift sayısı)
function openedSummaryValue(room, seat){
  const info=room.opened && room.opened[seat]; if(!info) return 0;
  const groups=(room.table && room.table[seat]) || [];
  if(info.mode==='pairs') return groups.length;
  return groups.reduce((a,g)=>a+(meldInfo(g,room).value||0),0);
}
