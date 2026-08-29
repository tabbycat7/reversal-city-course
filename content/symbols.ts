// High school students already read %, ≈, ≠ and ≤ fluently. Only the letters that
// appear inside this course's probability formulas need an explanation.
export const SYMBOLS:Record<string,{mark:string;meaning:string;example:string}>={
 probability:{mark:'P · R · F · M',meaning:'P是概率，R是「被录取」，F是女性，M是男性。',example:'P(R|F)：女性中被录取的比例。'},
 condition:{mark:'|  ·  ,',meaning:'竖线读「在……条件下」，逗号表示两个条件同时成立。',example:'P(R|F,C=A)：女性且申请A院系的人中，被录取的比例。'},
 department:{mark:'C = A / D',meaning:'C是「申请哪个院系」，A和D是两个院系的名字。',example:'C=A就是申请A院系。'},
 policyProbability:{mark:'P · R',meaning:'P是概率，R是「被录取」。',example:'P(R|T=1)：采用方案1的人中被录取的比例。'},
 policyCondition:{mark:'|  ·  ,',meaning:'竖线读「在……条件下」，逗号表示两个条件同时成立。',example:'P(R|T=1,C=H)：用方案1且申请H院系的人中，被录取的比例。'},
 treatment:{mark:'T = 1 / 0',meaning:'T是审核方案。1和0只是两个方案的编号，不表示效果大小。',example:'训练里1=匿名、0=传统；高考题里1=新方案、0=原方案。'},
 levels:{mark:'C = H / L',meaning:'C是院系，H是录取率较高的院系，L是较低的院系。',example:'H说的是院系好录取，不是学生水平高。'},
 outcome:{mark:'R',meaning:'R表示「被录取」这件事。',example:'因果图里的R节点就是录取结果。'},
 arrow:{mark:'→',meaning:'箭头读「可能影响」，是我们对现实机制提出的假设。',example:'T→R：改变审核方案，录取结果可能跟着变。'},
 association:{mark:'X · Y',meaning:'X是我们比较的因素，Y是观察到的结果。',example:'具体题目里X、Y各代表什么，题干会重新说明。'},
 lambda:{mark:'λ · 1−λ',meaning:'λ读「拉姆达」，是共同人群里H院系占的比例；剩下的1−λ是L院系。',example:'λ=0.5：H和L各占一半。'},
 functions:{mark:'R₁(λ) · R₀(λ)',meaning:'共同人群全部用方案1、全部用方案0时的总体录取率。下标是方案编号，不是乘法。',example:'R₁(0.5)：H占一半时，全部用方案1的录取率。'},
 tau:{mark:'τ(λ)',meaning:'τ读「陶」，是同一个人群下两种方案录取率的差。',example:'τ=0.08就是高8个百分点。'},
 U:{mark:'U',meaning:'U是申请材料质量，一个我们没画进图、却可能起作用的背景因素。',example:'U如果同时影响方案分配和录取，比较就会被搅乱。'},
 G:{mark:'G',meaning:'G是伯克利情境里的群体变量（性别）。',example:'若假设G→C→R，院系C就处在中间环节上。'},
 school:{mark:'X · Y · Z',meaning:'本题X=是否参加晚自习，Y=之后的成绩，Z=原有的学习困难程度。',example:'Z→X、Z→Y是这道题给定的假设。'},
 ai:{mark:'X · Y',meaning:'本题X=是否使用AI学习系统，Y=之后的学习成绩。',example:'观察使用者的成绩，和随机分配后再比成绩，是两种证据。'},
};
