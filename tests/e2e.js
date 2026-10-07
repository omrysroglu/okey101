// Tarayıcı testi (Playwright gerekir): node tests/e2e.js
// Önce: npm run build
const path=require('path');
const {chromium}=require('playwright');
const url='file://'+path.join(__dirname,'../dist/okey101.html');
async function fresh(b){
  const pg=await b.newPage({viewport:{width:1280,height:900}});
  pg.errs=[]; pg.on('pageerror',e=>pg.errs.push(e.message));
  await pg.goto(url);
  await pg.evaluate(()=>{ S.nameInput='Test'; startSoloTest(); clearBotLoop(); });
  return pg;
}
(async()=>{
  const b=await chromium.launch();
  let bad=0;
  let pg=await fresh(b);
  const r=await pg.evaluate(async()=>{
    const out={};
    const room=deepClone(S.room);
    room.okeyColor='red'; room.okeyNumber=6;
    room.hands[0]=['black-1-0','blue-3-0','yellow-9-0','red-12-0','black-13-0','blue-2-1','yellow-4-0','black-5-1','red-1-1','blue-8-0','yellow-2-1','black-9-0','red-3-1','blue-11-0','yellow-12-0','black-2-0','red-9-1','blue-13-1','yellow-7-1','black-8-1','red-2-0'];
    room.turnSeat=0; room.turnPhase='draw';
    room.discards[3]=['blue-5-1'];
    S.room=room; render();
    const before=S.room.hands[0].length;
    await drawFromDiscard();
    out.takeBlocked = S.room.hands[0].length===before && S.notice.length>0;
    out.notice=S.notice;
    // işleme
    const r2=deepClone(S.room);
    r2.turnPhase='discard';
    r2.opened[0]={mode:'groups',meldValue:105,pairCount:null};
    r2.table[0]=[['blue-5-0','blue-6-0','blue-7-0']];
    r2.opened[2]={mode:'groups',meldValue:105,pairCount:null};
    r2.table[2]=[['black-9-1','red-6-0','yellow-9-1']]; // okey red6 represents blue9? set of 9s
    r2.hands[0].push('blue-9-0','blue-8-1');
    S.room=r2; S.selectedTid='blue-8-1'; render();
    const h0=S.room.hands[0].length;
    await meldClick(0,0);
    out.extended = S.room.hands[0].length===h0-1 && S.room.table[0][0].length===4;
    S.selectedTid='blue-9-0';
    await meldClick(2,0);   // swap okey from bot3's set with blue 9
    out.swapped = S.room.hands[0].includes('red-6-0') && S.room.table[2][0].includes('blue-9-0');
    out.ownerPenalty = (S.room.penalties||[]).some(p=>p.seat===2&&p.amount===101);
    // discard a tile that could extend -> penalty
    S.room.hands[0].push('blue-4-1'); S.selectedTid=null;
    await discardTile('blue-4-1');
    out.extPenalty=(S.room.penalties||[]).some(p=>p.seat===0&&p.label.includes('İşlenebilir'));
    // deck end
    const r3=deepClone(S.room); r3.deck=[]; r3.turnSeat=0; r3.turnPhase='discard'; S.room=r3;
    await discardTile(S.room.hands[0][0]);
    out.deckEnd = S.room.status==='roundEnd' && S.room.roundResult.deckEnd;
    render();
    out.html = document.body.innerText.slice(0,200);
    return out;
  });
  
  console.log('senaryo 1 (alma kısıtı, işleme, okey değişimi, ceza, deste bitişi):',JSON.stringify(r)); if(Object.values(r).some(v=>v===false)) bad++;
  bad+=pg.errs.length;
  pg=await fresh(b);
  const r2=await pg.evaluate(async()=>{
    const room=deepClone(S.room); room.okeyColor='blue'; room.okeyNumber=10;
    room.hands[0]=['red-7-0','black-7-0','blue-7-0','black-5-0'];
    room.opened[0]={mode:'groups',meldValue:126,pairCount:null};
    room.table[0]=[['red-5-0','red-6-0','red-7-1']];
    room.turnSeat=0; room.turnPhase='discard'; S.room=room; S.rackSlots=null; render();
    const out={};
    out.btn=[...document.querySelectorAll('.me-bar button')].map(b=>b.textContent+(b.disabled?'(off)':''));
    openOpenModal();
    out.kind=S.modalKind; out.pre=S.groups.length; out.un=S.ungrouped.length;
    await attemptOpen();
    out.err=S.closeError; out.table=S.room.table[0].length; out.hand=S.room.hands[0];
    await discardTile('black-5-0');
    out.status=S.room.status; out.winner=S.room.roundResult&&S.room.roundResult.winnerSeat;
    return out;
  });
  
  console.log('senaryo 2 (per indirme + bitiş):',JSON.stringify(r2)); if(r2.status!=='roundEnd'||r2.winner!==0) bad++;
  bad+=pg.errs.length;
  await b.close();
  process.exit(bad?1:0);
})();
