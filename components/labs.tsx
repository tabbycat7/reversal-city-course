'use client';
import { useState, useMemo } from 'react';
import { ReactFlow, Handle, Position, MarkerType, useNodesState, type NodeProps, type Node } from '@xyflow/react';
import { Link2, RotateCcw, Check, Minus, Plus, Eraser } from 'lucide-react';
import { createsCycle, edgesMatch, graphEdges, mixHistorical, HISTORICAL_WEIGHTS, equilibriumX, standardize, percent, displayPercent, type Dataset } from '../lib/domain';
import { MathText, Feedback, RatioBar, Assumptions, TaskLead, type TaskProps } from './shared';
type VariableData={symbol:string;label:string};
function Variable({data}:NodeProps<Node<VariableData>>){return <div className="variable-node"><Handle type="target" position={Position.Left}/><b>{data.symbol}</b><span>{data.label}</span><Handle type="source" position={Position.Right}/></div>;}
const nodeTypes={variable:Variable};
export function GraphBoard({edges,onChange,variant='admissions',highlight=[],readOnly=false}:{edges:string[];onChange?:(v:string[])=>void;variant?:'admissions'|'simple'|'unmeasured'|'school';highlight?:string[];readOnly?:boolean}){
 const defs=useMemo(()=>variant==='school'?[['Z','原有学习困难',220,30],['X','参加晚自习',30,190],['Y','之后的成绩',410,190]]:variant==='simple'?[['T','审核方式',60,110],['R','录取结果',390,110]]:[['C','申请院系',220,25],['T','审核方式',30,185],['R','录取结果',410,185],...(variant==='unmeasured'?[['U','申请材料质量',220,330]]:[])],[variant]);
 const initial=defs.map(d=>({id:String(d[0]),type:'variable',position:{x:Number(d[2]),y:Number(d[3])},data:{symbol:String(d[0]),label:String(d[1])}}));
 const [nodes,,onNodesChange]=useNodesState(initial);
 const [from,setFrom]=useState(''),[to,setTo]=useState(''),[error,setError]=useState('');
 const add=(a:string,b:string)=>{
  if(!onChange)return;
  if(!a||!b){setError('请先选择箭头的起点和终点。');return;}
  if(a===b){setError('起点和终点不能是同一个变量。');return;}
  if(edges.includes(a+'>'+b)){setError('这条箭头已经存在了。');return;}
  if(createsCycle(edges,a,b)){setError('这会形成一个循环。本任务使用无环的因果假设图，请检查方向。');return;}
  setError('');onChange([...edges,a+'>'+b]);
 };
 const flowEdges=edges.map(e=>({id:e,source:e.split('>')[0],target:e.split('>')[1],type:'smoothstep',animated:highlight.includes(e),style:{stroke:highlight.includes(e)?'#d47543':'#56887d',strokeWidth:highlight.includes(e)?3.5:2},markerEnd:{type:MarkerType.ArrowClosed,color:highlight.includes(e)?'#d47543':'#56887d',width:19,height:19}}));
 return <div className="graph-board"><div className={'graph-canvas '+(variant==='unmeasured'?'graph-tall':'')}><ReactFlow nodes={nodes} edges={flowEdges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onConnect={c=>add(c.source,c.target)} nodesConnectable={!readOnly} nodesDraggable={false} fitView minZoom={.45} maxZoom={1.4} zoomOnScroll={false} panOnScroll={false} preventScrolling={false} onEdgesDelete={del=>onChange?.(edges.filter(e=>!del.some(d=>d.id===e)))} ariaLabelConfig={{'node.a11yDescription.default':'按Tab选择节点。也可以用下方的连接器创建箭头。','edge.a11yDescription.default':'箭头表示机制假设。'}}/></div>
 {!readOnly&&<div className="graph-tools"><label>从<select aria-label="箭头起点" value={from} onChange={e=>{setFrom(e.target.value);setError('');}}><option value="">选择起点</option>{defs.map(d=><option value={String(d[0])} key={String(d[0])}>{d[0]} · {d[1]}</option>)}</select></label><span>→</span><label>到<select aria-label="箭头终点" value={to} onChange={e=>{setTo(e.target.value);setError('');}}><option value="">选择终点</option>{defs.map(d=><option value={String(d[0])} key={String(d[0])}>{d[0]} · {d[1]}</option>)}</select></label><button className="secondary" onClick={()=>add(from,to)}><Link2 size={15}/>连接箭头</button>{error&&<p role="status" className="micro error">{error}</p>}</div>}
 <div className="edge-list" aria-label="当前图中箭头">{edges.length?<>{edges.map(e=><span key={e}>{e.replace('>',' → ')}{!readOnly&&<button aria-label={'移除'+e.replace('>','到')+'的箭头'} onClick={()=>onChange?.(edges.filter(x=>x!==e))}>×</button>}</span>)}{!readOnly&&<button className="text-button" onClick={()=>{setError('');onChange?.([]);}}><Eraser size={14}/>清空全部</button>}</>:<small>图中还没有箭头。用上方的连接器选择起点和终点，或者拖动节点两侧的连接点。</small>}</div></div>;
}
export function GraphTask({expected,variant='admissions',...p}:TaskProps&{expected:string[];variant?:'admissions'|'simple'|'school'}){
 const edges=Array.isArray(p.state.edges)?p.state.edges:[];
 return <div><GraphBoard edges={edges} variant={variant} onChange={v=>p.patch({edges:v,feedback:'',wrong:false})}/><button className="primary" onClick={()=>{const ok=edgesMatch(edges,expected);p.patch({feedback:ok?'机制假设已经连好。箭头描述的是我们提出的方向，下一步才是用数据和设计去研究它。':'请核对每条箭头的方向和数量。既要包含研究目标，也要包含题目明确给出的背景影响。',wrong:!ok});if(ok)p.complete();}}>核验机制图 <Check size={16}/></button><Feedback state={p.state}/></div>;
}
const GATE_GOALS=[{id:'within',label:'总体仍是女性更高（没有反转）'},{id:'reversed',label:'总体变成男性更高（出现反转）'},{id:'equal',label:'两者恰好相等（临界平衡）'}];
export function WeightsLab(p:TaskProps&{prompt?:string}){
 const stored={x:Number(p.state.x??HISTORICAL_WEIGHTS.x),y:Number(p.state.y??HISTORICAL_WEIGHTS.y)};
 // The slider only moves a local draft; the save is written once the student lets go.
 const [draft,setDraft]=useState<{x:number;y:number}|null>(null);
 const x=draft?draft.x:stored.x,y=draft?draft.y:stored.y,result=mixHistorical(x,y);
 const seen=Array.isArray(p.state.seen)?p.state.seen:[];
 const apply=(a:number,b:number)=>{
  setDraft(null);
  const next=[...new Set([...seen,mixHistorical(a,b).direction])];
  p.patch({x:a,y:b,seen:next});
  if(GATE_GOALS.every(g=>next.includes(g.id)))p.complete('你让同一套组内录取率产生了三种总体结果。改变的只是权重，不是组内录取率。');
 };
 const commit=()=>{if(draft)apply(draft.x,draft.y);};
 return <div className="weights-lab">{p.prompt&&<TaskLead>{p.prompt}</TaskLead>}<div className="lab-banner"><span>固定四个组内率</span><span>A 男62.1% / 女82.4% · D 男33.1% / 女34.9%（约）</span></div><div className="gate-controls">{[{name:'男性分流闸门',v:x,letter:'x',key:'x' as const},{name:'女性分流闸门',v:y,letter:'y',key:'y' as const}].map(d=><div className="gate" key={d.name}><div><span>{d.name}</span><b>{d.letter} ≈ {(d.v*100).toFixed(1)}% 申请A</b></div><RatioBar label="申请 A / D" share={d.v} detail="A院系占比"/><input aria-label={d.name} type="range" min={0} max={100} step={.1} value={d.v*100} onChange={e=>{const v=Number(e.target.value)/100;setDraft({x:d.key==='x'?v:x,y:d.key==='y'?v:y});}} onPointerUp={commit} onKeyUp={commit} onBlur={commit}/><div className="range-ends"><span>全部去 D</span><span>全部去 A</span></div></div>)}</div>
 <div className="preset-row"><button className="secondary" onClick={()=>apply(HISTORICAL_WEIGHTS.x,HISTORICAL_WEIGHTS.y)}><RotateCcw size={14}/>恢复原始构成</button><button className="secondary" onClick={()=>apply(.5,.5)}>统一构成</button><button className="secondary" onClick={()=>apply(equilibriumX(.25),.25)}>临界平衡</button></div>
 <div className="result-dials"><div><span>男性总体</span><strong><small>≈</small>{percent(result.male,2)}</strong></div><b className="relation">{result.direction==='equal'?'=':result.diff>0?'>':'<'}</b><div><span>女性总体</span><strong><small>≈</small>{percent(result.female,2)}</strong></div><p className={'verdict '+result.direction}>{result.direction==='equal'?'到达临界：总体相等':result.direction==='reversed'?'出现反转：总体男性更高':'未反转：总体女性更高'}</p></div>
 <div className="observation-checklist"><b>三种结果都亲眼见过，这一幕就完成了</b><ul>{GATE_GOALS.map(g=><li key={g.id} className={seen.includes(g.id)?'seen':''}>{seen.includes(g.id)?<Check size={14}/>:<i/>}{g.label}</li>)}</ul><small>三个预设按钮可以直接到达这三种情况；判定使用完整精度。权重不同不一定反转。</small></div></div>;
}
export function FunctionPlot({data,lambda}:{data:Dataset;lambda:number}){
 const x=(n:number)=>50+n*550,y=(n:number)=>210-n*185,r=standardize(data,lambda);
 return <svg className="function-plot" viewBox="0 0 660 260" role="img" aria-label={'共同权重λ='+lambda.toFixed(2)+'时，方案1录取率'+percent(r.r1,2)+'，方案0录取率'+percent(r.r0,2)+'，差'+(r.tau*100).toFixed(2)+'个百分点'}>
  {[0,.25,.5,.75,1].map(v=><g key={v}><line x1={50} x2={610} y1={y(v)} y2={y(v)} stroke="#d8dfd3"/><text x={5} y={y(v)+4} fontSize={11} fill="#687e73">{Math.round(v*100)}%</text></g>)}
  <polygon points={[x(0)+','+y(data.l1),x(1)+','+y(data.h1),x(1)+','+y(data.h0),x(0)+','+y(data.l0)].join(' ')} fill="#ddebdc"/>
  <line x1={50} y1={y(data.l1)} x2={600} y2={y(data.h1)} stroke="#277f80" strokeWidth={3}/>
  <line x1={50} y1={y(data.l0)} x2={600} y2={y(data.h0)} stroke="#cf8654" strokeWidth={3}/>
  <line x1={x(lambda)} x2={x(lambda)} y1={210} y2={20} stroke="#738d78" strokeDasharray="4 5"/>
  <line x1={x(lambda)} x2={x(lambda)} y1={y(r.r1)} y2={y(r.r0)} stroke="#466759" strokeWidth={3}/>
  <circle cx={x(lambda)} cy={y(r.r1)} r={6} fill="#277f80"/><circle cx={x(lambda)} cy={y(r.r0)} r={6} fill="#cf8654"/>
  <text x={48} y={231} fontSize={12} fill="#687e73">0</text><text x={570} y={231} fontSize={12} fill="#687e73">λ = 1</text>
  <text x={70} y={253} fontSize={12} fill="#277f80">青绿：方案1</text><text x={240} y={253} fontSize={12} fill="#af6b3e">杏色：方案0</text><text x={410} y={253} fontSize={12} fill="#466759">竖直间距：共同结构下的差值</text>
 </svg>;
}
export function FunctionExplorer({data,lambda,onChange}:{data:Dataset;lambda:number;onChange:(n:number)=>void}){
 const r=standardize(data,lambda);
 return <div className="function-explorer"><FunctionPlot data={data} lambda={lambda}/><label className="function-slider">拖动共同权重 λ = {lambda.toFixed(2)}<input aria-label="函数图共同权重" type="range" min={0} max={100} step={1} value={lambda*100} onChange={e=>onChange(Number(e.target.value)/100)}/></label><div className="preset-row">{[0,.5,1].map(v=><button className="secondary" key={v} onClick={()=>onChange(v)}>函数图 λ={v}</button>)}</div><p className="function-values">R₁(λ) ≈ {percent(r.r1,2)}　R₀(λ) ≈ {percent(r.r0,2)}　差值 ≈ {(r.tau*100).toFixed(2)} 个百分点</p><p className="micro">拖动竖线，观察同一个λ处两条线的距离。公式系数仍使用完整精度。</p></div>;
}
export function WorldsLab({data,prompt,...p}:TaskProps&{data:Dataset;prompt?:string}){
 const lambda=Number(p.state.lambda??.5),r=standardize(data,lambda),set=(n:number)=>{const v=Math.max(0,Math.min(1,n));p.patch({lambda:v,changed:!!p.state.changed||Math.abs(v-lambda)>1e-10});};
 return <div className="world-lab">{prompt&&<TaskLead>{prompt}</TaskLead>}<Assumptions/><div className="worlds">{[1,0].map((t)=><div className={'world world-'+t} key={t}><span className="world-label">平行世界 {t===1?'A':'B'} · 方案 {t}</span><h3>{data.id==='exam'?(t?'全部使用新方案':'全部使用原方案'):(t?'全部使用匿名审核':'全部使用传统审核')}</h3><div className="people-grid" aria-label={'H占'+percent(lambda)+'，L占'+percent(1-lambda)}>{Array.from({length:100},(_,i)=><i key={i} className={i<Math.round(lambda*100)?'group-h':'group-l'}/>)}</div><div className="world-composition"><span>H {percent(lambda,0)}</span><span>L {percent(1-lambda,0)}</span></div><div className="world-rate"><span>标准化录取率</span><strong>{displayPercent(t?r.r1:r.r0,1)}</strong></div></div>)}</div>
 <div className="lambda-control"><label htmlFor="lambda-slider">共同目标人群中 H 的比例 <b>λ = {lambda.toFixed(2)}</b></label><div><button aria-label="减少H比例" onClick={()=>set(lambda-.1)}><Minus size={15}/></button><input id="lambda-slider" type="range" min={0} max={100} step={1} value={lambda*100} onChange={e=>set(Number(e.target.value)/100)}/><button aria-label="增加H比例" onClick={()=>set(lambda+.1)}><Plus size={15}/></button></div><div className="preset-row">{[0,.5,1].map(v=><button className="text-button" key={v} onClick={()=>set(v)}>λ={v}</button>)}</div></div>
 <div className="weighted-construction"><span>同院系内的录取率 × 共同权重，再相加</span><MathText tex={'R_1(\\lambda)='+data.h1+'\\lambda+'+data.l1+'(1-\\lambda)'} block/><MathText tex={'R_0(\\lambda)='+data.h0+'\\lambda+'+data.l0+'(1-\\lambda)'} block/></div>
 <div className="effect-line"><span>同一结构下的差值</span><strong>+{(r.tau*100).toFixed(1)} <small>个百分点</small></strong></div>
 <p className="micro">每格代表目标人群的1%，颜色表示院系，不表示录取。两个世界的人数结构完全相同。</p><button className="primary" disabled={!p.state.changed} onClick={()=>p.complete('在两种方案中使用同一人群结构，再比较结果。这就是标准化；因果含义仍需前述假设。')}>已验证共同结构 <Check size={16}/></button></div>;
}
export function Randomization({prompt,...p}:TaskProps&{prompt?:string}){
 const randomized=!!p.state.randomized;
 return <div>{prompt&&<TaskLead>{prompt}</TaskLead>}<div className="segmented"><button aria-pressed={!randomized} className={!randomized?'active':''} onClick={()=>p.patch({randomized:false})}>观察性分配</button><button aria-pressed={randomized} className={randomized?'active':''} onClick={()=>p.patch({randomized:true,visitedRandom:true})}>随机分配</button></div><GraphBoard key={String(randomized)} edges={graphEdges(randomized,true)} readOnly variant="unmeasured" highlight={randomized?['C>R','U>R']:['C>T','U>T']}/><p className="micro">{randomized?'指向T的背景箭头消失了，但C、U仍然影响R。有限样本还可能偶然不平衡。':'院系C和材料质量U既影响谁采用哪种方案，也会影响录取。'}</p><button className="primary" disabled={!p.state.visitedRandom} onClick={()=>p.complete('随机分配改变的是处理分配机制，不会消除背景对结果的影响。')}>确认：背景仍影响结果 <Check size={16}/></button></div>;
}
