// Saf oyun mantığı testleri: node tests/rules.test.js
const fs=require('fs'), path=require('path');
const dir=path.join(__dirname,'../src/js');
let src=fs.readdirSync(dir).filter(f=>f.endsWith('.js')).sort().map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('');
src=src.replace(/\(function boot\(\)\{[\s\S]*?\}\)\(\);/,'');
global.window={innerWidth:1200,storage:{}};global.sessionStorage={getItem(){return null},setItem(){}};global.document={};
eval(src);
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL',m);} else console.log('ok',m); };
const byId={}; createDeck().forEach(t=>byId[t.id]=t);
const room={okeyColor:'red',okeyNumber:6,allTilesById:byId};
const id=(c,n,k=0)=>`${c}-${n}-${k}`;
// fake = red 6, not joker
ok(!isOkey(byId['fake-0'],'red',6),'fake not okey');
ok(isOkey(byId['red-6-0'],'red',6),'real okey');
ok(validateGroup([byId['red-5-0'],byId['fake-0'],byId['red-7-0']],'red',6).valid,'fake acts as red6 in run');
ok(!validateGroup([byId['blue-5-0'],byId['fake-0'],byId['blue-7-0']],'red',6).valid,'fake cannot be blue6');
ok(validateGroup([byId['blue-5-0'],byId['red-6-0'],byId['blue-7-0']],'red',6).valid,'okey joker works');
// arrange / swap
let a=arrangeMeld([id('blue',7),id('blue',5),id('red',6)],room);
ok(a.ids.join()==[id('blue',5),id('red',6),id('blue',7)].join(),'run arranged w/ okey in gap');
ok(findSwapOkey(id('blue',6),[id('blue',5),id('red',6),id('blue',7)],room)===id('red',6),'swap okey with blue6');
ok(findSwapOkey(id('blue',8),[id('blue',5),id('red',6),id('blue',7)],room)===null,'blue8 no swap');
ok(canExtendMeld(id('blue',8),[id('blue',5),id('red',6),id('blue',7)],room),'blue8 extends run');
ok(findSwapOkey(id('black',9),[id('blue',9),id('red',6),id('yellow',9)],room)===id('red',6),'set swap');
ok(findSwapOkey(id('blue',9,1),[id('blue',9),id('red',6),id('yellow',9)],room)===null,'set swap same color no');
// solver
ok(canOpenWith([id('black',10),id('black',11),id('black',12),id('red',8),id('red',9),id('red',10),id('red',11),id('blue',7),id('yellow',7),id('black',7),id('blue',1),id('blue',2),id('blue',3),id('red',13)],{...room,okeyColor:'yellow',okeyNumber:13})===false,'98 no open (red13 spare)');
const h1=[id('black',10),id('black',11),id('black',12),id('red',8),id('red',9),id('red',10),id('red',11),id('blue',7),id('yellow',7),id('black',7),id('blue',1),id('blue',2),id('blue',3),id('red',13),id('blue',13)];
const rr={...room,okeyColor:'yellow',okeyNumber:12};
console.log('h1 (98 + blue13 etc) =>',canOpenWith(h1,rr));
const h2=h1.concat([id('red',12)]); // red 10-11-12? red 8-9-10-11-12 =50 +33+21 +6=110
ok(canOpenWith(h2,rr)===true,'with red12 >=101');
// 5 pairs
const pr=[id('red',1,0),id('red',1,1),id('blue',2,0),id('blue',2,1),id('black',3,0),id('black',3,1),id('red',4,0),id('red',4,1),id('blue',5,0),id('blue',5,1),id('black',9)];
ok(canOpenWith(pr,room)===true,'5 pairs open');
ok(canOpenWith(pr.slice(0,8).concat([id('black',9),id('black',13)]),room)===false,'4 pairs no');
// perf random 22-tile hands
let worst=0;
for(let i=0;i<300;i++){ const d=dealRoundRaw(4,0); const r={okeyColor:d.okeyColor,okeyNumber:d.okeyNumber,allTilesById:d.allTilesById}; const t0=Date.now(); canOpenWith(d.hands[0],r); worst=Math.max(worst,Date.now()-t0); }
console.log('worst ms',worst);
// scoring deck end & okey bonus
const base={players:[0,1,2,3].map(s=>({seat:s,name:'p'+s})),scores:{0:0,1:0,2:0,3:0},hands:{0:[id('blue',3)],1:[id('blue',4)],2:[],3:[]},allTilesById:byId,okeyColor:'red',okeyNumber:6,takeEvents:[],penalties:[{seat:1,amount:101,label:'x'}],log:[]};
let rm=JSON.parse(JSON.stringify(base)); scoreRound(rm,null,null);
ok(rm.roundResult.deckEnd && rm.scores[0]===200 && rm.scores[1]===301,'deck end: açamayan +200 (+101 ceza)');
rm=JSON.parse(JSON.stringify(base)); rm.opened={0:{mode:'groups',meldValue:101},1:null,2:null,3:null}; scoreRound(rm,null,null);
ok(rm.scores[0]===3 && rm.scores[1]===301,'açmış oyuncu elde kalan toplamı yazar');
rm=JSON.parse(JSON.stringify(base)); rm.opened={0:null,1:null,2:{mode:'groups',meldValue:101},3:null}; scoreRound(rm,2,{mode:'groups',meldValue:101});
ok(rm.scores[0]===200 && rm.scores[3]===200,'kazanan varken açamayanlar +200');
rm=JSON.parse(JSON.stringify(base)); scoreRound(rm,2,{mode:'groups',meldValue:40,lastOkey:true});
ok(rm.scores[2]===-200,'win + okey finish = -200 (meld 40)');
// Seri Diz / Çift Diz planları
{ const rq={okeyColor:'yellow',okeyNumber:12,allTilesById:byId};
  const h=[id('black',10),id('black',11),id('black',12),id('red',8),id('red',9),id('red',10),id('red',11),id('red',12),id('blue',7),id('yellow',7),id('black',7),id('blue',1),id('blue',2),id('blue',3),id('red',13),id('yellow',12)];
  const pl=bestMeldPlan(h,rq);
  const used=pl.groups.flat().length+pl.leftover.length;
  ok(used===h.length && pl.groups.every(g=>validateGroup(g.map(x=>byId[x]),'yellow',12).valid),'meld plan geçerli ve tüm taşlar korunur');
  ok(pl.value>=134,'meld plan en yüksek puan ('+pl.value+')');
  const pp=bestPairPlan([id('red',1,0),id('red',1,1),id('blue',2,0),id('blue',2,1),id('black',5),id('yellow',12),id('red',9)],rq);
  ok(pp.pairs.length===3 && pp.leftover.length===1,'pair plan okeyle çift tamamlar');
}
console.log(fails?'FAILS '+fails:'ALL PASS');

process.exit(fails?1:0);
