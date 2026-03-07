import { useState } from "react"
import { AreaChart, Area } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { technicianConfig, ticketData } from "@/data/tickets"
import type { TechKey } from "@/data/tickets"

// ─── Derived stats ────────────────────────────────────────────────────────────

const techs = Object.keys(technicianConfig) as TechKey[]

const techTotals = techs.reduce((acc, key) => {
  acc[key] = ticketData.reduce((s, d) => s + d[key], 0)
  return acc
}, {} as Record<TechKey, number>)

const grandTotal = Object.values(techTotals).reduce((s, v) => s + v, 0)
const topKey = techs.reduce((a, b) => (techTotals[a] > techTotals[b] ? a : b))
const bestDayTotal = Math.max(...ticketData.map((d) => techs.reduce((s, k) => s + d[k], 0)))
const avgPerDay = (grandTotal / (techs.length * ticketData.length)).toFixed(1)

const sumWeek = (start: number) =>
  ticketData.slice(start, start + 7).reduce((s, d) => s + techs.reduce((ss, k) => ss + d[k], 0), 0)
const w3 = sumWeek(14)
const w4 = sumWeek(21)
const weekChangePct = (((w4 - w3) / w3) * 100).toFixed(1)

// ─── Radial gauge (SVG semicircle) ───────────────────────────────────────────

function RadialGauge({
  value,
  max,
  color,
  sublabel,
}: {
  value: number
  max: number
  color: string
  sublabel: string
}) {
  const pct = Math.min(value / max, 1)
  const r = 36
  const cx = 50
  const cy = 54
  const arcLen = Math.PI * r
  const d = `M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`

  return (
    <svg viewBox="0 0 100 68" className="w-full">
      <path d={d} fill="none" stroke="#e5e7eb" strokeWidth="7" strokeLinecap="round" />
      {pct > 0 && (
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${pct * arcLen} ${arcLen}`}
        />
      )}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="15" fontWeight="700" fill="currentColor">
        {value}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="#9ca3af">
        {sublabel}
      </text>
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TechnicianAnalytics() {
  const [activeTechs, setActiveTechs] = useState<Set<TechKey>>(new Set(techs))

  function toggleTech(key: TechKey) {
    setActiveTechs((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size > 1) next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const gaugeMetrics = [
    {
      label: "Total Tickets",
      value: grandTotal,
      max: 800,
      sublabel: "completed",
      color: "#6366f1",
      change: weekChangePct,
    },
    {
      label: "Best Day",
      value: bestDayTotal,
      max: 50,
      sublabel: "in one day",
      color: "#22c55e",
      change: "+2.7",
    },
    {
      label: "Avg / Tech / Day",
      value: parseFloat(avgPerDay),
      max: 15,
      sublabel: "tickets",
      color: "#f59e0b",
      change: "+0.4",
    },
    {
      label: "Top Performer",
      value: techTotals[topKey],
      max: 300,
      sublabel: technicianConfig[topKey].label as string,
      color: technicianConfig[topKey].color as string,
      change: "+1.3",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Technician Performance</h2>
          <p className="text-muted-foreground">How your team performed and evolved</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm px-3 py-1">February 2025</Badge>
          <Button variant="outline" size="sm">Export</Button>
        </div>
      </div>

      <Separator />

      {/* Radial gauge row */}
      <div className="grid gap-4 md:grid-cols-4">
        {gaugeMetrics.map((m) => (
          <Card key={m.label}>
            <CardHeader className="pb-1">
              <CardDescription>{m.label}</CardDescription>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="mx-auto w-28">
                <RadialGauge value={m.value} max={m.max} color={m.color} sublabel={m.sublabel} />
              </div>
              <p className="text-center text-xs text-emerald-500 mt-1">↑ {m.change}% from last week</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Middle row: hero text | top performer | overview chart */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex items-center">
          <CardContent className="pt-6">
            <p className="text-3xl font-bold leading-tight">
              How your team evolved and connected
            </p>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-center items-center text-center">
          <CardHeader className="pb-1">
            <CardDescription>Top Performer</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="text-6xl font-bold tabular-nums"
              style={{ color: technicianConfig[topKey].color as string }}
            >
              {techTotals[topKey]}
            </div>
            <p className="text-muted-foreground mt-1">
              tickets · {technicianConfig[topKey].label as string}
            </p>
            <p className="text-xs text-emerald-500 mt-1">↑ +1.3% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tickets &gt; Technician</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <ChartContainer config={technicianConfig} className="h-40 w-full">
              <AreaChart data={ticketData} margin={{ top: 2, right: 4, left: -32, bottom: 0 }}>
                <defs>
                  {techs.map((key) => (
                    <linearGradient key={key} id={`ov-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={technicianConfig[key].color as string} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={technicianConfig[key].color as string} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <ChartLegend content={<ChartLegendContent />} />
                {techs.map((key) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={technicianConfig[key].color as string}
                    strokeWidth={1.5}
                    fill={`url(#ov-${key})`}
                    dot={false}
                  />
                ))}
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Per-technician cards with sparklines + toggle */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-muted-foreground">Show:</span>
        {techs.map((key) => {
          const active = activeTechs.has(key)
          return (
            <Button
              key={key}
              variant={active ? "default" : "outline"}
              size="sm"
              onClick={() => toggleTech(key)}
              style={
                active
                  ? { backgroundColor: technicianConfig[key].color as string, borderColor: technicianConfig[key].color as string }
                  : { borderColor: technicianConfig[key].color as string, color: technicianConfig[key].color as string }
              }
            >
              {technicianConfig[key].label as string}
            </Button>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {techs.filter((key) => activeTechs.has(key)).map((key) => {
          const sparkData = ticketData.map((d) => ({ date: d.date, value: d[key] }))
          const total = techTotals[key]
          const avg = (total / ticketData.length).toFixed(1)
          const best = Math.max(...sparkData.map((d) => d.value))
          const sparkConfig: ChartConfig = { value: { color: technicianConfig[key].color as string } }

          return (
            <Card key={key}>
              <CardHeader className="pb-1">
                <div className="flex items-center justify-between">
                  <Badge
                    className="text-white border-0"
                    style={{ backgroundColor: technicianConfig[key].color as string }}
                  >
                    {technicianConfig[key].label as string}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{avg}/day avg</span>
                </div>
                <CardTitle className="text-4xl tabular-nums mt-1">{total}</CardTitle>
                <CardDescription>tickets · best day {best}</CardDescription>
              </CardHeader>
              <CardContent className="pb-3 pt-0">
                <ChartContainer config={sparkConfig} className="h-16 w-full">
                  <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`sp-${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={technicianConfig[key].color as string} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={technicianConfig[key].color as string} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <ChartTooltip content={<ChartTooltipContent hideLabel indicator="dot" />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={technicianConfig[key].color as string}
                      strokeWidth={2}
                      fill={`url(#sp-${key})`}
                      dot={false}
                      activeDot={{ r: 3 }}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
