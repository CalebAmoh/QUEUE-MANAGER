import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const bankingButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-lg font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-primary-foreground hover:shadow-button-banking active:scale-[0.98]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
        success: "bg-gradient-success text-accent-foreground hover:shadow-button-banking active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border-2 border-primary text-primary bg-background hover:bg-primary hover:text-primary-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        scan: "bg-gradient-primary text-primary-foreground hover:shadow-button-banking active:scale-[0.98] animate-scan-pulse",
      },
      size: {
        default: "h-14 px-8 py-4",
        sm: "h-10 px-4 py-2 text-sm",
        lg: "h-16 px-12 py-6 text-xl",
        xl: "h-20 px-16 py-8 text-2xl",
        icon: "h-14 w-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BankingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof bankingButtonVariants> {
  asChild?: boolean
}

const BankingButton = React.forwardRef<HTMLButtonElement, BankingButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(bankingButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
BankingButton.displayName = "BankingButton"

export { BankingButton, bankingButtonVariants }