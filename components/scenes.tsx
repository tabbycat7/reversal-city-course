'use client';
import { Fragment } from 'react';
import { Check, ArrowRight, Filter, Download, Flag, Undo2, X } from 'lucide-react';
import { RATES, GROUP_TOTALS, DATASETS, observed, standardize, HISTORICAL_WEIGHTS, filterApplicants, percent, graphEdges, validWeightedComposition, composeWeightedTex, WEIGHTED_PART_TEX, TEX_SLOT_PLACEHOLDER, type SceneState } from '../lib/domain';
import { SCENES } from '../content/course';
import { MathText, Choice, Calculate, Classify, RawTable, ApplicantCanvas, RatioBar, Assumptions, Feedback, ConceptReveal, TaskLead, type TaskProps } from './shared';
import { GraphTask, GraphBoard, WeightsLab, WorldsLab, Randomization, FunctionExplorer } from './labs';
import { ExamPractice, PolicyTable } from './exam';
type Task=TaskProps&{prompt:string};
export const HYPOTHESES=['数据提示可能存在对女性不利的现象','男性申请者能力更强','只能确认总体差异，还不能判断原因'];
export function Opening(p:TaskProps){
 const revealed=p.state.hypothesis!==undefined,pick=Number(p.state.pick??-1);
 if(!revealed)return <div className="opening-task"><div className="task-kicker">记录你的第一判断</div><h2>如果只看到这组数据，你会怎么想？</h2><p>1973年，伯克利全校12,763份研究生申请中，男性总体录取率约44%，女性约35%。</p><div className="initial-options">{HYPOTHESES.map((v,i)=><button key={v} aria-pressed={pick===i} className={pick===i?'selected':''} onClick={()=>p.patch({pick:i})}><span>0{i+1}</span><b>{v}</b>{pick===i?<Check size={18}/>:<ArrowRight size={18}/>}</button>)}</div><button className="primary" disabled={pick<0} onClick={()=>p.patch({hypothesis:pick})}>记下这个判断 <ArrowRight size={17}/></button><p className="micro">只记录你的直觉，现在不判对错。确认之前都可以改。</p></div>;
 return <div className="opening-task"><div className="recorded"><Check size={16}/>初始判断已记录：{HYPOTHESES[Number(p.state.hypothesis)]}</div><h2>分开看，女性都更高。<em>合起来，反而男性更高？</em></h2><div className="reversal-board">{[{title:'A 院系',f:RATES.femaleA,m:RATES.maleA},{title:'D 院系',f:RATES.femaleD,m:RATES.maleD},{title:'A + D 合并',f:GROUP_TOTALS.F.rate,m:GROUP_TOTALS.M.rate}].map((g,i)=><div className={'reversal-column '+(i===2?'reverse':'')} key={g.title}><span className="small-cap">{g.title}</span><div><label>女性</label><strong><small>≈</small>{percent(g.f)}</strong></div><div><label>男性</label><strong><small>≈</small>{percent(g.m)}</strong></div><b>{i===2?'男性更高 ↑':'女性更高 ↑'}</b></div>)}</div><p className="scope-warning">A/D 是经典伯克利数据中的教学切片，共1725份记录，<strong>不是全校44%/35%的直接拆解</strong>。上述百分比均为近似值。</p><button className="primary" onClick={()=>p.complete('调查已开启。现象已经确认，原因还需要进一步分析。')}>接下这项调查 <ArrowRight size={17}/></button></div>;
}
function RecordViews(p:Task){
 const grouped=!!p.state.grouped;
 return <div><TaskLead>{p.prompt}</TaskLead><div className="segmented"><button className={!grouped?'active':''} aria-pressed={!grouped} onClick={()=>p.patch({grouped:false,seenOverall:true})}>总体视图</button><button className={grouped?'active':''} aria-pressed={grouped} onClick={()=>p.patch({grouped:true,seenGrouped:true})}>展开院系维度</button></div><RawTable aggregate={!grouped}/><div className="invariant"><b>1,725</b><span>份申请，始终没有增减<br/>改变的是保留了哪些条件。</span></div><button className="primary" disabled={!p.state.seenGrouped} onClick={()=>p.complete('数据没有改变，改变的是观察时保留的条件。')}>确认：改变的是观察条件 <Check size={16}/></button></div>;
}
function FilterTask(p:Task){
 const step=Number(p.state.step||0),female=step>=1,a=step>=2,admitted=step>=3;
 const counts=[1725,483,108,89],n=filterApplicants(female,a,admitted).length;
 return <div className="filter-task"><TaskLead>{p.prompt}</TaskLead><div className="filter-steps">{['全部申请','锁定女性','再锁定A院系','数其中录取'].map((v,i)=><button key={v} className={step===i?'active':step>i?'visited':''} disabled={i>step+1} onClick={()=>p.patch({step:i})}><Filter size={15}/><span>{v}</span><b>{i<=step?counts[i]:'?'}</b></button>)}</div><div className="filter-counter"><span>{['当前样本世界','女性申请者','A院系女性申请者','该条件内被录取'][step]}</span><strong>{n}</strong><small>份申请记录</small></div><ApplicantCanvas female={female} a={a} admitted={admitted}/>{step===3&&(p.state.confirmed?<div className="formula-reveal"><span>在「女性且申请A」这个世界里</span><MathText tex={'P(R\\mid F,C=\\mathrm A)=\\frac{89}{108}\\approx 82.4\\%'} block/><p>先缩小样本世界，再计算其中的比例。</p></div>:<button className="primary" onClick={()=>{p.patch({confirmed:true});p.complete('分母是108（A院系的全部女性申请者），不是1725。分子是其中被录取的89人。');}}>确认：这次计算的分母是 108 人 <Check size={16}/></button>)}</div>;
}
const PART_NAMES=['A院系内录取率','A院系权重','D院系内录取率','D院系权重'];
function FormulaPuzzle(p:Task){
 const groups=[{key:'M',name:'男性'},{key:'F',name:'女性'}];
 const picked=(g:string)=>[0,1,2,3].map(i=>String(p.state[g+i]??''));
 const terms=(g:string)=>picked(g).map(v=>v===''?TEX_SLOT_PLACEHOLDER:WEIGHTED_PART_TEX[Number(v)].replaceAll('@',g));
 // Each part exists once, so choosing one that already sits elsewhere trades the two
 // slots. That keeps duplicates impossible without ever freezing a filled machine.
 const assign=(g:string,slot:number,value:string)=>{
  const current=picked(g),holder=current.indexOf(value),next:SceneState={feedback:'',[g+slot]:value};
  if(holder>=0&&holder!==slot)next[g+holder]=current[slot];
  p.patch(next);
 };
 const verify=()=>{
  const broken=groups.find(g=>!validWeightedComposition(picked(g.key).map(v=>v===''?undefined:v)));
  if(!broken){p.patch({feedback:'总体录取率，就是两个院系的录取率按各自权重加权后相加。',wrong:false});p.complete();return;}
  p.patch({wrong:true,feedback:picked(broken.key).some(v=>v==='')?'先把'+broken.name+'的四个空都选上，再启动机器。'
   :broken.name+'的配对还不对：每一项要用同一个院系的录取率，乘这个院系的权重。不能把 A 的录取率配 D 的权重。'});
 };
 return <div className="formula-machine"><TaskLead>{p.prompt}</TaskLead>
  {groups.map(g=><section key={g.key}><h3>{g.name}的总体录取率</h3><div className="formula-slots">{[[0,1],[2,3]].map(([a,b],pair)=><div className="formula-pair" key={pair}>{pair===1&&<b className="pair-join">＋</b>}<div className="pair-body"><span className="pair-caption">第 {pair+1} 项 · 录取率 × 权重</span><div className="pair-slots">{[a,b].map((i,slot)=><Fragment key={i}>{slot===1&&<b>×</b>}<select aria-label={g.name+'公式第'+(pair+1)+'项的'+(slot===0?'录取率':'权重')} value={String(p.state[g.key+i]??'')} onChange={e=>assign(g.key,i,e.target.value)}><option value="" disabled>选择公式部件</option>{[2,0,3,1].map(n=><option key={n} value={n}>{PART_NAMES[n]}{picked(g.key).includes(String(n))&&String(p.state[g.key+i]??'')!==String(n)?' · 已放在另一个空，选它就交换':''}</option>)}</select></Fragment>)}</div></div></div>)}</div><MathText tex={composeWeightedTex(g.key,terms(g.key))} compactTex={composeWeightedTex(g.key,terms(g.key),true)} block/></section>)}
  <button className="primary" onClick={verify}>启动概率组合机 <Check size={16}/></button><Feedback state={p.state}/></div>;
}
function LayeredRecap(){
 return <div className="recap-card"><span>回到刚才核对过的三行数字</span><div className="recap-rows">
  <div><b>A 院系</b><span>女 ≈82.4%　<i>&gt;</i>　男 ≈62.1%</span></div>
  <div><b>D 院系</b><span>女 ≈34.9%　<i>&gt;</i>　男 ≈33.1%</span></div>
  <div className="reverse"><b>A + D 合并</b><span>男 ≈52.3%　<i>&gt;</i>　女 ≈45.5%</span></div>
 </div><small>权重差异解释了这三行为什么能同时成立。但它没有告诉我们，录取过程中实际发生了什么。</small></div>;
}
function StatisticalVsCausal(p:Task){
 return <><LayeredRecap/><Choice {...p} options={['是，找到权重就等于找到了原因','不是，统计结构还不自动等于因果结构','数据出现反转，所以所有分析都没有意义']} correct={1} reason="解释数字为什么反转，与判断现实中什么导致了结果，是两个层次的问题。"/>{p.done&&<div className="premise"><b>前面解决的是「统计结构」</b><p>数字之间的关系已经理清。但「为什么会形成这样的院系构成」「录取时究竟发生了什么」，还没有被解决——那属于「因果结构」。接下来四幕专门处理这个跨越。</p></div>}</>;
}
function Association(p:Task){
 return <><div className="association-demo"><button className={!p.state.hot?'active':''} onClick={()=>p.patch({hot:false})}>天气较凉</button><button className={p.state.hot?'active':''} onClick={()=>p.patch({hot:true})}>天气较热</button><div className="demo-bars"><div><span>冷饮销量</span><i style={{width:p.state.hot?'86%':'30%'}}/></div><div><span>游泳人数</span><i style={{width:p.state.hot?'74%':'22%'}}/></div></div><small>教学情境示意：共同变化可能来自气温等第三个因素，并非实际调查数据。</small></div>
 <div className="recap-card"><span>回头看伯克利</span><b>P(R | M) ≠ P(R | F)</b><small>性别和录取结果在数据里确实有关联。但和冷饮、游泳一样，光有这个关联，并不能告诉我们改变什么会带来什么。</small></div>
 <Choice {...p} options={['冷饮销量高一定导致游泳人数多','只能看到统计关联，还不能据此判断因果方向','只要两者一起变化，就必然毫无关系']} correct={1} reason="相关描述的是共同变化。要讨论改变一个因素的作用，需要机制假设和更合适的比较。"/>
 {p.done&&<ConceptReveal en="CORRELATION ≠ CAUSATION" zh="相关性不等于因果性" definition="X不同的人，Y也经常不同——这只说明两者存在统计关联。要断定改变X会让Y跟着变，还需要别的东西。"/>}</>;
}
function Confounding(p:Task){
 if(!p.state.spotted)return <><PolicyTable training/><Choice {...p} complete={()=>p.patch({spotted:true})} options={['匿名组八成来自低录取率的L，传统组八成来自高录取率的H','两组的院系构成完全一样','除了审核制度，两组没有别的差别']} correct={0} reason="找到了：两组人的院系构成不同。院系既影响谁更可能用哪种方案，也影响录不录取。"/></>;
 return <><div className="premise"><b>把刚才的发现写进图里</b><p>院系影响审核方案的分配，也影响录取结果；我们要研究的是方案是否影响录取。请把这三条关系都连上。</p></div><GraphTask {...p} expected={['C>T','C>R','T>R']}/></>;
}
function Trace(p:Task){
 const seen=Array.isArray(p.state.seenPaths)?p.state.seenPaths:[],path=String(p.state.path||'');
 const show=(v:string)=>p.patch({path:v,seenPaths:[...new Set([...seen,v])]});
 const both=seen.includes('target')&&seen.includes('confound');
 return <><TaskLead>{p.prompt}</TaskLead><div className="segmented"><button aria-pressed={path==='target'} className={path==='target'?'active':''} onClick={()=>show('target')}>点亮目标：T → R</button><button aria-pressed={path==='confound'} className={path==='confound'?'active':''} onClick={()=>show('confound')}>点亮另一条路：T ← C → R</button></div><GraphBoard edges={graphEdges(false,false)} highlight={path==='target'?['T>R']:path==='confound'?['C>T','C>R']:[]} readOnly/><p className="micro">{path==='confound'?'这条路线不经过「方案→录取」，却同样让T和R的数字连在一起。院系的影响就是这样混进总体差异的。':path==='target'?'这是我们真正想研究的路径：改变审核方案，录取结果是否随之改变。':'先点上面的按钮，把两条路线各看一遍。'}</p>
 <Choice {...p} complete={message=>{if(both)p.complete(message);else p.patch({wrong:true,feedback:'先把两条路线都点开看一遍，再下判断。'});}} options={['T→R 是院系带来的混杂','T←C→R 会把院系的影响混进总体比较','任何一条连线都已经证明因果']} correct={1} reason="在本模型中，C是T和R的共同原因；这条绕行路线会混杂两者的比较。"/>
 {p.done&&<ConceptReveal en="CONFOUNDER" zh="混杂变量" definition="一个变量如果既和我们正在比较的因素有关，又会影响结果，它就可能把两种影响混在一起，干扰我们对因果关系的判断。" note="在这个教学模型里，申请院系 C 扮演的就是混杂变量的角色。"/>}</>;
}
function StandardizeChoice(p:Task){
 const same=!!p.state.same;
 return <><TaskLead>{p.prompt}</TaskLead><div className="segmented"><button aria-pressed={!same} className={!same?'active':''} onClick={()=>p.patch({same:false})}>观察到的两组</button><button aria-pressed={same} className={same?'active':''} onClick={()=>p.patch({same:true,seenSame:true})}>统一到共同人群</button></div><div className="twin-ratios"><RatioBar label="匿名审核" share={same ? .5 : DATASETS.training.w1} detail="H院系占比"/><RatioBar label="传统审核" share={same ? .5 : DATASETS.training.w0} detail="H院系占比"/></div><p className="micro">{same?'两条构成条现在完全一样：两种方案面对同一种院系结构，可以比较了。':'现实中两种方案面对的院系结构差别很大，直接比较总体率并不公平。'}</p>
 <Choice {...p} complete={message=>{if(p.state.seenSame)p.complete(message);else p.patch({wrong:true,feedback:'先点「统一到共同人群」，看看两种方案的院系结构怎样变化，再确认你的解释。'});}} options={['让两种方案都面对相同的院系结构，再比较','删除人数较少的院系，让结果更漂亮','把两个百分比直接平均，任何情况都适用']} correct={0} reason="这一步叫标准化。目标人群需要事先明确，因果含义仍取决于可比性等假设。"/>
 {p.done&&<ConceptReveal en="STANDARDIZATION" zh="标准化" definition="先说清要把结论用在哪一种人群上，再让不同方案都面对这个共同的人群结构，然后比较结果。" note="重新加权改变的是比较所用的权重，从来不改动院系内部的录取率。"/>}</>;
}
function EvidenceChallenge(p:Task){
 if(!p.state.evidenceChosen)return <Choice {...p} complete={()=>p.patch({evidenceChosen:true,feedback:'',wrong:false})} options={['观察到使用AI学习系统的人平均成绩更高','随机分配到AI组与普通组后，AI组平均成绩更高','两种证据完全一样，不需要关心分配方式']} correct={1} reason="再说清楚：随机分配为什么提供更强的证据？"/>;
 return <><div className="premise"><b>你的选择：随机分配后的比较</b><p>请给出理由，而不是只记住「随机」这个词。</p></div><Choice {...p} field="evidenceReason" prompt="随机分配为什么能提供更强的证据？" options={['随机分配减少原有水平、动机等背景对进入哪组的系统性影响；仍需检查样本和实施质量','只要随机分配，两组每个特征在有限样本中都必然完全相同','有了随机分配，就不用记录学习结果']} correct={0} reason="更强的证据来自分配机制的改变：背景不再系统性地决定谁进入哪组；但仍需检查有限样本误差与实验质量。"/></>;
}
function Reflection(p:Task&{initial:string}){
 const text=String(p.state.reflection||'');
 return <div className="reflection-task"><div className="reflection-context"><span>1973年伯克利全校总体录取率</span><b>男性约44% <i>女性约35%</i></b><small>这仍然是全校背景，不是A/D切片的合并率。</small></div><TaskLead>{p.prompt}</TaskLead><div className="reflection-columns"><div className="old-judgement"><span>刚进入城市时，你的判断</span><blockquote>{p.initial||'尚未记录初始判断（可在教师模式查看首幕）。'}</blockquote></div><label className="open-answer"><span>现在，你会怎样描述这组数据？</span><textarea value={text} onChange={e=>p.patch({reflection:e.target.value})} placeholder="用自己的话描述：数据支持什么？院系构成会带来什么影响？哪些因果结论仍不能直接得到？"/></label></div><div className="reflection-guide"><b>表达检查 · 不按关键词自动判卷</b><span>是否描述了事实？是否提及条件与构成？是否保留了因果边界？</span></div><button className="primary" disabled={!text.trim()} onClick={()=>p.complete('你的最终判断已保存。重要的变化是：你现在知道一个比例能支持什么、还不能支持什么。')}>保存我的新判断 <Check size={16}/></button></div>;
}
const CHAIN=['数据','关联','条件','隐藏结构','因果假设','因果图','混杂','控制','效应估计'];
function KnowledgeChain(p:Task){
 const selected=Array.isArray(p.state.chain)?p.state.chain:[];
 const append=(v:string)=>{if(!selected.includes(v))p.patch({chain:[...selected,v],feedback:''});};
 const check=()=>{
  if(selected.length<CHAIN.length){p.patch({wrong:true,feedback:'还有 '+(CHAIN.length-selected.length)+' 个词块没有放进路线。'});return;}
  const firstWrong=selected.findIndex((v,i)=>v!==CHAIN[i]);
  if(firstWrong<0){p.patch({feedback:'完整路线已经连通。效应估计仍要接受机制假设和证据边界的检查。',wrong:false});p.complete();return;}
  p.patch({wrong:true,feedback:firstWrong===0?'第一步还不对：这条路线要从最原始的东西开始——我们最先拿到的是什么？':'前 '+firstWrong+' 步的顺序是对的，从第 '+(firstWrong+1)+' 步开始再看看。点掉放错的词块可以重排。'});
 };
 return <div><TaskLead>{p.prompt}</TaskLead><p className="micro">点下方词块把它接到路线末尾，也可以直接拖进路线区域。点路线里的词块可以把它拿回来。</p><div className="knowledge-route" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const v=e.dataTransfer.getData('text/plain');if(CHAIN.includes(v))append(v);}}>{selected.length?selected.map((v,i)=><button key={v} className="route-step" aria-label={'把「'+v+'」移出路线'} onClick={()=>p.patch({chain:selected.filter(x=>x!==v),feedback:''})}><b>{String(i+1).padStart(2,'0')}</b>{v}<X size={13}/></button>):<small>从「看见什么」开始……</small>}</div><div className="word-pool">{[3,7,1,5,0,8,2,6,4].map(i=><button key={i} draggable onDragStart={e=>e.dataTransfer.setData('text/plain',CHAIN[i])} disabled={selected.includes(CHAIN[i])} onClick={()=>append(CHAIN[i])}>{CHAIN[i]}</button>)}</div><div className="action-row"><button className="secondary" disabled={!selected.length} onClick={()=>p.patch({chain:[],feedback:''})}><Undo2 size={14}/>清空重排</button><button className="primary" onClick={check}>连通知识路线 <Check size={16}/></button></div><Feedback state={p.state}/></div>;
}
export function downloadNote(initial:string,reflection:string,completed:number){
 const text='# 反转之城 · 我的调查手记\n\n完成学习任务：'+completed+' / 40\n\n## 初始判断\n'+(initial||'未记录')+'\n\n## 最终判断\n'+(reflection||'尚未填写')+'\n\n## 三条原则\n- 相关不等于因果。\n- 总体不等于同条件比较。\n- 控制变量之前，先理解结构。\n\n本课程使用伯克利历史数据切片与明确标注的教学模拟；因果解释依赖模型与可比性等假设。\n';
 const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='反转之城-我的调查手记.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function Ending(p:Task&{initial:string;finalReflection:string;completed:number}){
 const principles=['相关 ≠ 因果','总体 ≠ 同条件比较','控制变量之前，先理解结构'];
 return <div className="ending"><div className="ending-mark"><Flag size={32}/></div><span className="small-cap">THE CITY IS OPEN AGAIN</span><h2>数据告诉你，哪些事情一起发生。<br/><em>因果追问，改变以后会怎样。</em></h2><p className="task-lead">{p.prompt}</p><div className="principles">{principles.map((v,i)=><label key={v} className={p.state['principle'+i]?'selected':''}><input type="checkbox" checked={!!p.state['principle'+i]} onChange={e=>p.patch({['principle'+i]:e.target.checked})}/><span>{v}</span></label>)}</div><p>数学的价值，不只是算出一个比例，<br/>而是判断：这个比例究竟能够说明什么。</p><div className="action-row"><button className="primary" disabled={![0,1,2].every(i=>p.state['principle'+i])} onClick={()=>p.complete('40幕调查完成。城市恢复运转，你的思考继续。')}>带走三条原则 <Flag size={16}/></button><button className="secondary" onClick={()=>downloadNote(p.initial,p.finalReflection,p.completed)}><Download size={16}/>保存调查手记</button></div></div>;
}
export function SceneTask({id,initial,finalReflection,completed,...rest}:TaskProps&{id:number;initial:string;finalReflection:string;completed:number}){
 const p={...rest,prompt:SCENES[id-1].prompt};
 if(id===1)return <Opening {...rest}/>;
 if(id===2)return <Classify {...p} labels={['数据已经支持','目前尚未支持']} items={[{text:'A院系中女性录取率更高。',category:0},{text:'D院系中女性录取率更高。',category:0},{text:'A+D合并后男性录取率更高。',category:0},{text:'某种具体的招生偏好导致了这些差异。',category:1}]} explanation="现象已经确认，但原因仍然未知。事实与解释要分开。"/>;
 if(id===3)return <>{!p.state.raw?<Choice {...p} complete={()=>p.patch({raw:true,feedback:''})} options={['校园照片与申请者姓名','性别×院系×录取/未录取的原始人数','只有已经算好的百分比']} correct={1} reason="找到了可以重新核验的分子和分母。"/>:<><RawTable/><button className="primary" onClick={()=>p.complete('原始计数让我们可以独立核验百分比。')}>收好原始底稿 <Check size={16}/></button></>}</>;
 if(id===4)return <RecordViews {...p}/>;
 if(id===5)return <FilterTask {...p}/>;
 if(id===6)return <><div className="formula-reveal"><MathText tex={'P(E\\mid B)=\\frac{P(E\\cap B)}{P(B)},\\quad P(B)>0'} block/><p>条件概率：在条件 B 限定的范围里，目标事件 E 所占的比例。这里的 B 就是「性别＋院系」这两个条件。</p></div><RawTable showRates={p.done}/><Calculate {...p} fields={[{key:'maleA',label:'A院系男性录取率',expected:RATES.maleA*100,tex:'P(R\\mid M,C=\\mathrm A)=\\frac{512}{825}'},{key:'femaleD',label:'D院系女性录取率',expected:RATES.femaleD*100,tex:'P(R\\mid F,C=\\mathrm D)=\\frac{131}{375}'},{key:'maleD',label:'D院系男性录取率',expected:RATES.maleD*100,tex:'P(R\\mid M,C=\\mathrm D)=\\frac{138}{417}'}]} explanation="分层复核完成：A中女性约82.4%高于男性62.1%；D中女性约34.9%高于男性33.1%。"/></>;
 if(id===7)return <Choice {...p} options={['将82.4%和34.9%直接平均','把A、D女性录取人数相加，再除以女性申请总数','只取人数更多的D院系录取率']} correct={1} reason="总体比例需要按人数加权；不同大小的组不能一律各占一半。"/>;
 if(id===8)return <><RawTable/><Calculate {...p} fields={[{key:'maleTotal',label:'合并后男性录取率',expected:GROUP_TOTALS.M.rate*100,tex:'\\frac{512+138}{825+417}'},{key:'femaleTotal',label:'合并后女性录取率',expected:GROUP_TOTALS.F.rate*100,tex:'\\frac{89+131}{108+375}'}]} explanation="反转已确认：分层女性更高，但合并后男性约52.3%，女性约45.5%。不是算错，下一步检查权重。"/></>;
 if(id===9)return <><TaskLead>{p.prompt}</TaskLead><div className="twin-ratios"><RatioBar label="男性申请构成" share={HISTORICAL_WEIGHTS.x} detail="高录取率A"/><RatioBar label="女性申请构成" share={HISTORICAL_WEIGHTS.y} detail="高录取率A"/></div><p className="micro">青绿=A院系；杏色=D院系。A整体比D更容易录取。</p><Choice {...p} prompt="" options={['男性更集中在高录取率A院系','女性更集中在高录取率A院系','两类申请者的院系构成完全相同']} correct={0} reason="你发现了结构差异：男女申请院系所占的比例不同。"/></>;
 if(id===10)return <WeightsLab {...p}/>;
 if(id===11)return <FormulaPuzzle {...p}/>;
 if(id===12)return <><ConceptReveal en="SIMPSON’S PARADOX" zh="辛普森悖论" definition="分组时呈现出的一种趋势，在合并之后可能减弱、消失，甚至完全反过来。"/><Choice {...p} options={['平均数都不值得相信','总体关联可能隐藏条件结构','分组后的结果永远可以直接当成因果']} correct={1} reason="第一件事不是否定平均数，而是追问总体隐藏了什么条件与权重。"/></>;
 if(id===13)return <StatisticalVsCausal {...p}/>;
 if(id===14)return <Association {...p}/>;
 if(id===15)return <Classify {...p} labels={['相关问题','因果问题']} items={[{text:'使用某种审核方式的人，录取率是否更高？',category:0},{text:'同样类型的申请者改用这种审核方式，录取概率是否会提高？',category:1}]} explanation="因果问题关心的是：其他条件可比时，改变一个因素会怎样。"/>;
 if(id===16)return <><div className="dataset-passport"><span>你正在进入</span><h2>审核制度 · 教学模拟</h2><p>T=1：匿名审核　T=0：传统审核<br/>H/L：高/低录取率院系</p><b>从这里开始，不是1973年真实数据。</b></div><div className="premise"><b>为什么要换一个因素？</b><p>因果问题要设想「同一个人，只改变一件事」。但性别不是能这样切换的东西——我们没办法让同一位申请者「换一个性别再申请一次」。</p><p>审核制度不一样：学校真的可以把传统审核换成匿名审核。所以从这里开始，我们研究一个能被改变的因素。</p></div><Choice {...p} options={['把历史中的性别当成一个随意切换的开关','研究可以改变的审核方案，并明确标注模拟假设','继续把所有数字称为伯克利原始记录']} correct={1} reason="新的问题使用可干预的审核制度，并与历史数据分开标记。"/></>;
 if(id===17)return <Choice {...p} options={['节点代表变量，箭头表达机制的因果假设','箭头自动由相关系数决定','两个节点只要连起来，就说明因果已经证明']} correct={0} reason="因果图把假设画出来，供我们检查、讨论与分析。它不是相关系数的自动翻译。"/>;
 if(id===18)return <><TaskLead>{p.prompt}</TaskLead><GraphTask {...p} variant="simple" expected={['T>R']}/></>;
 if(id===19)return <><PolicyTable training/><Calculate {...p} fields={[{key:'anonymous',label:'匿名审核总体录取率',expected:observed(DATASETS.training).r1*100},{key:'traditional',label:'传统审核总体录取率',expected:observed(DATASETS.training).r0*100}]} explanation="每层匿名都更高，总体匿名36%却低于传统56%。我们要检查是谁在改变这场比较。"/></>;
 if(id===20)return <Confounding {...p}/>;
 if(id===21)return <Trace {...p}/>;
 if(id===22)return <><GraphBoard edges={graphEdges(false,false)} readOnly/><Choice {...p} options={['T：审核方案','C：申请院系','R：录取结果']} correct={1} reason="在同一院系条件下比较方案，可以减少院系构成带来的干扰。"/></>;
 if(id===23)return <><PolicyTable training/><Calculate {...p} fields={[{key:'hDiff',label:'H院系：匿名减传统',expected:(DATASETS.training.h1-DATASETS.training.h0)*100,unit:'个百分点'},{key:'lDiff',label:'L院系：匿名减传统',expected:(DATASETS.training.l1-DATASETS.training.l0)*100,unit:'个百分点'}]} explanation="固定院系后，H中高15个百分点，L中高5个百分点。控制是同条件比较，不是删除变量。"/></>;
 if(id===24)return <><PolicyTable training/><p className="micro">上表是原始观察构成；下面保持组内率不变，把两种方案都放到共同的目标人群中。</p><WorldsLab {...p} data={DATASETS.training}/></>;
 if(id===25)return <><Assumptions/><FunctionExplorer data={DATASETS.training} lambda={Number(p.state.lambda??.5)} onChange={lambda=>p.patch({lambda})}/><MathText tex={'R_1(\\lambda)=0.25+0.55\\lambda,\\quad R_0(\\lambda)=0.20+0.45\\lambda'} compactTex={'\\begin{aligned}R_1(\\lambda)&=0.25+0.55\\lambda\\\\R_0(\\lambda)&=0.20+0.45\\lambda\\end{aligned}'} block/><Calculate {...p} fields={[{key:'tau0',label:'τ(λ)常数项',expected:standardize(DATASETS.training,0).tau,unit:'',tolerance:1e-6},{key:'tau1',label:'τ(λ)的λ系数',expected:standardize(DATASETS.training,1).tau-standardize(DATASETS.training,0).tau,unit:'',tolerance:1e-6},{key:'min',label:'效应最小值',expected:standardize(DATASETS.training,0).tau*100,unit:'个百分点'},{key:'max',label:'效应最大值',expected:standardize(DATASETS.training,1).tau*100,unit:'个百分点'}]} explanation="τ(λ)=.05+.10λ；在0≤λ≤1及模型假设下，效应为5—15个百分点，始终为正。"/></>;
 if(id===26)return <StandardizeChoice {...p}/>;
 if(id>=27&&id<=31)return <ExamPractice {...p} question={id-26}/>;
 if(id===32)return <><TaskLead>{p.prompt}</TaskLead><GraphBoard variant="unmeasured" edges={graphEdges(false,true)} readOnly highlight={['U>T','U>R']}/><Choice {...p} prompt="" options={['控制C就消除了所有可能的混杂','T←U→R 仍可能混杂审核方式与录取','U影响结果，所以必须删除结果R']} correct={1} reason="控制C没有处理经过U的另一条绕行路径。因果判断仍需要检查遗漏的因素。"/></>;
 if(id===33)return <Randomization {...p}/>;
 if(id===34)return <><p className="micro">这里X、Y是研究因素与结果，Z表示第三个变量，含义取决于具体情境。</p><Classify {...p} labels={['直接因果','混杂','中介']} items={[{text:'X → Y',category:0},{text:'X ← Z → Y',category:1},{text:'X → Z → Y',category:2}]} explanation="分层用到的变量不自动就是混杂。若假设G→C→R，则院系C可能处在中介路径上。"/></>;
 if(id===35)return <><p className="case-observation">观察到：参加晚自习的学生，平均成绩反而更低。这能直接说明晚自习有害吗？</p><div className="premise">情境假设：原有学习困难Z影响是否参加晚自习X，也影响后续成绩Y；我们研究X是否影响Y。</div>{!p.state.graphDone?<><TaskLead>{p.prompt}</TaskLead><GraphTask {...p} variant="school" expected={['Z>X','Z>Y','X>Y']} complete={()=>p.patch({graphDone:true,feedback:''})}/></>:<><GraphBoard variant="school" edges={['Z>X','Z>Y','X>Y']} readOnly/><Choice {...p} prompt="要分析晚自习的真实效果，首先应该警惕哪个变量？" options={['先警惕原有学习困难Z','直接认定晚自习降低成绩','把之后的成绩删掉']} correct={0} reason="观察到参加者成绩较低，可能混入了原有学习困难的影响，不能直接解释为晚自习有害。"/></>}</>;
 if(id===36)return <EvidenceChallenge {...p}/>;
 if(id===37)return <Reflection {...p} initial={initial}/>;
 if(id===38)return <Classify {...p} labels={['条件概率','全概率 / 加权平均','参数','一次函数与范围']} items={[{text:'锁定女性且申请A，再计算录取比例',category:0},{text:'从各院系录取率恢复总体结果',category:1},{text:'调整不同院系在群体中的占比',category:2},{text:'研究τ(λ)随目标人群结构如何变化',category:3}]} explanation="你使用的是高中数学工具，关键是知道当前问题需要哪一个。"/>;
 if(id===39)return <KnowledgeChain {...p}/>;
 return <Ending {...p} initial={initial} finalReflection={finalReflection} completed={completed}/>;
}
