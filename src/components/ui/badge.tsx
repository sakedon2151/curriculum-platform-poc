import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";
const badgeVariants=cva("badge",{variants:{variant:{default:"badge-green",secondary:"badge-neutral",outline:"badge-outline",destructive:"badge-error"}},defaultVariants:{variant:"default"}});
export function Badge({className,variant,...props}:ComponentProps<"span"> & VariantProps<typeof badgeVariants>){return <span data-slot="badge" className={cn(badgeVariants({variant}),className)} {...props}/>;}
