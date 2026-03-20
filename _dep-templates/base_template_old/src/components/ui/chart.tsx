import * as React from "react"
import {
  BarChart as RechartsBarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  AreaChart as RechartsAreaChart,
  Area,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { cn } from "@/lib/utils"

// Chart colors from CSS variables
const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config?: Record<string, { label: string; color?: string }>
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ className, children, config, ...props }, ref) => {
    const cssVars = React.useMemo(() => {
      if (!config) return {}
      return Object.entries(config).reduce((acc, [key, value], index) => {
        acc[`--color-${key}`] = value.color || CHART_COLORS[index % CHART_COLORS.length]
        return acc
      }, {} as Record<string, string>)
    }, [config])

    return (
      <div
        ref={ref}
        className={cn("flex aspect-video justify-center text-xs", className)}
        style={cssVars}
        {...props}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    )
  }
)
ChartContainer.displayName = "ChartContainer"

const ChartTooltip = Tooltip

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof Tooltip> & { hideLabel?: boolean }
>(({ active, payload, label, hideLabel }, ref) => {
  if (!active || !payload?.length) return null

  return (
    <div
      ref={ref}
      className="rounded-lg border bg-background p-2 shadow-sm"
    >
      {!hideLabel && label && (
        <div className="mb-1 font-medium">{label}</div>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((item: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground">{item.name}:</span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
})
ChartTooltipContent.displayName = "ChartTooltipContent"

const ChartLegend = Legend

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof Legend>
>(({ payload }, ref) => {
  if (!payload?.length) return null

  return (
    <div ref={ref} className="flex flex-wrap justify-center gap-4">
      {payload.map((item: any, index: number) => (
        <div key={index} className="flex items-center gap-1.5">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-sm text-muted-foreground">{item.value}</span>
        </div>
      ))}
    </div>
  )
})
ChartLegendContent.displayName = "ChartLegendContent"

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  CHART_COLORS,
  // Re-export recharts components
  RechartsBarChart as BarChart,
  Bar,
  RechartsLineChart as LineChart,
  Line,
  RechartsAreaChart as AreaChart,
  Area,
  RechartsPieChart as PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
}
