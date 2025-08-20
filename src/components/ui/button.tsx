import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background relative overflow-hidden",
  {
    variants: {
      variant: {
        default:
          'bg-gradient-primary text-primary-foreground shadow-elegant hover:shadow-floating hover:scale-[1.02] active:scale-[0.98]',
        destructive:
          'bg-destructive text-destructive-foreground shadow-elegant hover:bg-destructive/90 hover:shadow-floating hover:scale-[1.02] active:scale-[0.98]',
        outline:
          'border border-border bg-background/80 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground hover:border-primary/20 hover:shadow-elegant',
        secondary:
          'bg-secondary text-secondary-foreground shadow-elegant hover:bg-secondary/80 hover:shadow-floating',
        ghost: 'hover:bg-accent hover:text-accent-foreground hover:shadow-sm',
        link: 'text-primary underline-offset-4 hover:underline hover:text-primary/80',
        success:
          'bg-success text-success-foreground shadow-elegant hover:bg-success/90 hover:shadow-floating hover:scale-[1.02] active:scale-[0.98]',
        warning:
          'bg-warning text-warning-foreground shadow-elegant hover:bg-warning/90 hover:shadow-floating hover:scale-[1.02] active:scale-[0.98]',
        info: 'bg-info text-info-foreground shadow-elegant hover:bg-info/90 hover:shadow-floating hover:scale-[1.02] active:scale-[0.98]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-lg px-8 text-base',
        icon: 'h-10 w-10',
        xl: 'h-14 rounded-xl px-10 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
