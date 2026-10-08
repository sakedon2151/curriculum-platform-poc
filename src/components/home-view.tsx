"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, BookOpen, Check, ChevronRight, CircleHelp, Clock3, FileSearch, Layers, LoaderCircle, Search, Sparkles, Sprout, Target, Zap } from "lucide-react";
import { courseSchema, type Course, type Level } from "@/lib/types";
import { getCourseCompletion, getLessons } from "@/lib/learning";
import { useLearning } from "./learning-provider";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Skeleton } from "./ui/skeleton";

const levels: {value:Level;label:string;hint:string;icon:typeof Sprout}[]=[
  {value:"intro",label:"입문",hint:"처음 배우는 주제",icon:Sprout},
  {value:"beginner",label:"초급",hint:"기초는 알고 있어요",icon:BookOpen},
  {value:"intermediate",label:"중급",hint:"더 깊이 배우고 싶어요",icon:Layers},
];
const suggestions=["Docker 기초 배우기","JavaScript 비동기","컴퓨터 네트워크","머신러닝 입문"];
const pipeline=[{stage:"analysis",label:"주제와 수준 이해하기"},{stage:"search",label:"믿을 수 있는 자료 찾기"},{stage:"curriculum",label:"나만의 학습 경로 만들기"},{stage:"validation",label:"레슨과 퀴즈 확인하기"}];

export function HomeView(){
  const router=useRouter();
  const {courses,progress,ready,saveCourse}=useLearning();
  const [topic,setTopic]=useState("");
  const [level,setLevel]=useState<Level>("intro");
  const [aiAvailable,setAiAvailable]=useState<boolean|null>(null);
  const [busy,setBusy]=useState(false);
  const [stage,setStage]=useState("");
  const [status,setStatus]=useState("");
  const [error,setError]=useState<string|null>(null);
  const [lastMode,setLastMode]=useState<"ai"|"demo">("ai");
  const abortRef=useRef<AbortController|null>(null);
  const textareaRef=useRef<HTMLTextAreaElement|null>(null);
  useEffect(()=>{
    const abort=new AbortController();
    fetch("/api/config",{signal:abort.signal}).then(response=>response.json()).then(data=>setAiAvailable(data.aiAvailable===true)).catch(()=>{if(!abort.signal.aborted)setAiAvailable(false);});
    return ()=>{abort.abort();abortRef.current?.abort();};
  },[]);
  async function generate(mode:"ai"|"demo"){
    if(busy||!ready)return;
    if(mode==="ai"&&(topic.trim().length<2||topic.trim().length>200)){
      setError("배우고 싶은 주제를 2~200자로 적어 주세요.");textareaRef.current?.focus();return;
    }
    setBusy(true);setError(null);setStage("");setLastMode(mode);
    setStatus(mode==="demo"?"Docker 체험 코스를 준비하고 있어요.":"학습 주제를 살펴보고 있어요.");
    const abort=new AbortController();abortRef.current=abort;
    let generated:Course|null=null;
    try{
      const response=await fetch("/api/courses",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic:mode==="demo"?"Docker 기초 배우기":topic.trim(),level,mode}),signal:abort.signal});
      if(!response.ok){const data=await response.json();throw new Error(data.error?.message??"코스를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");}
      if(!response.body)throw new Error("서버 응답을 읽지 못했습니다. 다시 시도해 주세요.");
      const reader=response.body.getReader();const decoder=new TextDecoder();let buffer="";
      function consume(line:string){
        if(!line.trim())return;
        const event=JSON.parse(line);
        if(event.type==="progress"){setStage(event.stage);setStatus(event.message);}
        else if(event.type==="course"){generated=courseSchema.parse(event.course);}
        else if(event.type==="error")throw new Error(event.message??"코스를 만들지 못했습니다.");
      }
      try{
        while(true){
          const {done,value}=await reader.read();
          if(done){buffer+=decoder.decode();break;}
          buffer+=decoder.decode(value,{stream:true});const lines=buffer.split("\n");buffer=lines.pop()??"";
          for(const line of lines)consume(line);
          if(buffer.length>2_000_000)throw new Error("서버 응답이 너무 큽니다. 다시 시도해 주세요.");
        }
        consume(buffer);
      }finally{reader.releaseLock();}
      if(!generated)throw new Error("완성된 코스를 받지 못했습니다. 다시 시도해 주세요.");
      saveCourse(generated);router.push(`/course/${(generated as Course).id}`);
    }catch(caught){
      if(!abort.signal.aborted){abort.abort();setError(caught instanceof Error?caught.message:"코스를 만들지 못했습니다. 다시 시도해 주세요.");}
    }finally{setBusy(false);abortRef.current=null;}
  }
  function onSubmit(event:FormEvent){event.preventDefault();void generate("ai");}
  const stageIndex=stage==="queries"?0:stage==="filter"?1:Math.max(0,pipeline.findIndex(item=>item.stage===stage));
  const completedCount=Object.values(progress).reduce((sum,item)=>sum+item.completedLessonIds.length,0);
  return <div className="home-view">
    <div className="home-heading"><div><div className="welcome-label"><span className="status-dot"/>호기심이 배움의 시작이에요</div><h1>오늘, 무엇을 배워볼까요?</h1><p className="page-intro">궁금한 주제 하나로 시작하세요. 자료부터 레슨까지, 나에게 맞는 배움으로 이어집니다.</p></div><span className="home-heading-icon" aria-hidden="true"><Sprout size={38} strokeWidth={1.6}/></span></div>
    <div className="home-workbench" id="new-course">
      <section className="panel creator-panel" aria-labelledby="creator-title">
        <div className="panel-title"><div><span className="eyebrow">나만의 학습 코스</span><h2 id="creator-title">배우고 싶은 것을 알려주세요</h2></div><span className="icon-box"><Sparkles size={21}/></span></div>
        <form onSubmit={onSubmit}>
          <label htmlFor="topic" className="field-label">학습 주제 <span className="muted">· 필수</span></label>
          <textarea id="topic" ref={textareaRef} value={topic} onChange={event=>{setTopic(event.target.value);if(error)setError(null);}} maxLength={200} placeholder="예: Docker로 내 첫 컨테이너 실행하기" rows={3} aria-required="true" aria-invalid={!!error} aria-describedby="topic-help"/>
          <div className="input-meta"><span id="topic-help">구체적으로 적을수록 나에게 맞는 코스가 만들어져요.</span><span>{topic.length}/200</span></div>
          <div className="topic-suggestions" aria-label="추천 학습 주제">{suggestions.map(item=><button type="button" key={item} disabled={busy} onClick={()=>{setTopic(item);setError(null);}}>{item}<ArrowUpRight size={12}/></button>)}</div>
          <fieldset className="level-fieldset"><legend className="field-label">지금 나의 수준은?</legend><div className="level-options">{levels.map(({value,label,hint,icon:Icon})=><label className={`level-option ${level===value?"selected":""}`} key={value}><input type="radio" name="level" value={value} checked={level===value} disabled={busy} onChange={()=>setLevel(value)}/><Icon size={20}/><strong>{label}</strong><span>{hint}</span><span className="radio-mark" aria-hidden="true">{level===value&&<Check size={11}/>}</span></label>)}</div></fieldset>
          {error&&<div className="notice error-notice" role="alert"><CircleHelp size={19}/><div><p>{error}</p><Button type="button" variant="ghost" size="sm" onClick={()=>void generate(lastMode)}>다시 시도 <ArrowRight size={14}/></Button></div></div>}
          {aiAvailable===false&&!busy&&<p className="config-note"><CircleHelp size={15}/>AI 연결 준비 전에는 Docker 데모로 학습을 체험할 수 있어요.</p>}
          <div className="create-actions"><Button type="submit" disabled={busy||!ready||aiAvailable!==true} className="generate-button">{busy?<><LoaderCircle className="spinner" size={17}/>코스 만드는 중</>:<><Sparkles size={17}/>학습 코스 만들기<ArrowRight size={17}/></>}</Button><Button type="button" variant="secondary" disabled={busy||!ready} onClick={()=>void generate("demo")}>Docker 데모 체험 <ChevronRight size={17}/></Button></div>
          <div className="creator-foot"><span><Layers size={13}/>3개 챕터</span><span><BookOpen size={13}/>9개 레슨</span><span><Target size={13}/>27개 퀴즈</span></div>
        </form>
      </section>
      <aside className={`journey-preview ${busy?"is-generating":""}`} aria-label={busy?"코스 생성 진행 상황":"데모 학습 경로 미리보기"}>
        {busy?<><span className="preview-kicker">배움의 길을 만드는 중</span><h2>좋은 배움은<br/>좋은 자료에서.</h2><p className="preview-description" role="status" aria-live="polite">{status}</p><ol className="pipeline-list">{pipeline.map((item,index)=><li key={item.stage} className={index<stageIndex?"done":index===stageIndex?"current":""}><span>{index<stageIndex?<Check size={15}/>:index===stageIndex?<LoaderCircle className="spinner" size={15}/>:index+1}</span>{item.label}</li>)}</ol><Button type="button" variant="ghost" className="preview-cancel" onClick={()=>abortRef.current?.abort()}>생성 취소</Button></>:<><div className="preview-top"><span className="preview-kicker">한 걸음씩, 확실하게</span><span className="preview-leaf"><Sprout size={23}/></span></div><h2>막연한 궁금함을<br/>나만의 배움으로.</h2><p className="preview-description">읽고, 이해하고, 확인하세요.<br/>작은 성취가 다음 레슨을 열어줘요.</p><div className="mini-path"><div className="mini-lesson"><span className="mini-node"><BookOpen size={16}/></span><div><strong>컨테이너 이해하기</strong><span>핵심 개념과 쉬운 예시</span></div><span className="mini-time">5분</span></div><div className="mini-lesson"><span className="mini-node"><Target size={16}/></span><div><strong>퀴즈로 확인하기</strong><span>3문제로 개념 점검</span></div><span className="mini-xp">+30 XP</span></div><div className="mini-lesson muted-lesson"><span className="mini-node"><Layers size={16}/></span><div><strong>다음 레슨으로</strong><span>통과하면 다음 단계가 열려요</span></div></div></div><div className="preview-bottom"><span>Docker 데모 코스 미리보기</span><span><FileSearch size={14}/>공식 문서 기반</span></div></>}
      </aside>
    </div>
    <section id="my-courses" className="my-courses" aria-labelledby="courses-title"><div className="section-heading"><div><h2 id="courses-title">나의 배움 이어가기 <span className="count-badge">{courses.length}</span></h2><p className="muted">만들어 둔 코스에서 다음 한 걸음을 시작하세요.</p></div>{completedCount>0&&<span className="completion-note"><Check size={16}/>{completedCount}개 레슨 완료</span>}</div>
      {!ready?<div className="course-grid">{[1,2].map(item=><Skeleton key={item} className="course-skeleton"/>)}</div>:courses.length===0?<div className="empty-course"><span className="empty-course-icon"><BookOpen size={25} strokeWidth={1.6}/></span><div><strong>아직 시작한 코스가 없어요.</strong><p>첫 번째 코스를 만들면 여기에 학습 여정이 쌓여요.</p></div><Button variant="ghost" onClick={()=>void generate("demo")} disabled={busy}>데모부터 시작 <ArrowRight size={16}/></Button></div>:<div className="course-grid">{courses.map(course=>{
        const state=progress[course.id];const percentage=getCourseCompletion(course,state);const lessons=getLessons(course);const lesson=lessons.find(item=>item.id===state?.currentLessonId)??lessons[0];const duration=lessons.reduce((sum,item)=>sum+item.estimatedMinutes,0);
        return <article className="saved-course panel" key={course.id}><div className="saved-course-top"><span className="course-icon"><BookOpen size={23}/></span><Badge variant={course.mode==="demo"?"secondary":"default"}>{course.mode==="demo"?"데모 코스":"AI 코스"}</Badge></div><h3><Link href={`/course/${course.id}`}>{course.title}</Link></h3><p className="muted saved-course-description">{course.description}</p><div className="saved-course-meta"><span><Layers size={14}/>9개 레슨</span><span><Clock3 size={14}/>약 {duration}분</span><span><Zap size={14}/>{state?.totalXp??0} XP</span></div><div className="saved-progress-label"><span>{state?.completedLessonIds.length??0}/9 레슨 완료</span><strong>{percentage}%</strong></div><Progress value={percentage} aria-label={`${course.title} 진행률`}/><div className="saved-course-bottom"><span className="muted">{percentage===100?"배움의 여정을 완주했어요":"다음: "+lesson.title}</span><Link href={`/course/${course.id}/lesson/${lesson.id}`} className="course-continue">{percentage===100?"복습하기":"이어하기"}<ArrowRight size={16}/></Link></div></article>;
      })}</div>}
    </section>
    <section className="how-it-works" id="how-it-works" aria-labelledby="guide-title"><div className="guide-heading"><h2 id="guide-title">배움은 이렇게 이어져요</h2><p>검색한 자료가 나만의 학습 경로가 됩니다.</p></div><ol className="guide-steps"><li><span className="guide-icon"><Search size={19}/></span><div><strong>자료에서 시작</strong><p>웹에서 관련 자료를 찾고<br/>참고 출처를 함께 보여줘요.</p></div></li><li><span className="guide-icon"><BookOpen size={19}/></span><div><strong>짧은 레슨으로 이해</strong><p>개념과 예시를 하나씩 읽고<br/>나의 속도로 배워요.</p></div></li><li><span className="guide-icon"><Target size={19}/></span><div><strong>퀴즈로 한 단계 더</strong><p>정답마다 10 XP를 얻고<br/>통과하면 다음 레슨이 열려요.</p></div></li></ol></section>
  </div>;
}
