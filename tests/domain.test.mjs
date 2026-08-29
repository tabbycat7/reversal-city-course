import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import katex from 'katex';
import {
 RAW,RATES,APPLICANTS,HISTORICAL_WEIGHTS,DATASETS,STORAGE_KEY,
 filterApplicants,weighted,observed,standardize,mixHistorical,equilibriumX,
 numeric,near,graphEdges,createsCycle,edgesMatch,freshSave,parseSave,
 readStoredSave,writeStoredSave,canVisit,gradeExam,validWeightedComposition,
 composeWeightedTex,WEIGHTED_PART_TEX,TEX_SLOT_PLACEHOLDER,
} from '../lib/domain.ts';
import { SCENES,CHAPTERS,chapterFor,scopeFor,PARTS,partFor,coreQuestionFor } from '../content/course.ts';
import { SYMBOLS } from '../content/symbols.ts';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,a+' differs from '+b);
const fullAnswers={
 q1_new:'43',q1_old:'54',q1_direction:'reversal',
 q2_new_0:'.75',q2_new_1:'.2',q2_new_2:'.35',q2_new_3:'.8',
 q2_old_0:'.60',q2_old_1:'.8',q2_old_2:'.30',q2_old_3:'.2',
 q2_roles:'rate-weight',q2_reason:'composition',
 q3_edges:'T>R,C>R,C>T',q3_paths:'target-backdoor',q3_control:'within-C',
 q4_new:'55',q4_old:'45',q4_effect:'10',q4_reason:'same-population',
 q5_new_0:'.35',q5_new_1:'.40',q5_old_0:'.30',q5_old_1:'.30',
 q5_tau_0:'.05',q5_tau_1:'.10',q5_min:'5',q5_max:'15',q5_interpretation:'assumptions',
};

test('A/D slice is exactly 1725 fixed, uniquely identified records',()=>{
 assert.equal(RAW.reduce((n,g)=>n+g.admitted+g.rejected,0),1725);
 assert.equal(APPLICANTS.length,1725);
 assert.equal(new Set(APPLICANTS.map(p=>p.id)).size,1725);
 assert.equal(APPLICANTS.filter(p=>p.gender==='M').length,1242);
 assert.equal(APPLICANTS.filter(p=>p.gender==='F').length,483);
});
test('filter chain preserves identity and gives 1725 → 483 → 108 → 89',()=>{
 const chain=[[false,false,false],[true,false,false],[true,true,false],[true,true,true]];
 assert.deepEqual(chain.map(args=>filterApplicants(...args).length),[1725,483,108,89]);
 for(const p of filterApplicants(true,true,true)) assert.equal(APPLICANTS[p.id],p);
});
test('raw conditional and total rates use counts, not rounded rates',()=>{
 close(RATES.femaleA,89/108);close(RATES.maleA,512/825);
 close(RATES.femaleD,131/375);close(RATES.maleD,138/417);
 const result=mixHistorical(HISTORICAL_WEIGHTS.x,HISTORICAL_WEIGHTS.y);
 close(result.male,650/1242);close(result.female,220/483);
 assert.equal((result.male*100).toFixed(1),'52.3');
 assert.equal((result.female*100).toFixed(1),'45.5');
 assert.equal(result.direction,'reversed');
});
for(const share of [0,.2,.5,.9,1])test('same weights '+share+' keep the female within-group advantage',()=>{
 const r=mixHistorical(share,share);
 assert.equal(r.direction,'within');assert.ok(r.female>r.male);
});
test('different weights do not guarantee reversal',()=>{
 const r=mixHistorical(.2,.1);assert.equal(r.direction,'within');
});
test('feasible exact balance is classified equal, not a rounding artifact',()=>{
 const y=.25,r=mixHistorical(equilibriumX(y),y);
 assert.equal(r.direction,'equal');close(r.male,r.female);
});
test('opposite weight endpoints and out-of-range guards',()=>{
 assert.equal(mixHistorical(1,0).direction,'reversed');
 assert.equal(mixHistorical(0,1).direction,'within');
 assert.deepEqual(mixHistorical(-1,2),mixHistorical(0,1));
 close(weighted(.8,.2,0),.2);close(weighted(.8,.2,1),.8);
});
test('training and examination datasets are distinct',()=>{
 const t=observed(DATASETS.training),e=observed(DATASETS.exam);
 close(t.r1,.36);close(t.r0,.56);close(e.r1,.43);close(e.r0,.54);
 assert.notDeepEqual(DATASETS.training,DATASETS.exam);
});
for(const [name,data,expected] of [
 ['training',DATASETS.training,[[.25,.2],[.525,.425],[.8,.65]]],
 ['exam',DATASETS.exam,[[.35,.3],[.55,.45],[.75,.6]]],
])for(const [i,lambda] of [0,.5,1].entries())test(name+' shared population at λ='+lambda,()=>{
 const result=standardize(data,lambda);
 close(result.r1,expected[i][0]);close(result.r0,expected[i][1]);close(result.tau,.05+.1*lambda);
});
test('difference is 5–15 percentage points across all allowed weights',()=>{
 for(let n=0;n<=100;n++){
  const r=standardize(DATASETS.exam,n/100);
  assert.ok(r.tau>=.05-1e-10&&r.tau<=.15+1e-10);
 }
});
test('random allocation only removes arrows entering treatment',()=>{
 assert.deepEqual(new Set(graphEdges(false,true)),new Set(['T>R','C>T','C>R','U>T','U>R']));
 assert.deepEqual(new Set(graphEdges(true,true)),new Set(['T>R','C>R','U>R']));
 assert.deepEqual(new Set(graphEdges(true,false)),new Set(['T>R','C>R']));
});
test('graph helper handles direction, duplicate sets and cycles',()=>{
 assert.ok(edgesMatch(['T>R','C>T','C>R'],['C>R','C>T','T>R']));
 assert.ok(!edgesMatch(['T>R','C>T'],['C>R','C>T','T>R']));
 assert.ok(createsCycle(['C>T','T>R'],'R','C'));
 assert.ok(createsCycle([],'T','T'));
 assert.ok(!createsCycle(['C>T'],'C','R'));
});
test('numeric input accepts decimals and a percent suffix, rejects empty or executable text',()=>{
 for(const s of ['43','43%',' 43％ ','43.0'])assert.equal(numeric(s),43);
 for(const s of ['',null,undefined,'1/2','alert(1)','43xyz','Infinity','0x2b'])assert.equal(numeric(s),null);
 assert.ok(near('82.4',89/108*100));assert.ok(!near('82',89/108*100));
});
test('full exam returns actual 17/17 in five dimensions',()=>{
 const score=gradeExam(fullAnswers);
 assert.equal(score.total,17);assert.equal(score.max,17);
 assert.deepEqual(score.dimensions.map(d=>d.score),[3,4,3,4,3]);
});
test('blank exam has zero points; unrelated prose never grants credit',()=>{
 assert.equal(gradeExam({}).total,0);
 assert.equal(gradeExam({note:'条件概率 混杂 共同结构 43% 54%'}).total,0);
});
test('partial exam and fractional rubric points',()=>{
 assert.equal(gradeExam({q1_new:'43',q5_new_0:'.35',q5_new_1:'.40'}).total,1.5);
 assert.equal(gradeExam({...fullAnswers,q4_effect:'0.10'}).total,16);
 assert.equal(gradeExam({...fullAnswers,q5_min:'5',q5_max:'10'}).total,16.5);
});
test('editing and resubmitting recomputes; no score is frozen or hard-coded',()=>{
 const a={...fullAnswers,q1_new:'36'};
 assert.equal(gradeExam(a).total,16);a.q1_new='43';assert.equal(gradeExam(a).total,17);
});
test('small decimal coefficients and percentage-point answers reject a percent suffix',()=>{
 assert.equal(gradeExam({...fullAnswers,q2_new_0:'0.75%'}).total,16);
 assert.equal(gradeExam({...fullAnswers,q5_tau_0:'.05％'}).total,16);
 assert.equal(gradeExam({...fullAnswers,q4_effect:'10%'}).total,16);
 assert.equal(gradeExam({...fullAnswers,q1_new:'43%'}).total,17);
 assert.ok(!near('.05%',.05,1e-6,false));
});
test('formula puzzle accepts commutative equivalent sums and products, rejects crossed departments',()=>{
 for(const terms of [[0,1,2,3],[1,0,2,3],[0,1,3,2],[1,0,3,2],[2,3,0,1],[3,2,0,1],[2,3,1,0],[3,2,1,0]])assert.ok(validWeightedComposition(terms));
 for(const terms of [[0,3,2,1],[0,0,2,3],[0,1],['',1,2,3],[undefined,1,2,3]])assert.ok(!validWeightedComposition(terms));
});
test('incorrect coefficient or mismatched treatment/data is not accepted',()=>{
 assert.equal(gradeExam({...fullAnswers,q2_new_0:'.8'}).total,16);
 assert.equal(gradeExam({...fullAnswers,q5_new_1:'.55'}).total,16.5);
});
test('default storage is local/versioned and modes have separate state objects',()=>{
 const s=freshSave();assert.equal(s.version,1);assert.match(STORAGE_KEY,/reversal-city.+v1/);
 assert.notEqual(s.explore,s.teacher);assert.notEqual(s.explore.states,s.teacher.states);
 assert.equal(s.settings.sound,false);s.teacher.completed.push(40);
 s.teacher.states['27']={q1_new:'43'};
 assert.deepEqual(s.explore.completed,[]);assert.deepEqual(s.exam.answers,{});
});
test('save/restore retains progress, answers, parameters and settings separately',()=>{
 const s=freshSave();
 s.explore.scene=10;s.explore.completed=[1,2,3];s.explore.states['10']={x:.2,y:.1};
 s.explore.states['37']={reflection:'总体差异存在，原因仍需要证据。'};
 s.teacher.scene=33;s.exam.question=4;s.exam.answers={q4_new:'55'};s.settings.reduced=true;
 assert.deepEqual(parseSave(JSON.stringify(s)),s);
});
test('corrupt, missing, wrong-version and out-of-range saves safely recover',()=>{
 for(const raw of [null,'not json','null','[]','{"version":99}'])assert.deepEqual(parseSave(raw),freshSave());
 const cleaned=parseSave(JSON.stringify({version:1,mode:'hacked',explore:{scene:999,completed:[1,1,-1,41],states:{'2':{ok:true,ignored:{nested:1}}},hints:{'2':99}},exam:{question:-2,answers:{x:42,y:'5'}}}));
 assert.equal(cleaned.mode,'explore');assert.equal(cleaned.explore.scene,40);
 assert.deepEqual(cleaned.explore.completed,[1]);assert.equal(cleaned.explore.hints['2'],3);
 assert.deepEqual(cleaned.explore.states['2'],{ok:true});assert.equal(cleaned.exam.question,1);
 assert.deepEqual(cleaned.exam.answers,{y:'5'});
});
test('storage access or quota failure never prevents learning in memory',()=>{
 const loaded=readStoredSave(()=>{throw Error('SecurityError');});
 assert.equal(loaded.available,false);assert.deepEqual(loaded.save,freshSave());
 assert.equal(writeStoredSave(()=>{throw Error('QuotaExceededError');},loaded.save),false);
 let persisted='';assert.equal(writeStoredSave(v=>{persisted=v;},loaded.save),true);
 assert.deepEqual(readStoredSave(()=>persisted).save,loaded.save);
});
test('student progression is gated, teacher jumps do not unlock student state',()=>{
 const s=freshSave();
 assert.ok(canVisit(s.explore,1,'explore'));assert.ok(!canVisit(s.explore,2,'explore'));
 assert.ok(canVisit(s.teacher,40,'teacher'));assert.ok(!canVisit(s.explore,40,'explore'));
 s.explore.completed=[1];assert.ok(canVisit(s.explore,2,'explore'));
 assert.ok(!canVisit(s.explore,3,'explore'));
});
test('40 scenes form six consecutive chapters with objectives and three hints',()=>{
 assert.equal(SCENES.length,40);assert.deepEqual(SCENES.map(s=>s.id),Array.from({length:40},(_,i)=>i+1));
 const ids=CHAPTERS.flatMap(c=>Array.from({length:c.end-c.start+1},(_,i)=>c.start+i));
 assert.deepEqual(ids,SCENES.map(s=>s.id));
 for(const s of SCENES){
  assert.ok(s.title&&s.objective&&s.reference);assert.equal(s.hints.length,3);
  assert.ok(s.hints.every(Boolean));assert.ok(chapterFor(s.id).start<=s.id);
  for(const key of s.symbols)assert.ok(SYMBOLS[key],'Missing symbol: '+key);
 }
});
test('data scope labels do not mix full school, A/D, training or examination',()=>{
 assert.match(scopeFor(1).detail,/12,763/);assert.match(scopeFor(1,true).detail,/1,725/);
 assert.match(scopeFor(10).label,/模拟/);assert.match(scopeFor(19).label,/因果训练/);
 assert.match(scopeFor(27).label,/高考/);assert.match(scopeFor(37).detail,/12,763/);
 assert.match(scopeFor(35).label,/晚自习/);assert.match(scopeFor(36).label,/AI/);
});
test('local original art and entry assets are present',()=>{
 for(const f of ['city-map.png','alan-expressions-2x2.png','robot-blink-4x1.png',...CHAPTERS.map(c=>c.art)])
  assert.ok(existsSync(new URL('../public/art/'+f,import.meta.url)),f);
 assert.ok(existsSync(new URL('../public/og.png',import.meta.url)));
});
test('KaTeX renders core formulas with MathML, including every symbolic family',()=>{
 const formulas=[
  'P(R\\mid F,C=\\mathrm A)=\\frac{89}{108}\\approx82.4\\%',
  'P(E\\mid B)=\\frac{P(E\\cap B)}{P(B)},\\quad P(B)>0',
  'P(R\\mid M)=P(R\\mid M,C=\\mathrm A)P(C=\\mathrm A\\mid M)+P(R\\mid M,C=\\mathrm D)P(C=\\mathrm D\\mid M)',
  'R_1(\\lambda)=0.25+0.55\\lambda,\\quad R_0(\\lambda)=0.20+0.45\\lambda',
  '\\tau(\\lambda)=0.05+0.10\\lambda,\\quad0\\le\\lambda\\le1',
  'X\\leftarrow Z\\rightarrow Y', 'G\\rightarrow C\\rightarrow R',
 ];
 for(const tex of formulas){
  const markup=katex.renderToString(tex,{output:'htmlAndMathml',throwOnError:true});
  assert.match(markup,/<math/);assert.ok(!markup.includes('katex-error'));
 }
});
test('scene 11 renders every slot state, in both the wide and the stacked layout',()=>{
 const states=[
  [TEX_SLOT_PLACEHOLDER,TEX_SLOT_PLACEHOLDER,TEX_SLOT_PLACEHOLDER,TEX_SLOT_PLACEHOLDER],
  [WEIGHTED_PART_TEX[0],TEX_SLOT_PLACEHOLDER,TEX_SLOT_PLACEHOLDER,TEX_SLOT_PLACEHOLDER],
  WEIGHTED_PART_TEX,[WEIGHTED_PART_TEX[2],WEIGHTED_PART_TEX[3],WEIGHTED_PART_TEX[0],WEIGHTED_PART_TEX[1]],
 ];
 for(const group of ['M','F'])for(const state of states)for(const stacked of [false,true]){
  const tex=composeWeightedTex(group,state.map(t=>t.replaceAll('@',group)),stacked);
  // Dropping the space turns "\times"+"P(...)" into the unknown command "\timesP".
  assert.doesNotMatch(tex,/\\(times|quad|mid)[A-Za-z]/,'operator ran into the next term: '+tex);
  const markup=katex.renderToString(tex,{output:'htmlAndMathml',throwOnError:true,displayMode:true});
  assert.match(markup,/<math/);assert.ok(!markup.includes('katex-error'));
 }
});
test('five parts and core questions cover all 40 scenes without gaps',()=>{
 assert.strictEqual(PARTS[0].start,1);assert.strictEqual(PARTS[PARTS.length-1].end,40);
 PARTS.forEach((p,i)=>{
  assert.ok(p.title&&p.lead&&p.name,'part '+p.id+' needs orienting copy');
  if(i)assert.strictEqual(p.start,PARTS[i-1].end+1,'part '+p.id+' must follow the previous one');
 });
 for(const scene of SCENES){
  assert.ok(partFor(scene.id),'scene '+scene.id+' has no part');
  assert.ok(coreQuestionFor(scene.id).endsWith('？'),'scene '+scene.id+' needs a core question');
  assert.ok(scene.prompt.length>5,'scene '+scene.id+' needs a task prompt next to its controls');
  if(scene.id<40)assert.ok(scene.bridge.length>5,'scene '+scene.id+' needs a hand-off to the next scene');
 }
});
test('runtime imports use local assets and no external font/CDN/AI endpoint',()=>{
 for(const name of ['app/layout.tsx','app/globals.css','app/CityCourse.tsx']){
  const text=readFileSync(new URL('../'+name,import.meta.url),'utf8');
  assert.ok(!/fonts\.googleapis|cdn\.jsdelivr|unpkg\.com|api\.openai/.test(text));
 }
});
