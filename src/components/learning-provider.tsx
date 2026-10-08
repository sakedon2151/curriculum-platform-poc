"use client";

import { createContext, useCallback, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import { courseSchema, type Course, type LearningProgress, type QuizResult } from "@/lib/types";
import { createProgress, getLessonStatus, getLesson, submitQuiz } from "@/lib/learning";
import { createEmptyStore, readLearningStore, writeLearningStore, LEARNING_STORAGE_KEY, type LearningStore } from "@/lib/storage";

type LearningContextValue = {
  courses: Course[];
  progress: Record<string, LearningProgress>;
  ready: boolean;
  storageError: string | null;
  saveCourse: (course: Course) => void;
  setCurrentLesson: (courseId: string, lessonId: string) => void;
  setLessonStep: (courseId: string, lessonId: string, step: number) => void;
  completeQuiz: (courseId: string, lessonId: string, answers: number[]) => QuizResult | null;
};
const LearningContext = createContext<LearningContextValue | null>(null);

function createStoreSource() {
  type Snapshot = { store: LearningStore; ready: boolean; storageError: string | null };
  const serverSnapshot: Snapshot = { store: createEmptyStore(), ready: false, storageError: null };
  let snapshot = serverSnapshot;
  const listeners = new Set<() => void>();
  function notify() { for (const listener of listeners) listener(); }
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe(listener: () => void) {
      if (!snapshot.ready) {
        const loaded = readLearningStore();
        snapshot = { store: loaded.store, ready: true, storageError: loaded.error };
      }
      listeners.add(listener);
      const sync = (event: StorageEvent) => {
        if (event.key !== LEARNING_STORAGE_KEY && event.key !== null) return;
        const latest = readLearningStore();
        snapshot = latest.error ? { ...snapshot, storageError: latest.error } : { store: latest.store, ready: true, storageError: null };
        notify();
      };
      window.addEventListener("storage", sync);
      return () => { listeners.delete(listener); window.removeEventListener("storage", sync); };
    },
    update(store: LearningStore) {
      snapshot = { store, ready: true, storageError: writeLearningStore(store) };
      notify();
    },
    setError(message: string) { snapshot = { ...snapshot, storageError: message }; notify(); },
  };
}

export function LearningProvider({children}:{children:ReactNode}) {
  const [source]=useState(createStoreSource);
  const {store,ready,storageError}=useSyncExternalStore(source.subscribe,source.getSnapshot,source.getServerSnapshot);

  const commit=useCallback((next:LearningStore)=>{
    source.update(next);
  },[source]);
  const saveCourse=useCallback((value:Course)=>{
    const course=courseSchema.parse(value);
    const current=source.getSnapshot().store;
    commit({...current,courses:[course,...current.courses.filter(item=>item.id!==course.id)],progress:{...current.progress,[course.id]:current.progress[course.id]??createProgress(course)}});
  },[commit,source]);
  const updateLesson=useCallback((courseId:string,lessonId:string,step?:number)=>{
    const current=source.getSnapshot().store;
    const course=current.courses.find(item=>item.id===courseId);
    const progress=current.progress[courseId];
    if(!course||!progress||getLessonStatus(course,progress,lessonId)==="locked")return;
    const lesson=getLesson(course,lessonId);
    if(!lesson)return;
    const lessonSteps=step===undefined?progress.lessonSteps:{...progress.lessonSteps,[lessonId]:Math.max(0,Math.min(20,Math.floor(step)))};
    if(progress.currentLessonId===lessonId&&lessonSteps===progress.lessonSteps)return;
    commit({...current,progress:{...current.progress,[courseId]:{...progress,currentLessonId:lessonId,lessonSteps}}});
  },[commit,source]);
  const completeQuiz=useCallback((courseId:string,lessonId:string,answers:number[]):QuizResult|null=>{
    const current=source.getSnapshot().store;
    const course=current.courses.find(item=>item.id===courseId);
    const progress=current.progress[courseId];
    if(!course||!progress)return null;
    try{
      const outcome=submitQuiz(course,progress,lessonId,answers);
      commit({...current,progress:{...current.progress,[courseId]:outcome.progress}});
      return outcome.result;
    }catch{
      source.setError("퀴즈 결과를 저장하지 못했습니다. 코스로 돌아가 다시 시도해 주세요.");
      return null;
    }
  },[commit,source]);
  const setCurrentLesson=useCallback((courseId:string,lessonId:string)=>updateLesson(courseId,lessonId),[updateLesson]);
  const setLessonStep=useCallback((courseId:string,lessonId:string,step:number)=>updateLesson(courseId,lessonId,step),[updateLesson]);
  return <LearningContext.Provider value={{courses:store.courses,progress:store.progress,ready,storageError,saveCourse,setCurrentLesson,setLessonStep,completeQuiz}}>{children}</LearningContext.Provider>;
}
export function useLearning(){const context=useContext(LearningContext);if(!context)throw new Error("LearningProvider가 필요합니다.");return context;}
