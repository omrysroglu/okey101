/* ============================== SOLO TEST MODE (no friends needed) ============================== */
function clearBotLoop(){ if(botHandle){ clearInterval(botHandle); botHandle=null; } }

function startSoloTest(){
  clearBotLoop();
  if(pollHandle){ clearInterval(pollHandle); pollHandle=null; }
  const name = (S.nameInput||'').trim() || 'Sen';
  const turnSeconds = S.turnSecondsChoice==='none' ? null : parseInt(S.turnSecondsChoice,10);
  const dealt = dealRoundRaw(4, 0);
  const room = {
    code:'TEST', createdAt:Date.now(), turnSeconds, status:'playing', maxPlayers:4,
    players:[
      {seat:0, name, uid:myId()},
      {seat:1, name:'Bot Ayşe', uid:'bot1'},
      {seat:2, name:'Bot Mehmet', uid:'bot2'},
      {seat:3, name:'Bot Deniz', uid:'bot3'},
    ],
    dealerSeat:0, round:1,
    scores:{0:0,1:0,2:0,3:0},
    hands:dealt.hands, deck:dealt.deck, indicatorTileId:dealt.indicatorTileId,
    okeyColor:dealt.okeyColor, okeyNumber:dealt.okeyNumber, allTilesById:dealt.allTilesById,
    discards:{0:[],1:[],2:[],3:[]},
    turnSeat:0, turnPhase:'discard',
    turnDeadline: turnSeconds ? Date.now()+turnSeconds*1000 : null,
    takeEvents:[], roundResult:null,
    table:{0:[],1:[],2:[],3:[]}, opened:{0:null,1:null,2:null,3:null},
    log:['Test masası kuruldu — botlara karşı masayı inceleyebilirsin.'],
  };
  S.code=null; S.mySeat=0; S.name=name; S.room=room; S.screen='game'; S.error='';
  render();
  botHandle = setInterval(botTick, 1400);
}

function leaveSoloTest(){
  clearBotLoop();
  S.code=null; S.room=null; S.screen='landing'; S.error='';
  render();
}

function botTick(){
  if(!S.room || S.code!==null || S.screen!=='game') return; // safety: only runs in solo mode
  if(S.room.status!=='playing') return;
  const seat = S.room.turnSeat;
  if(seat===S.mySeat) return; // wait for the human
  const room = deepClone(S.room);
  if(room.turnPhase==='draw'){
    if(room.deck.length===0){
      scoreRound(room, null, null);
      S.room = room; render(); return;
    } else {
      const fromDiscardSeat = prevSeat(seat);
      const canTakeDiscard = false; // botlar açamadığı için atıktan taş alamaz (kural)
      let tid;
      if(canTakeDiscard){
        tid = room.discards[fromDiscardSeat].pop();
        room.takeEvents = room.takeEvents||[];
        room.takeEvents.push({takerSeat:seat, fromSeat:fromDiscardSeat, tileId:tid, atTurn:seat});
      } else {
        tid = room.deck.pop();
      }
      room.hands[seat].push(tid);
      room.turnPhase='discard';
    }
  } else {
    const hand = room.hands[seat];
    const idx = Math.floor(Math.random()*hand.length);
    const tid = hand.splice(idx,1)[0];
    room.discards[seat].push(tid);
    room.turnSeat = nextSeat(seat);
    room.turnPhase='draw';
    if(room.deck.length===0){ scoreRound(room, null, null); S.room = room; render(); return; }
  }
  room.turnDeadline = room.turnSeconds ? Date.now()+room.turnSeconds*1000 : null;
  S.room = room; render();
}

