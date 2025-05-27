"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"

export interface Step {
  id: string
  title: string
  description?: string
  status: "pending" | "current" | "completed" | "error"
  optional?: boolean
}

interface StepperProps {
  steps: Step[]
  currentStep: string
  onStepClick?: (stepId: string) => void
  className?: string
  orientation?: "horizontal" | "vertical"
  allowClickthrough?: boolean
}

const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  ({ 
    steps, 
    currentStep, 
    onStepClick, 
    className, 
    orientation = "horizontal",
    allowClickthrough = true,
    ...props 
  }, ref) => {
    const currentIndex = steps.findIndex(step => step.id === currentStep)
    
    const handleStepClick = (step: Step, index: number) => {
      if (!onStepClick || !allowClickthrough) return
      
      // Allow clicking on completed steps or next step if current is completed
      const currentStepStatus = steps[currentIndex]?.status
      const canNavigate = index <= currentIndex || 
        (index === currentIndex + 1 && currentStepStatus === "completed")
      
      if (canNavigate) {
        onStepClick(step.id)
      }
    }

    const getStepStatus = (step: Step, index: number): Step["status"] => {
      if (step.status === "error") return "error"
      if (index < currentIndex) return "completed"
      if (index === currentIndex) return "current"
      return "pending"
    }

    const isClickable = (step: Step, index: number) => {
      if (!allowClickthrough || !onStepClick) return false
      const currentStepStatus = steps[currentIndex]?.status
      return index <= currentIndex || 
        (index === currentIndex + 1 && currentStepStatus === "completed")
    }

    if (orientation === "vertical") {
      return (
        <div ref={ref} className={cn("space-y-4", className)} {...props}>
          {steps.map((step, index) => {
            const status = getStepStatus(step, index)
            const clickable = isClickable(step, index)
            
            return (
              <div key={step.id} className="flex items-start space-x-4">
                {/* Step Indicator */}
                <button
                  onClick={() => handleStepClick(step, index)}
                  disabled={!clickable}
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                    {
                      "border-blue-600 bg-blue-600 text-white": status === "current",
                      "border-green-600 bg-green-600 text-white": status === "completed",
                      "border-red-600 bg-red-600 text-white": status === "error",
                      "border-gray-300 bg-white text-gray-400": status === "pending",
                      "cursor-pointer hover:border-blue-400": clickable,
                      "cursor-not-allowed": !clickable
                    }
                  )}
                >
                  {status === "completed" ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : status === "error" ? (
                    "!"
                  ) : (
                    index + 1
                  )}
                </button>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    "text-sm font-medium",
                    {
                      "text-blue-600": status === "current",
                      "text-green-600": status === "completed", 
                      "text-red-600": status === "error",
                      "text-gray-900": status === "pending"
                    }
                  )}>
                    {step.title}
                    {step.optional && (
                      <span className="ml-1 text-xs text-gray-500">(Optional)</span>
                    )}
                  </h3>
                  {step.description && (
                    <p className="text-sm text-gray-600">{step.description}</p>
                  )}
                </div>

                {/* Connector */}
                {index < steps.length - 1 && (
                  <div className={cn(
                    "absolute left-4 top-8 h-4 w-0.5 bg-gray-300",
                    {
                      "bg-green-600": index < currentIndex,
                      "bg-blue-600": index === currentIndex
                    }
                  )} />
                )}
              </div>
            )
          })}
        </div>
      )
    }

    // Horizontal orientation
    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const status = getStepStatus(step, index)
            const clickable = isClickable(step, index)
            
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center space-y-2">
                  {/* Step Indicator */}
                  <button
                    onClick={() => handleStepClick(step, index)}
                    disabled={!clickable}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                      {
                        "border-blue-600 bg-blue-600 text-white": status === "current",
                        "border-green-600 bg-green-600 text-white": status === "completed",
                        "border-red-600 bg-red-600 text-white": status === "error",
                        "border-gray-300 bg-white text-gray-400": status === "pending",
                        "cursor-pointer hover:border-blue-400": clickable,
                        "cursor-not-allowed": !clickable
                      }
                    )}
                  >
                    {status === "completed" ? (
                      <CheckIcon className="h-4 w-4" />
                    ) : status === "error" ? (
                      "!"
                    ) : (
                      index + 1
                    )}
                  </button>

                  {/* Step Title */}
                  <div className="text-center">
                    <h3 className={cn(
                      "text-xs font-medium sm:text-sm",
                      {
                        "text-blue-600": status === "current",
                        "text-green-600": status === "completed",
                        "text-red-600": status === "error", 
                        "text-gray-900": status === "pending"
                      }
                    )}>
                      {step.title}
                    </h3>
                    {step.optional && (
                      <span className="text-xs text-gray-500">(Optional)</span>
                    )}
                  </div>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 px-2">
                    <div className={cn(
                      "h-0.5 w-full bg-gray-300 transition-colors",
                      {
                        "bg-green-600": index < currentIndex,
                        "bg-blue-600": index === currentIndex
                      }
                    )} />
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>
    )
  }
)

Stepper.displayName = "Stepper"

export { Stepper }
export type { StepperProps } 