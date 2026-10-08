import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const buttonVariants = cva("button", {
  variants: {
    variant: { default: "primary", secondary: "secondary", outline: "secondary", ghost: "ghost", destructive: "destructive", link: "text-link" },
    size: { default: "", sm: "button-sm", lg: "button-lg", icon: "button-icon" },
  }, defaultVariants: { variant: "default", size: "default" },
});
export type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean };
export function Button({className,variant,size,asChild=false,...props}:ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({variant,size,className}))} {...props}/>;
}
export { buttonVariants };
