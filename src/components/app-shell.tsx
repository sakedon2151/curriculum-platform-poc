"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ArrowUpRight, Library, Plus, Sprout, Zap, Monitor, Compass } from "lucide-react";
import { useLearning } from "./learning-provider";
import type { ReactNode } from "react";

export function AppShell({children}:{children:ReactNode}){
  const path=usePathname();
  const {progress,storageError}=useLearning();
  const xp=Object.values(progress).reduce((sum,item)=>sum+item.totalXp,0);
  return <div className="app-shell">
    <a href="#main-content" className="skip-link">본문으로 바로가기</a>
    <aside className="sidebar">
      <Link href="/" className="brand" aria-label="모루 홈"><span className="brand-symbol"><Sprout size={26} strokeWidth={2}/></span><span>모루<span className="brand-sub">배움이 자라는 곳</span></span></Link>
      <nav aria-label="주요 메뉴" className="side-nav">
        <span className="nav-caption">나의 학습 공간</span>
        <Link href="/" className={`nav-link ${path==="/"?"active":""}`} aria-current={path==="/"?"page":undefined}><Plus size={19}/>새로운 학습</Link>
        <Link href="/#my-courses" className={`nav-link ${path.startsWith("/course")?"active":""}`}><Library size={19}/>내 코스</Link>
        <Link href="/#how-it-works" className="nav-link"><Compass size={19}/>학습 안내</Link>
      </nav>
      <div className="sidebar-note"><BookOpen size={21}/><strong>조금씩, 확실하게.</strong><p>개념 하나를 이해하고<br/>다음 배움으로 나아가세요.</p><Link href="/#new-course">학습 시작하기 <ArrowUpRight size={15}/></Link></div>
      <div className="sidebar-bottom"><span className="status-dot"/>나만의 작은 배움터</div>
    </aside>
    <div className="app-body">
      <header className="topbar"><span className="topbar-title">{path==="/"?"나의 학습 공간":"배움의 여정"}</span><div className="topbar-meta"><span className="local-label"><Monitor size={15}/>이 브라우저에 저장</span><span className="xp-badge"><Zap size={16} fill="currentColor"/>{xp} XP</span></div></header>
      {storageError&&<div className="storage-warning" role="alert">{storageError}</div>}
      <main id="main-content" className="main-content">{children}</main>
      <footer className="app-footer"><span>모루 · 한 걸음씩 넓어지는 배움</span><span>학습 데이터는 이 브라우저에 저장됩니다.</span></footer>
    </div>
  </div>;
}
