"use client";
import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "./utils";
export function Progress({className,value=0,...props}:React.ComponentProps<typeof ProgressPrimitive.Root>){
  const percentage=Math.max(0,Math.min(100,value??0));
  return <ProgressPrimitive.Root data-slot="progress" className={cn("progress-track",className)} value={percentage} {...props}><ProgressPrimitive.Indicator className="progress-fill" style={{transform:`translateX(-${100-percentage}%)`}}/></ProgressPrimitive.Root>;
}
