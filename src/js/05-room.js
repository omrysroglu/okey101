/* ============================== ROOM ACTIONS ============================== */
async function createRoom(){
  clearBotLoop();
  const name = S.nameInput.trim();
  if(!name){ S.error='İsim gir.'; render(); return; }
  S.busy=true; render();
  const code = genCode();
  const room = {
    code, createdAt:Date.now(), turnSeconds: S.turnSecondsChoice==='none'? null: parseInt(S.turnSecondsChoice,10),
    status:'lobby', maxPlayers:4,
    players:[{seat:0, name, uid:myId()}],
    dealerSeat:0, round:0,
    scores:{0:0,1:0,2:0,3:0},
    log:[],
  };
  const ok = await saveRoom(code, room);
  S.busy=false;
  if(!ok){ S.error='Oda oluşturulamadı, tekrar dene.'; render(); return; }
  S.code=code; S.name=name; S.mySeat=0; S.room=room; S.screen='lobby'; S.error='';
  startPolling();
  render();
}

async function joinRoom(){
  clearBotLoop();
  const code = S.joinCodeInput.trim().toUpperCase();
  const name = S.nameInput.trim();
  if(!code || !name){ S.error='Oda kodu ve isim gir.'; render(); return; }
  S.busy=true; render();
  const room = await loadRoom(code);
  if(!room){ S.busy=false; S.error='Oda bulunamadı.'; render(); return; }
  // already joined this uid before? reattach to same seat
  const existing = room.players.find(p=>p.uid===myId());
  if(existing){
    S.busy=false; S.code=code; S.name=existing.name; S.mySeat=existing.seat; S.room=room;
    S.screen = room.status==='lobby' ? 'lobby' : 'game';
    startPolling(); render(); return;
  }
  if(room.players.length>=room.maxPlayers){ S.busy=false; S.error='Oda dolu.'; render(); return; }
  if(room.status!=='lobby'){ S.busy=false; S.error='Bu oyun zaten başlamış.'; render(); return; }
  const takenSeats = new Set(room.players.map(p=>p.seat));
  let seat=0; while(takenSeats.has(seat)) seat++;
  room.players.push({seat, name, uid:myId()});
  room.players.sort((a,b)=>a.seat-b.seat);
  const ok = await saveRoom(code, room);
  S.busy=false;
  if(!ok){ S.error='Katılınamadı, tekrar dene.'; render(); return; }
  S.code=code; S.name=name; S.mySeat=seat; S.room=room; S.screen='lobby'; S.error='';
  startPolling(); render();
}

async function startGame(){
  if(S.room.players.length < S.room.maxPlayers){ return; }
  const dealt = dealRoundRaw(S.room.players.length, 0);
  const room = {...S.room};
  room.status='playing';
  room.round=1;
  room.dealerSeat=0;
  room.hands=dealt.hands;
  room.deck=dealt.deck;
  room.indicatorTileId=dealt.indicatorTileId;
  room.okeyColor=dealt.okeyColor;
  room.okeyNumber=dealt.okeyNumber;
  room.allTilesById=dealt.allTilesById;
  room.discards={0:[],1:[],2:[],3:[]};
  room.turnSeat=0;
  room.turnPhase='discard';   // başlayan 22 taşla başlar, önce taş atar
  room.turnDeadline = room.turnSeconds ? Date.now()+room.turnSeconds*1000 : null;
  room.takeEvents=[]; room.table={0:[],1:[],2:[],3:[]}; room.opened={0:null,1:null,2:null,3:null};
  room.log=[`El ${room.round} başladı. Gösterge: ${describeTile(tileByIdRaw(room, room.indicatorTileId))}`];
  room.roundResult=null;
  await saveRoom(S.code, room);
  S.room=room; S.screen='game'; render();
}

function tileByIdRaw(room, tid){ return room.allTilesById[tid]; }
function describeTile(t){
  if(!t) return '?';
  if(t.fake) return 'Sahte Okey';
  const trColor={red:'Kırmızı', black:'Siyah', blue:'Mavi', yellow:'Sarı'}[t.color];
  return `${trColor} ${t.number}`;
}

async function refreshRoom(){
  if(!S.code) return;
  const fresh = await loadRoom(S.code);
  if(!fresh) return;
  S.room = fresh;
  // handle auto turn timeout (only the current-turn player's own client drives it, to avoid double actions)
  if(fresh.status==='playing' && fresh.turnDeadline && Date.now()>fresh.turnDeadline && fresh.turnSeat===S.mySeat){
    await handleMyTimeout();
    return;
  }
  if(S.screen==='lobby' && fresh.status==='playing'){ S.screen='game'; }
  render();
}
function startPolling(){
  if(pollHandle) clearInterval(pollHandle);
  pollHandle = setInterval(refreshRoom, 1500);
}

