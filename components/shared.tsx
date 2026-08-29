'use client';
import { useId, useRef, useEffect } from 'react';
import katex from 'katex';
import { Check, ArrowRight, Lightbulb, GripVertical, BookOpen } from 'lucide-react';
import { SYMBOLS } from '../content/symbols';
import { RAW, GROUP_TOTALS, APPLICANTS, near, percent, displayPercent, type SceneState } from '../lib/domain';
export type TaskProps={state:SceneState;patch:(p:SceneState)=>void;complete:(message?:string)=>void;done:boolean};
export function MathText({tex,block=false,compactTex}:{tex:string;block?:boolean;compactTex?:string}){
 if(compactTex)return <><span className="equation-wide"><MathText tex={tex} block={block}/></span><span className="equation-compact"><MathText tex={compactTex} block={block}/></span></>;
 const html=katex.renderToString(tex,{displayMode:block,throwOnError:false,output:'htmlAndMathml',trust:false});
 return <span className={'math '+(block?'math-block':'')} dangerouslySetInnerHTML={{__html:html}}/>;
}
// Collapsed by default so the task stays above the fold; opened automatically on the
// scene where one of these letters shows up for the first time.
export function SymbolNote({names,open=false}:{names:string[];open?:boolean}){
 const unique=[...new Set(names)].filter(n=>SYMBOLS[n]);
 if(!unique.length)return null;
 return <details className="symbol-note" open={open}>
  <summary><BookOpen size={14}/><strong>公式里的字母</strong><span>{unique.map(n=>SYMBOLS[n].mark).join('　')}</span></summary>
  <div className="symbol-items">{unique.map(n=>{const s=SYMBOLS[n];return <div key={n}><b>{s.mark}</b><span>{s.meaning}</span><small>{s.example}</small></div>;})}</div>
 </details>;
}
export function ConceptReveal({en,zh,definition,note}:{en:string;zh:string;definition:string;note?:string}){
 return <div className="concept-title"><span>{en}</span><h2>{zh}</h2><p>{definition}</p>{note&&<small>{note}</small>}</div>;
}
export function TaskLead({children}:{children:React.ReactNode}){return <p className="task-lead">{children}</p>;}
export function Feedback({state}:{state:SceneState}){
 return state.feedback?<div role="status" className={'feedback '+(state.wrong?'reflect':'success')}><Lightbulb size={18}/><span>{String(state.feedback)}</span></div>:null;
}
export function Choice({options,correct,reason,wrongReason,field='choice',prompt,...p}:TaskProps&{options:string[];correct:number;reason:string;wrongReason?:string;field?:string;prompt?:string}){
 const selected=Number(p.state[field]??-1);
 return <div className="choice-task">{prompt&&<TaskLead>{prompt}</TaskLead>}<div className="choice-grid">{options.map((v,i)=><button key={v} className={'choice-option '+(selected===i?'selected':'')} aria-pressed={selected===i} onClick={()=>p.patch({[field]:i,feedback:'',wrong:false})}><span className="option-index">{String.fromCharCode(65+i)}</span><span>{v}</span>{selected===i&&<Check size={17}/>}</button>)}</div><button className="primary" disabled={selected<0} onClick={()=>{const ok=selected===correct;p.patch({feedback:ok?reason:wrongReason||'这个判断漏掉了一个条件。请对照人群、数据范围或机制假设再想一想。',wrong:!ok});if(ok)p.complete(reason);}}>确认判断 <ArrowRight size={16}/></button><Feedback state={p.state}/></div>;
}
export function NumberField({label,value,onChange,unit='%',placeholder='填写数值'}:{label:string;value:string;onChange:(v:string)=>void;unit?:string;placeholder?:string}){
 const id=useId();return <label className="number-field" htmlFor={id}><span>{label}</span><div><input id={id} type="text" inputMode="decimal" autoComplete="off" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/><b>{unit}</b></div></label>;
}
export type Calculation={key:string;label:string;expected:number;unit?:string;tex?:string;tolerance?:number};
export function Calculate({fields,explanation,prompt,...p}:TaskProps&{fields:Calculation[];explanation:string;prompt?:string}){
 return <div>{prompt&&<TaskLead>{prompt}</TaskLead>}<div className="calculation-fields">{fields.map(f=><div key={f.key} className="calculation-item">{f.tex&&<MathText tex={f.tex} block/>}<NumberField label={f.label} value={String(p.state[f.key]??'')} onChange={v=>p.patch({[f.key]:v,feedback:'',wrong:false})} unit={f.unit??'%'}/></div>)}</div><p className="micro">百分数只填数值，例如 61.7；小数系数填 0.52。留空不当作 0。</p><button className="primary" onClick={()=>{const ok=fields.every(f=>near(p.state[f.key],f.expected,f.tolerance??.051,(f.unit??'%')==='%'));p.patch({feedback:ok?explanation:'请核对分母是否属于当前条件，以及填的是百分数还是小数。百分数可以保留一位小数。',wrong:!ok});if(ok)p.complete(explanation);}}>核验计算 <Check size={16}/></button><Feedback state={p.state}/></div>;
}
export function Classify({items,labels,explanation,prompt,...p}:TaskProps&{items:{text:string;category:number}[];labels:string[];explanation:string;prompt?:string}){
 const at=(i:number)=>{const v=p.state['class_'+i];return v===undefined||v===''?-1:Number(v);};
 const move=(i:number,c:number)=>p.patch({['class_'+i]:c,feedback:''});
 const pending=items.map((_,i)=>i).filter(i=>at(i)<0);
 const check=()=>{
  if(pending.length){p.patch({feedback:'还有 '+pending.length+' 条陈述没有归类。',wrong:true});return;}
  const mismatch=items.findIndex((v,i)=>at(i)!==v.category);
  p.patch({feedback:mismatch<0?explanation:'再检查这一条：「'+items[mismatch].text+'」。它更符合哪一类的定义？',wrong:mismatch>=0});
  if(mismatch<0)p.complete(explanation);
 };
 return <div className="classification">{prompt&&<TaskLead>{prompt}</TaskLead>}
  <div className="classify-targets">{labels.map((label,c)=>{const held=items.map((v,i)=>({v,i})).filter(({i})=>at(i)===c);
   return <div key={label} className="drop-target" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const i=Number(e.dataTransfer.getData('text/plain'));if(Number.isInteger(i)&&i>=0&&i<items.length)move(i,c);}}><b>{label}</b>
    <div className="target-items">{held.length?held.map(({v,i})=><span key={v.text} draggable onDragStart={e=>e.dataTransfer.setData('text/plain',String(i))}>{v.text}<button aria-label={'把这条移出'+label} onClick={()=>p.patch({['class_'+i]:'',feedback:''})}>×</button></span>):<small>把陈述拖到这里，或用下方选单归类</small>}</div>
   </div>;})}</div>
  <div className="statement-list">{pending.length?pending.map(i=><div key={items[i].text} className="statement" draggable onDragStart={e=>e.dataTransfer.setData('text/plain',String(i))}><GripVertical size={16}/><span>{items[i].text}</span><select aria-label={'把第'+(i+1)+'条陈述归类'} value="" onChange={e=>move(i,Number(e.target.value))}><option value="" disabled>选择归类</option>{labels.map((v,c)=><option value={c} key={v}>{v}</option>)}</select></div>):<p className="micro">全部归类完成。点分类框里的 × 可以拿回来重新放。</p>}</div>
  <button className="primary" onClick={check}>检查分类 <Check size={16}/></button><Feedback state={p.state}/></div>;
}
export function RawTable({aggregate=false,showRates=true}:{aggregate?:boolean;showRates?:boolean}){
 return <div className="table-wrap"><table><caption>{aggregate?'A+D 合并计数':'A/D 原始计数 · 共1725份申请记录'}</caption><thead><tr>{!aggregate&&<th>院系</th>}<th>群体</th><th>录取</th><th>未录取</th><th>申请总数</th>{showRates&&<th>录取率</th>}</tr></thead><tbody>{aggregate?Object.values(GROUP_TOTALS).map(g=><tr key={g.gender}><th>{g.gender==='F'?'女性':'男性'}</th><td>{g.admitted}</td><td>{g.rejected}</td><td>{g.admitted+g.rejected}</td>{showRates&&<td>≈{percent(g.admitted/(g.admitted+g.rejected))}</td>}</tr>):RAW.map(g=><tr key={g.department+g.gender}><th>{g.department}</th><th>{g.gender==='F'?'女性':'男性'}</th><td>{g.admitted}</td><td>{g.rejected}</td><td>{g.admitted+g.rejected}</td>{showRates&&<td>≈{percent(g.admitted/(g.admitted+g.rejected))}</td>}</tr>)}</tbody></table></div>;
}
export function ApplicantCanvas({female,a,admitted}:{female:boolean;a:boolean;admitted:boolean}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{const ctx=ref.current?.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,1000,280);APPLICANTS.forEach((p,i)=>{const active=(!female||p.gender==='F')&&(!a||p.department==='A')&&(!admitted||p.admitted);ctx.fillStyle=active?(p.admitted?'#287b7b':'#c58959'):'#e5e6db';ctx.beginPath();ctx.arc(8+(i%75)*13.1,8+Math.floor(i/75)*11.4,active?3.5:2.6,0,Math.PI*2);ctx.fill();});},[female,a,admitted]);
 return <div className="applicant-view"><canvas ref={ref} width={1000} height={280} aria-label="1725个固定位置的申请记录点，筛选时不增删记录"/><p className="micro">每点=1份记录 · 青绿=录取 · 杏色=未录取 · 灰色=不在当前条件内。</p></div>;
}
export function RatioBar({label,share,detail}:{label:string;share:number;detail?:string}){
 return <div className="ratio-row"><div><b>{label}</b><span>{detail||'第一类占比'}</span><strong>{displayPercent(share)}</strong></div><div className="ratio-track" aria-label={label+'，'+percent(share)}><i style={{width:percent(share,5)}}/><i style={{width:percent(1-share,5)}}/></div></div>;
}
export function Assumptions(){return <aside className="assumptions"><strong>因果解释的前提</strong><span>同院系内两组申请者可比；两种方案都有可比较的数据；方案定义保持一致。</span><small>不满足时，只能称标准化统计差异，不能自动称因果效应。</small></aside>;}
