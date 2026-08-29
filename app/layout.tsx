import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
 title: '反转之城｜从辛普森悖论到因果推理',
 description: '关于数字、条件与因果的城市冒险。40幕高中互动课程，学生探索、教师演示与五问高考迁移。',
 metadataBase: new URL('http://127.0.0.1:3004'),
 openGraph: { title: '反转之城', description: '从辛普森悖论到因果推理，一场40幕的数学探索。', images: [{url:'/og.png',width:1731,height:909,alt:'日光中的反转之城，阿岚与导航机器人准备出发'}], locale:'zh_CN', type:'website' },
 twitter: {card:'summary_large_image',title:'反转之城',images:['/og.png']},
 icons: { icon:'/icon.svg' },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN"><body>{children}</body></html>; }
