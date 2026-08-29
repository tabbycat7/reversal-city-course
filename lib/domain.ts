export type Mode = 'explore' | 'teacher' | 'exam';
export type SceneState = Record<string, string | number | boolean | string[]>;
export type CourseProgress = { scene: number; completed: number[]; states: Record<string, SceneState>; hints: Record<string, number> };
export type Save = { version: 1; mode: Mode; explore: CourseProgress; teacher: CourseProgress; exam: { question: number; answers: Record<string, string>; submitted: boolean }; settings: { sound: boolean; reduced: boolean; large: boolean } };
export const STORAGE_KEY = 'reversal-city:course:v1';
export const RAW = [
 { department: 'A', gender: 'M', admitted: 512, rejected: 313 },
 { department: 'A', gender: 'F', admitted: 89, rejected: 19 },
 { department: 'D', gender: 'M', admitted: 138, rejected: 279 },
 { department: 'D', gender: 'F', admitted: 131, rejected: 244 },
] as const;
function groupCount(gender:'M'|'F'){
 const rows=RAW.filter(r=>r.gender===gender);
 const admitted=rows.reduce((sum,r)=>sum+r.admitted,0),rejected=rows.reduce((sum,r)=>sum+r.rejected,0);
 return {gender,admitted,rejected,total:admitted+rejected,rate:admitted/(admitted+rejected)};
}
export const GROUP_TOTALS={M:groupCount('M'),F:groupCount('F')};
function rawGroup(gender:'M'|'F',department:'A'|'D'){return RAW.find(r=>r.gender===gender&&r.department===department)!;}
function rawRate(gender:'M'|'F',department:'A'|'D'){const r=rawGroup(gender,department);return r.admitted/(r.admitted+r.rejected);}
export const RATES = { maleA: rawRate('M','A'), femaleA: rawRate('F','A'), maleD: rawRate('M','D'), femaleD: rawRate('F','D') };
export const HISTORICAL_WEIGHTS = { x: (rawGroup('M','A').admitted+rawGroup('M','A').rejected)/GROUP_TOTALS.M.total, y:(rawGroup('F','A').admitted+rawGroup('F','A').rejected)/GROUP_TOTALS.F.total };
export type Applicant = { id: number; department: string; gender: string; admitted: boolean };
export const APPLICANTS: Applicant[] = RAW.flatMap(g => Array.from({ length: g.admitted + g.rejected }, (_, i) => ({ id: 0, department: g.department, gender: g.gender, admitted: i < g.admitted }))).map((person, id) => ({ ...person, id }));
export const DATASETS = {
 training: { id: 'training', name: '因果训练', h1: .8, l1: .25, h0: .65, l0: .2, w1: .2, w0: .8 },
 exam: { id: 'exam', name: '高考迁移', h1: .75, l1: .35, h0: .6, l0: .3, w1: .2, w0: .8 },
} as const;
export type Dataset = typeof DATASETS[keyof typeof DATASETS];
export function clamp(n: number, min = 0, max = 1) { return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min)); }
export function percent(v: number, digits = 1) { return (v * 100).toFixed(digits) + '%'; }
export function displayPercent(v:number,digits=1){
 const rounded=Number((v*100).toFixed(digits));
 return (Math.abs(v*100-rounded)>1e-9?'≈':'')+percent(v,digits);
}
export function weighted(h: number, l: number, share: number) { return h * share + l * (1 - share); }
export function observed(d: Dataset) { return { r1: weighted(d.h1, d.l1, d.w1), r0: weighted(d.h0, d.l0, d.w0) }; }
export function standardize(d: Dataset, lambda: number) {
 const r1 = weighted(d.h1, d.l1, clamp(lambda)), r0 = weighted(d.h0, d.l0, clamp(lambda));
 return { r1, r0, tau: r1-r0 };
}
export function mixHistorical(x: number, y: number) {
 const male = weighted(RATES.maleA, RATES.maleD, clamp(x)), female = weighted(RATES.femaleA, RATES.femaleD, clamp(y)), diff = male-female;
 return { male, female, diff, direction: Math.abs(diff)<1e-10 ? 'equal' : diff>0 ? 'reversed' : 'within' };
}
export function equilibriumX(y: number) { return (weighted(RATES.femaleA, RATES.femaleD, y)-RATES.maleD)/(RATES.maleA-RATES.maleD); }
export function filterApplicants(female: boolean, a: boolean, admitted: boolean) { return APPLICANTS.filter(p => (!female || p.gender==='F') && (!a || p.department==='A') && (!admitted || p.admitted)); }
export function numeric(value: unknown,allowPercent=true): number | null {
 if(typeof value!=='string' && typeof value!=='number') return null;
 if(!allowPercent&&/[%％]/.test(String(value)))return null;
 const s=String(value).trim().replace(/％/g,'%').replace(/%$/,'').trim();
 if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) return null;
 const n=Number(s); return Number.isFinite(n)?n:null;
}
export function near(value: unknown, expected: number, tolerance=.051,allowPercent=true) { const n=numeric(value,allowPercent); return n!==null && Math.abs(n-expected)<=tolerance; }
export function validWeightedComposition(parts:unknown[]){
 if(parts.length!==4||parts.some(p=>p===undefined||p===null||p===''))return false;
 const indices=parts.map(Number);
 if(indices.some(n=>!Number.isInteger(n)||n<0||n>3)||new Set(indices).size!==4)return false;
 return [indices.slice(0,2).sort().join(','),indices.slice(2).sort().join(',')].sort().join('|')==='0,1|2,3';
}
export const WEIGHTED_PART_TEX=['P(R\\mid @,C=\\mathrm A)','P(C=\\mathrm A\\mid @)','P(R\\mid @,C=\\mathrm D)','P(C=\\mathrm D\\mid @)'];
export const TEX_SLOT_PLACEHOLDER='\\boxed{\\,?\\,}';
// A KaTeX control word swallows the letters right after it, so every operator keeps a
// trailing space. Without it "\times"+"P(...)" becomes the unknown command "\timesP" and
// KaTeX falls back to printing the whole formula as red source text.
export function composeWeightedTex(group: string, terms: string[], stacked = false) {
 const operator=(i:number)=>i===2?'+ ':'\\times ';
 const head='P(R\\mid '+group+')';
 if(!stacked)return head+' = '+terms.map((t,i)=>(i===0?'':operator(i))+t).join(' ');
 return '\\begin{aligned}&'+head+'\\\\&= '+terms.map((t,i)=>(i===0?'':'\\\\&\\quad '+operator(i))+t).join('')+'\\end{aligned}';
}
export function edgesMatch(actual: string[], expected: string[]) { return actual.length===expected.length && expected.every(e=>actual.includes(e)); }
export function graphEdges(randomized: boolean, unmeasured: boolean) { return ['T>R','C>R',...(randomized?[]:['C>T']),...(unmeasured?['U>R',...(randomized?[]:['U>T'])]:[])]; }
export function createsCycle(edges: string[], from: string, to: string) {
 if(from===to)return true; const stack=[to], seen=new Set<string>();
 while(stack.length){const c=stack.pop()!;if(c===from)return true;if(seen.has(c))continue;seen.add(c);edges.filter(e=>e.split('>')[0]===c).forEach(e=>stack.push(e.split('>')[1]));} return false;
}
export function freshProgress(): CourseProgress { return {scene:1,completed:[],states:{},hints:{}}; }
export function freshSave(): Save { return {version:1,mode:'explore',explore:freshProgress(),teacher:freshProgress(),exam:{question:1,answers:{},submitted:false},settings:{sound:false,reduced:false,large:false}}; }
const isObject=(x:unknown):x is Record<string,unknown>=>!!x && typeof x==='object' && !Array.isArray(x);
function cleanProgress(x:unknown):CourseProgress{
 if(!isObject(x))return freshProgress();
 const completed=Array.isArray(x.completed)?[...new Set(x.completed.filter(n=>Number.isInteger(n)&&n>=1&&n<=40))]:[];
 const states:Record<string,SceneState>={};
 if(isObject(x.states))for(const [key,val]of Object.entries(x.states))if(Number(key)>=1&&Number(key)<=40&&isObject(val)){
  states[key]={};for(const[k,v]of Object.entries(val))if(typeof v==='string'||typeof v==='boolean'||(typeof v==='number'&&Number.isFinite(v))||(Array.isArray(v)&&v.every(a=>typeof a==='string')))states[key][k]=v as SceneState[string];
 }
 const hints:Record<string,number>={};
 if(isObject(x.hints))for(const[k,v]of Object.entries(x.hints))if(typeof v==='number'&&Number.isFinite(v))hints[k]=clamp(Math.floor(v),0,3);
 return {scene:clamp(Math.floor(Number(x.scene))||1,1,40),completed,states,hints};
}
export function parseSave(raw:string|null):Save{
 const f=freshSave();if(!raw)return f;
 try{
  const d:unknown=JSON.parse(raw);if(!isObject(d)||d.version!==1)return f;
  f.explore=cleanProgress(d.explore);f.teacher=cleanProgress(d.teacher);
  if(['explore','teacher','exam'].includes(String(d.mode)))f.mode=d.mode as Mode;
  if(isObject(d.settings))f.settings={sound:d.settings.sound===true,reduced:d.settings.reduced===true,large:d.settings.large===true};
  if(isObject(d.exam)){
   const answers:Record<string,string>={};
   if(isObject(d.exam.answers))for(const[k,v]of Object.entries(d.exam.answers))if(typeof v==='string')answers[k]=v;
   f.exam={question:clamp(Math.floor(Number(d.exam.question))||1,1,5),answers,submitted:d.exam.submitted===true};
  }
  return f;
 }catch{return f;}
}
// Storage can be disabled or full; learning must remain available in memory.
export function readStoredSave(read:()=>string|null){
 try{return {save:parseSave(read()),available:true};}catch{return {save:freshSave(),available:false};}
}
export function writeStoredSave(write:(value:string)=>void,save:Save){
 try{write(JSON.stringify(save));return true;}catch{return false;}
}
export function canVisit(p:CourseProgress,scene:number,mode:Mode){return mode==='teacher'||scene===1||p.completed.includes(scene)||p.completed.includes(scene-1);}
export type ScoreItem={label:string;score:number;max:number};
export type Dimension={title:string;score:number;max:number;items:ScoreItem[];advice:string};
export function gradeExam(a:Record<string,string>):{total:number;max:number;dimensions:Dimension[]}{
 const d=DATASETS.exam,o=observed(d),s=standardize(d,.5);
 const tau0=d.l1-d.l0,tau1=(d.h1-d.l1)-(d.h0-d.l0);
 const endpoints=[standardize(d,0).tau*100,standardize(d,1).tau*100];
 const eq=(k:string,v:string)=>a[k]===v, num=(k:string,v:number,t=.051,allowPercent=true)=>near(a[k],v,t,allowPercent);
 const factors=(p:string,e:number[])=>e.every((v,i)=>num(p+i,v,1e-6,false));
 const item=(label:string,ok:boolean,max=1):ScoreItem=>({label,score:ok?max:0,max});
 const groups=[
 {title:'数据读取与计算',advice:'先用各组录取率和人数构成加权，不要简单平均两个百分比。',items:[item('新方案总体'+percent(o.r1,0),num('q1_new',o.r1*100)),item('原方案总体'+percent(o.r0,0),num('q1_old',o.r0*100)),item('识别反转',eq('q1_direction','reversal'))]},
 {title:'条件概率建模',advice:'每项是同院系内的条件率，乘该院系在本组中的权重。',items:[item('新方案分解式',factors('q2_new_',[d.h1,d.w1,d.l1,1-d.w1])),item('原方案分解式',factors('q2_old_',[d.h0,d.w0,d.l0,1-d.w0])),item('区分条件率与权重',eq('q2_roles','rate-weight')),item('解释不同构成',eq('q2_reason','composition'))]},
 {title:'因果结构判断',advice:'先明确机制假设，再找T←C→R这条非目标路径，在同院系条件下比较。',items:[item('三条假设箭头',edgesMatch((a.q3_edges||'').split(',').filter(Boolean),['C>T','C>R','T>R'])),item('目标与混杂路径',eq('q3_paths','target-backdoor')),item('控制院系',eq('q3_control','within-C'))]},
 {title:'控制与标准化',advice:'两种方案使用同一个目标人群构成；差值0.10表示10个百分点。',items:[item('新方案'+percent(s.r1,0),num('q4_new',s.r1*100)),item('原方案'+percent(s.r0,0),num('q4_old',s.r0*100)),item('差'+(s.tau*100).toFixed(0)+'个百分点',num('q4_effect',s.tau*100,.051,false)),item('解释共同人群',eq('q4_reason','same-population'))]},
 {title:'函数与结果解释',advice:'用共同λ写两条函数再相减，结论必须带着可比性等假设。',items:[item('新方案函数',factors('q5_new_',[d.l1,d.h1-d.l1]),.5),item('原方案函数',factors('q5_old_',[d.l0,d.h0-d.l0]),.5),item('差值函数',factors('q5_tau_',[tau0,tau1])),item('范围5—15个百分点',num('q5_min',Math.min(...endpoints),.051,false)&&num('q5_max',Math.max(...endpoints),.051,false),.5),item('带假设的正效应',eq('q5_interpretation','assumptions'),.5)]},
 ];
 const dimensions=groups.map(g=>({...g,score:g.items.reduce((s,i)=>s+i.score,0),max:g.items.reduce((s,i)=>s+i.max,0)}));
 return {total:dimensions.reduce((s,d)=>s+d.score,0),max:17,dimensions};
}
