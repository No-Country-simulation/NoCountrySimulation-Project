import React from 'react';
import { cn } from '../../lib/utils';

const badgeVariants = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  destructive: "bg-destructive text-destructive-foreground",
  outline: "border border-border text-foreground",
  success: "bg-success/20 text-success border border-success/30",
  warning: "bg-warning/20 text-warning border border-warning/30",
  muted: "bg-muted text-muted-foreground",
};

export function Badge({ className, variant = "default", children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        badgeVariants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
