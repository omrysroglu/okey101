/* ============================== APP STATE ============================== */
let S = {
  screen:'landing', // landing | lobby | game
  code:null,
  name:'',
  mySeat:null,
  room:null,
  error:'',
  joinCodeInput:'',
  nameInput:'',
  turnSecondsChoice:'30',
  selectedIdx:null,
  selectedTid:null,   // ıstakada seçili taş (id)
  rackSlots:null,     // 30 slotluk ıstaka düzeni (yalnızca bu cihazda)
  drag:null,
  lastClick:null,
  closeModalOpen:false,
  closeMode:'groups', // 'groups' | 'pairs'
  modalKind:'close',  // 'close' | 'open'
  groups:[], // array of arrays of tileId
  ungrouped:[], // tileIds not yet grouped
  pendingSelection:[],
  closeError:'',
  roundSummary:null, // set right after a close, until "next round"
  adjustSeat:null,
  adjustAmount:'',
  adjustNote:'',
  busy:false,
  notice:'', noticeUntil:0,
  alerts:[], penKey:null, penSeen:0,
  scoreboardOpen:false, sbRound:null,
};

let pollHandle=null;
let botHandle=null;

function tileById(tid){
  return S.room && S.room.allTilesById ? S.room.allTilesById[tid] : null;
}
function seatOffset(seat){
  // 0=bottom(me),1=right,2=top,3=left
  const n = S.room.players.length;
  return ((seat - S.mySeat) % n + n) % n;
}
function nextSeat(seat){ return (seat+1) % S.room.players.length; }
function prevSeat(seat){ const n=S.room.players.length; return (seat-1+n)%n; }

