import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useChannelData, useChannelStatus } from "@/lib/channel-client"
import { Clock, Users, Target, TrendingUp, Activity, Timer, Gauge, BarChart3, FileText, AlertTriangle } from "lucide-react"

// ═══════════════════════════════════════════════════════════════
// DATACORPS BRAND COLORS
// ═══════════════════════════════════════════════════════════════
const COLORS = {
  orange: "#e66e32",     // DataCorps brand orange
  blue: "#45a2ff",       // DataCorps brand blue
  red: "#dc3545",        // TAKT is ALWAYS RED (Taiichi Ohno tribute)
  green: "#28a745",      // Ahead / success
  yellow: "#ffc107",     // On pace / warning
  teal: "#17a2b8",       // Forecast / info
  muted: "#9ca3af",      // Grid lines, secondary text
}

// ═══════════════════════════════════════════════════════════════
// TYPES — Matching channel.config.ts collections
// ═══════════════════════════════════════════════════════════════

interface DailySetup {
  id: number; date: string; dailyGoal: number; taktTime: number
  totalEffectiveMinutes: number; techCount: number; isConfigured: boolean
  businessHoursStart?: string; businessHoursEnd?: string
}

interface HourlyMetric {
  hour: number; hourLabel: string; ticketsClosed: number
  cumulativeTickets: number; targetCumulative: number
  variance: number; status: "ahead" | "on_pace" | "behind"
  pacePercentage: number
  ticketDetails?: { ticketNumber: number; summary: string; techName: string }[]
}

interface TechPerformance {
  techId: number; techName: string; ticketsClosed: number
  effectiveHours: number; personalTaktTime: number
  personalGoal: number; goalProgress: number
  status: "ahead" | "on_pace" | "behind"
  avgCycleTime: number; lastClosedAt: string
  hourlyBreakdown?: { hour: number; tickets: number; cumulative: number }[]
}

interface ClosedTicket {
  id: number; summary: string; closedBy: string; closedAt: string
  closedHour: number; company: string; cycleTimeMinutes: number
  boardName?: string; typeName?: string
}

interface CINote {
  id: number; content: string; category: string
  createdBy: string; createdAt: string; status: string
}

interface HuddleKPA {
  id: number; techId: number; techName: string
  commitment: string; date: string; completed: boolean
}

// ═══════════════════════════════════════════════════════════════
// STATUS HELPERS — "Win the Hour, Win the Day"
// ═══════════════════════════════════════════════════════════════

function getStatusBadge(status: string): { label: string; emoji: string; bg: string; animation: string } {
  switch (status) {
    case "ahead": return { label: "WINNING", emoji: "🏆", bg: `linear-gradient(135deg, ${COLORS.green}, #20c997)`, animation: "" }
    case "on_pace": return { label: "ON PACE", emoji: "⚖️", bg: `linear-gradient(135deg, ${COLORS.yellow}, #ff9800)`, animation: "animate-pulse-glow" }
    case "behind": return { label: "FALLING BEHIND", emoji: "⚠️", bg: `linear-gradient(135deg, ${COLORS.red}, #c82333)`, animation: "animate-shake" }
    default: return { label: "PENDING", emoji: "📊", bg: "#6c757d", animation: "" }
  }
}

function getStatusColor(status: string): string {
  return status === "ahead" ? COLORS.green : status === "on_pace" ? COLORS.yellow : COLORS.red
}

function progressBarColor(pct: number): string {
  if (pct >= 100) return COLORS.green
  if (pct >= 75) return COLORS.blue
  if (pct >= 50) return COLORS.yellow
  return COLORS.red
}

/** Cycle Time Gauge position: piecewise linear 0-100% mapping */
function gaugePosition(ratio: number): number {
  if (ratio <= 0.5) return ratio * 50
  if (ratio <= 1.0) return 25 + (ratio - 0.5) * 50
  if (ratio <= 1.5) return 50 + (ratio - 1.0) * 50
  return Math.min(75 + (ratio - 1.5) * 50, 100)
}

function formatHour12(hour24: number): string {
  const h = hour24 > 12 ? hour24 - 12 : hour24 === 0 ? 12 : hour24
  return `${h}:00 ${hour24 >= 12 ? "PM" : "AM"}`
}

// ═══════════════════════════════════════════════════════════════
// SAMPLE DATA — Realistic mid-day WinTracker scenario
// ═══════════════════════════════════════════════════════════════

const SAMPLE_TECHS = ["Alex", "Jordan", "Morgan", "Casey", "Riley"]

const sampleSetup: DailySetup = {
  id: 1, date: new Date().toISOString().slice(0, 10),
  dailyGoal: 45, taktTime: 34.5, totalEffectiveMinutes: 1553,
  techCount: 5, isConfigured: true,
}

const sampleHourly: HourlyMetric[] = [
  { hour: 8,  hourLabel: "8:00 AM",  ticketsClosed: 3, cumulativeTickets: 3,  targetCumulative: 5,  variance: -2, status: "behind",  pacePercentage: 60 },
  { hour: 9,  hourLabel: "9:00 AM",  ticketsClosed: 6, cumulativeTickets: 9,  targetCumulative: 10, variance: -1, status: "on_pace", pacePercentage: 90 },
  { hour: 10, hourLabel: "10:00 AM", ticketsClosed: 7, cumulativeTickets: 16, targetCumulative: 15, variance: 1,  status: "ahead",   pacePercentage: 107 },
  { hour: 11, hourLabel: "11:00 AM", ticketsClosed: 5, cumulativeTickets: 21, targetCumulative: 20, variance: 1,  status: "ahead",   pacePercentage: 105 },
  { hour: 12, hourLabel: "12:00 PM", ticketsClosed: 4, cumulativeTickets: 25, targetCumulative: 25, variance: 0,  status: "on_pace", pacePercentage: 100 },
  { hour: 13, hourLabel: "1:00 PM",  ticketsClosed: 6, cumulativeTickets: 31, targetCumulative: 30, variance: 1,  status: "ahead",   pacePercentage: 103 },
  { hour: 14, hourLabel: "2:00 PM",  ticketsClosed: 3, cumulativeTickets: 34, targetCumulative: 35, variance: -1, status: "on_pace", pacePercentage: 97 },
  { hour: 15, hourLabel: "3:00 PM",  ticketsClosed: 0, cumulativeTickets: 34, targetCumulative: 40, variance: -6, status: "behind",  pacePercentage: 85 },
  { hour: 16, hourLabel: "4:00 PM",  ticketsClosed: 0, cumulativeTickets: 34, targetCumulative: 45, variance: -11, status: "behind", pacePercentage: 76 },
]

const sampleTechs: TechPerformance[] = [
  { techId: 1, techName: "Alex",   ticketsClosed: 9,  effectiveHours: 7.5, personalTaktTime: 30.0, personalGoal: 12, goalProgress: 75,  status: "on_pace", avgCycleTime: 28, lastClosedAt: "" },
  { techId: 2, techName: "Jordan", ticketsClosed: 11, effectiveHours: 8.0, personalTaktTime: 28.5, personalGoal: 14, goalProgress: 79,  status: "ahead",   avgCycleTime: 25, lastClosedAt: "" },
  { techId: 3, techName: "Morgan", ticketsClosed: 6,  effectiveHours: 6.5, personalTaktTime: 42.0, personalGoal: 9,  goalProgress: 67,  status: "behind",  avgCycleTime: 45, lastClosedAt: "" },
  { techId: 4, techName: "Casey",  ticketsClosed: 5,  effectiveHours: 5.0, personalTaktTime: 36.0, personalGoal: 6,  goalProgress: 83,  status: "ahead",   avgCycleTime: 32, lastClosedAt: "" },
  { techId: 5, techName: "Riley",  ticketsClosed: 3,  effectiveHours: 4.0, personalTaktTime: 48.0, personalGoal: 4,  goalProgress: 75,  status: "on_pace", avgCycleTime: 50, lastClosedAt: "" },
]

// Whiteboard grid: time slots × techs
const TIME_SLOTS = [
  { label: "6:00–8:45", hours: [6, 7, 8] },
  { label: "8:45–9:45", hours: [9] },
  { label: "9:45–10:45", hours: [10] },
  { label: "10:45–11:45", hours: [11] },
  { label: "11:45–12:45", hours: [12] },
  { label: "12:45–1:45", hours: [13] },
  { label: "1:45–2:45", hours: [14] },
  { label: "2:45–3:45", hours: [15] },
  { label: "3:45–5:00", hours: [16] },
]

const sampleWhiteboard: Record<string, number[]> = {
  "Alex":   [1, 2, 2, 1, 1, 1, 1, 0, 0],
  "Jordan": [2, 2, 1, 2, 1, 2, 1, 0, 0],
  "Morgan": [0, 1, 2, 1, 1, 1, 0, 0, 0],
  "Casey":  [0, 1, 1, 0, 1, 1, 1, 0, 0],
  "Riley":  [0, 0, 1, 1, 0, 1, 0, 0, 0],
}

const sampleCINotes: CINote[] = [
  { id: 1, content: "Standardize ticket closure notes format across team", category: "process", createdBy: "Jordan", createdAt: "2026-03-12T09:00:00Z", status: "open" },
  { id: 2, content: "Add keyboard shortcuts for common ticket actions in CW", category: "tooling", createdBy: "Alex", createdAt: "2026-03-11T14:00:00Z", status: "in_progress" },
  { id: 3, content: "Review escalation SOP — too many tickets sitting in 'Waiting Internal'", category: "process", createdBy: "Morgan", createdAt: "2026-03-10T11:00:00Z", status: "open" },
]

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

/** Horizontal gradient gauge — maps projected cycle time vs TAKT */
function CycleTimeGauge({ actual, taktTarget }: { actual: number; taktTarget: number }) {
  const ratio = taktTarget > 0 ? actual / taktTarget : 1
  const pos = gaugePosition(ratio)
  const diff = actual - taktTarget
  const pctDiff = taktTarget > 0 ? Math.abs(diff / taktTarget * 100) : 0

  let statusText = "At TAKT Time ✓"
  let statusColor = COLORS.green
  if (Math.abs(diff) > taktTarget * 0.05) {
    statusText = diff > 0 ? `${pctDiff.toFixed(0)}% Above TAKT` : `${pctDiff.toFixed(0)}% Below TAKT`
    statusColor = pctDiff > 20 ? COLORS.red : COLORS.yellow
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-xs text-[#9ca3af] uppercase tracking-wider">Actual</p>
          <p className="text-2xl font-bold" style={{ color: COLORS.red }}>{actual.toFixed(1)} min</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#9ca3af] uppercase tracking-wider">TAKT Goal</p>
          <p className="text-2xl font-bold" style={{ color: COLORS.red }}>{taktTarget.toFixed(1)} min</p>
        </div>
      </div>
      {/* Gradient bar */}
      <div className="relative h-6 rounded-full overflow-hidden" style={{
        background: "linear-gradient(to right, #dc3545, #e66e32, #ffc107, #28a745, #28a745, #ffc107, #e66e32, #dc3545)"
      }}>
        {/* Center marker (TAKT target) */}
        <div className="absolute top-0 h-full w-0.5 bg-white" style={{ left: "50%" }} />
        {/* Triangle indicator */}
        <div className="absolute -top-1" style={{ left: `${pos}%`, transform: "translateX(-50%)" }}>
          <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-white" />
        </div>
      </div>
      <p className="text-center text-sm font-medium" style={{ color: statusColor }}>{statusText}</p>
    </div>
  )
}

/** Status badge — large animated pill matching WinTracker's signature look */
function StatusPill({ status, completed, goal }: { status: string; completed: number; goal: number }) {
  const info = getStatusBadge(status)
  const isRetro = false // placeholder; channel will signal retrospective mode
  const pct = goal > 0 ? Math.round((completed / goal) * 100) : 0

  // Retrospective overrides
  let label = `${info.emoji} ${info.label}`
  let bg = info.bg
  if (isRetro) {
    if (completed >= goal) { label = "🏆 WON THE DAY!"; bg = `linear-gradient(135deg, ${COLORS.green}, #20c997)` }
    else if (pct >= 90) { label = `📊 ${pct}% — CLOSE!`; bg = `linear-gradient(135deg, ${COLORS.yellow}, #ff9800)` }
    else { label = `📉 ${pct}% — MISSED GOAL`; bg = `linear-gradient(135deg, ${COLORS.red}, #c82333)` }
  }

  return (
    <div
      className={`inline-flex items-center px-4 py-2 rounded-full text-white font-bold text-sm tracking-wide ${info.animation}`}
      style={{ background: bg }}
    >
      {label}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════

function App() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const { connected, status: channelStatus } = useChannelStatus()

  // Channel data hooks — live data when connected to mHive
  const { data: setupData } = useChannelData<DailySetup>("daily_setup")
  const { data: hourlyData } = useChannelData<HourlyMetric>("hourly_metrics")
  const { data: techPerfData } = useChannelData<TechPerformance>("tech_performance")
  const { data: ticketData } = useChannelData<ClosedTicket>("closed_tickets")
  const { data: ciNotesData } = useChannelData<CINote>("ci_notes")
  const { data: kpaData } = useChannelData<HuddleKPA>("huddle_kpas")

  // Live clock (1s tick)
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Use channel data when available, sample data otherwise
  const setup = setupData.length > 0 ? setupData[0] : sampleSetup
  const hourly = hourlyData.length > 0 ? hourlyData : sampleHourly
  const techs = techPerfData.length > 0 ? techPerfData : sampleTechs
  const tickets = ticketData.length > 0 ? ticketData : []
  const ciNotes = ciNotesData.length > 0 ? ciNotesData : sampleCINotes
  const kpas = kpaData || []

  // ── Derived metrics ──
  const totalClosed = techs.reduce((s, t) => s + t.ticketsClosed, 0)
  const goalPct = setup.dailyGoal > 0 ? Math.round((totalClosed / setup.dailyGoal) * 100) : 0
  const currentHour = currentTime.getHours()
  const elapsedHours = Math.max(0, Math.min(9, currentHour - 8))
  const hourlyTarget = setup.dailyGoal / 9
  const expectedNow = Math.round(elapsedHours * hourlyTarget)

  // Team status
  const overallStatus = totalClosed >= expectedNow * 1.1 ? "ahead"
    : totalClosed >= expectedNow * 0.9 ? "on_pace" : "behind"

  // Adjusted TAKT (from effective minutes / goal)
  const adjustedTakt = setup.dailyGoal > 0 ? setup.totalEffectiveMinutes / setup.dailyGoal : 0

  // Current team cycle time (effective minutes elapsed / tickets closed)
  const effectiveElapsed = elapsedHours > 0 ? (setup.totalEffectiveMinutes * (elapsedHours / 9)) : 0
  const currentCycleTime = totalClosed > 0 ? effectiveElapsed / totalClosed : 0

  // Forecast: project to EOD based on current pace
  const currentPace = elapsedHours > 0 ? totalClosed / elapsedHours : 0
  const projectedTotal = elapsedHours > 0 ? Math.round(currentPace * 9) : 0
  const paceNeeded = (9 - elapsedHours) > 0 ? (setup.dailyGoal - totalClosed) / (9 - elapsedHours) : 0

  // Chart data: mixed bar + line
  const chartData = hourly.map(h => ({
    name: h.hourLabel,
    tickets: h.ticketsClosed,
    cumulative: h.cumulativeTickets,
    target: h.targetCumulative,
  }))

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/New_York" })

  // Whiteboard data: use channel tech data or sample
  const whiteboardTechs = connected ? techs.map(t => t.techName) : SAMPLE_TECHS
  const whiteboardData = connected ? {} as Record<string, number[]> : sampleWhiteboard

  return (
    <TooltipProvider>
      <div className="min-h-screen p-4 md:p-6">
        <div className="mx-auto max-w-[1400px] space-y-5">

          {/* ═══ HEADER ═══ */}
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: COLORS.orange }}>
                  WinTracker
                </h1>
                <span className="text-lg text-[#9ca3af]">Win the Hour, Win the Day</span>
              </div>
              <p className="text-sm text-[#9ca3af]">{setup.date}</p>
            </div>
            <div className="flex items-center gap-4">
              <StatusPill status={overallStatus} completed={totalClosed} goal={setup.dailyGoal} />
              <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
                <Clock className="h-4 w-4" />
                <span className="font-mono text-base font-semibold text-white">{formatTime(currentTime)}</span>
                <span>ET</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-xs text-[#9ca3af]">{connected ? "Live" : "Offline"}</span>
              </div>
            </div>
          </header>

          {/* ═══ TOP METRIC CARDS — 4-up ═══ */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Baseline TAKT — ALWAYS RED */}
            <Card className="border-t-2" style={{ borderTopColor: COLORS.red }}>
              <CardHeader className="pb-1">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs uppercase tracking-wider">Baseline TAKT Time</CardDescription>
                  <Timer className="h-4 w-4" style={{ color: COLORS.red }} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold" style={{ color: COLORS.red }}>
                  {setup.taktTime.toFixed(1)}<span className="text-base font-normal ml-1">min/ticket</span>
                </p>
                <p className="text-[10px] text-[#9ca3af] mt-1 italic">TAKT is always red — Taiichi Ohno</p>
              </CardContent>
            </Card>

            {/* Adjusted TAKT / Cycle Time — ALWAYS RED */}
            <Card className="border-t-2" style={{ borderTopColor: COLORS.red }}>
              <CardHeader className="pb-1">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs uppercase tracking-wider">
                    {elapsedHours >= 9 ? "Actual Cycle Time" : "Adjusted TAKT"}
                  </CardDescription>
                  <Gauge className="h-4 w-4" style={{ color: COLORS.red }} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold" style={{ color: COLORS.red }}>
                  {adjustedTakt.toFixed(1)}<span className="text-base font-normal ml-1">min/ticket</span>
                </p>
                <p className="text-[10px] text-[#9ca3af] mt-1">
                  {setup.totalEffectiveMinutes.toLocaleString()} effective min / {setup.dailyGoal} goal
                </p>
              </CardContent>
            </Card>

            {/* Team Progress — Blue progress bar */}
            <Card className="border-t-2" style={{ borderTopColor: COLORS.blue }}>
              <CardHeader className="pb-1">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs uppercase tracking-wider">Team Progress</CardDescription>
                  <Target className="h-4 w-4" style={{ color: COLORS.blue }} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-white">{totalClosed}</p>
                  <p className="text-base text-[#9ca3af]">/ {setup.dailyGoal} tickets</p>
                </div>
                <div className="mt-2 h-3 rounded-full overflow-hidden bg-[#1a1a2e]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(goalPct, 100)}%`, backgroundColor: progressBarColor(goalPct) }}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: progressBarColor(goalPct) }}>{goalPct}% of goal</p>
              </CardContent>
            </Card>

            {/* EOD Forecast — Teal */}
            <Card className="border-t-2" style={{ borderTopColor: COLORS.teal }}>
              <CardHeader className="pb-1">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs uppercase tracking-wider">EOD Forecast</CardDescription>
                  <TrendingUp className="h-4 w-4" style={{ color: COLORS.teal }} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold" style={{ color: COLORS.teal }}>
                  {projectedTotal > 0 ? projectedTotal : "—"}<span className="text-base font-normal ml-1">projected</span>
                </p>
                <p className="text-xs text-[#9ca3af] mt-1">
                  Pace: {currentPace.toFixed(1)}/hr · Need: {paceNeeded.toFixed(1)}/hr
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ═══ MAIN CONTENT — Tabbed ═══ */}
          <Tabs defaultValue="hourly" className="space-y-4">
            <TabsList className="bg-[#1a1a2e]">
              <TabsTrigger value="hourly">
                <BarChart3 className="h-4 w-4 mr-1.5" />Hourly Dashboard
              </TabsTrigger>
              <TabsTrigger value="eod">
                <FileText className="h-4 w-4 mr-1.5" />EOD Report
              </TabsTrigger>
              <TabsTrigger value="ci">
                <AlertTriangle className="h-4 w-4 mr-1.5" />CI Notes
              </TabsTrigger>
            </TabsList>

            {/* ── HOURLY DASHBOARD TAB ── */}
            <TabsContent value="hourly" className="space-y-5">
              <div className="grid gap-5 lg:grid-cols-3">
                {/* Hourly Tracker Chart — 2/3 width */}
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Hourly Progress Tracker</CardTitle>
                    <CardDescription>Blue bars = tickets this hour · Orange line = cumulative · Green dashed = target</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer className="h-[320px]">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.1)" />
                        <XAxis dataKey="name" tick={{ fill: COLORS.muted, fontSize: 11 }} />
                        <YAxis tick={{ fill: COLORS.muted, fontSize: 11 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="tickets" fill={`${COLORS.blue}B3`} radius={[4, 4, 0, 0]} name="Tickets This Hour" />
                        <Line type="monotone" dataKey="cumulative" stroke={COLORS.orange} strokeWidth={3} dot={{ r: 4, fill: COLORS.orange }} name="Cumulative Actual" />
                        <Line type="monotone" dataKey="target" stroke={COLORS.green} strokeWidth={2} strokeDasharray="10 5" dot={false} name="Required Tickets" />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* Cycle Time Gauge — 1/3 width */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Cycle Time vs TAKT</CardTitle>
                    <CardDescription>Projected performance against baseline</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CycleTimeGauge actual={currentCycleTime > 0 ? currentCycleTime : adjustedTakt * 0.97} taktTarget={setup.taktTime} />
                    <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] text-[#9ca3af] uppercase">Current Pace</p>
                        <p className="text-lg font-bold text-white">{currentPace.toFixed(1)}/hr</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#9ca3af] uppercase">Target Pace</p>
                        <p className="text-lg font-bold text-white">{hourlyTarget.toFixed(1)}/hr</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#9ca3af] uppercase">Techs Active</p>
                        <p className="text-lg font-bold text-white">{setup.techCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Whiteboard Grid — Tech columns × Time slot rows */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Technologist Performance Grid</CardTitle>
                  <CardDescription>Whiteboard view — time slots × technologists</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-28 text-xs">Time Slot</TableHead>
                        {whiteboardTechs.map(name => (
                          <TableHead key={name} className="text-center text-xs" style={{ color: COLORS.blue }}>{name}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {TIME_SLOTS.map((slot, si) => (
                        <TableRow key={slot.label} className={slot.hours.includes(currentHour) ? "bg-white/5" : ""}>
                          <TableCell className="text-xs font-medium text-[#9ca3af]">{slot.label}</TableCell>
                          {whiteboardTechs.map(name => {
                            const val = whiteboardData[name]?.[si] ?? 0
                            return (
                              <TableCell key={name} className="text-center font-mono">
                                {val > 0 ? <span className="text-white">{val}</span> : <span className="text-[#333]">—</span>}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                      {/* TOTAL row */}
                      <TableRow className="border-t-2 border-[#333]">
                        <TableCell className="text-xs font-bold uppercase">Total</TableCell>
                        {whiteboardTechs.map(name => {
                          const total = (whiteboardData[name] || []).reduce((s, v) => s + v, 0)
                          const tech = techs.find(t => t.techName === name)
                          const goal = tech?.personalGoal || 0
                          const color = total >= goal ? COLORS.green : total >= goal * 0.75 ? COLORS.yellow : COLORS.red
                          return (
                            <TableCell key={name} className="text-center font-bold" style={{ color }}>{total}</TableCell>
                          )
                        })}
                      </TableRow>
                      {/* GOAL row */}
                      <TableRow>
                        <TableCell className="text-xs font-bold uppercase" style={{ color: COLORS.green }}>Goal</TableCell>
                        {whiteboardTechs.map(name => {
                          const tech = techs.find(t => t.techName === name)
                          return (
                            <TableCell key={name} className="text-center font-bold" style={{ color: COLORS.green }}>
                              {tech?.personalGoal || "—"}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Hourly Breakdown Detail Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Hourly Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Hour</TableHead>
                        <TableHead className="text-right text-xs">Closed</TableHead>
                        <TableHead className="text-right text-xs">Cumulative</TableHead>
                        <TableHead className="text-right text-xs">Target</TableHead>
                        <TableHead className="text-right text-xs">Variance</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hourly.map(row => (
                        <TableRow key={row.hour} className={row.hour === currentHour ? "bg-white/5" : ""}>
                          <TableCell className="font-medium text-sm">{row.hourLabel}</TableCell>
                          <TableCell className="text-right font-mono">{row.ticketsClosed}</TableCell>
                          <TableCell className="text-right font-mono">{row.cumulativeTickets}</TableCell>
                          <TableCell className="text-right font-mono text-[#9ca3af]">{row.targetCumulative}</TableCell>
                          <TableCell className="text-right font-mono font-medium" style={{
                            color: row.variance > 0 ? COLORS.green : row.variance < 0 ? COLORS.red : COLORS.muted
                          }}>
                            {row.variance > 0 ? "+" : ""}{row.variance}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{
                              backgroundColor: `${getStatusColor(row.status)}20`,
                              color: getStatusColor(row.status),
                            }}>
                              {row.status === "ahead" ? "🟢" : row.status === "on_pace" ? "🟡" : "🔴"} {row.status.replace("_", " ").toUpperCase()}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── EOD REPORT TAB ── */}
            <TabsContent value="eod" className="space-y-5">
              {/* Tech Performance Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Individual Technologist Performance</CardTitle>
                  <CardDescription>Cycle time, goal progress, and status per team member</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Technologist</TableHead>
                        <TableHead className="text-right text-xs">Tickets</TableHead>
                        <TableHead className="text-right text-xs">Goal</TableHead>
                        <TableHead className="text-right text-xs">Avg Cycle (min)</TableHead>
                        <TableHead className="text-xs">vs TAKT</TableHead>
                        <TableHead className="text-xs">Progress</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {techs.map(tech => {
                        const vsTakt = tech.avgCycleTime <= setup.taktTime ? "At/Below" : "Above"
                        return (
                          <TableRow key={tech.techId}>
                            <TableCell className="font-medium" style={{ color: COLORS.blue }}>{tech.techName}</TableCell>
                            <TableCell className="text-right font-mono">{tech.ticketsClosed}</TableCell>
                            <TableCell className="text-right font-mono text-[#9ca3af]">{tech.personalGoal}</TableCell>
                            <TableCell className="text-right font-mono" style={{
                              color: vsTakt === "Above" ? COLORS.red : COLORS.green
                            }}>{tech.avgCycleTime}</TableCell>
                            <TableCell>
                              <span className="text-xs font-medium" style={{
                                color: vsTakt === "Above" ? COLORS.red : COLORS.green
                              }}>{vsTakt} TAKT</span>
                            </TableCell>
                            <TableCell className="w-32">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 rounded-full overflow-hidden bg-[#1a1a2e]">
                                  <div className="h-full rounded-full" style={{
                                    width: `${Math.min(tech.goalProgress, 100)}%`,
                                    backgroundColor: progressBarColor(tech.goalProgress),
                                  }} />
                                </div>
                                <span className="text-xs text-[#9ca3af]">{tech.goalProgress}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{
                                backgroundColor: `${getStatusColor(tech.status)}20`,
                                color: getStatusColor(tech.status),
                              }}>
                                {tech.status === "ahead" ? "🟢" : tech.status === "on_pace" ? "🟡" : "🔴"} {tech.status.replace("_", " ").toUpperCase()}
                              </span>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Summary metrics row */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-1">
                    <CardDescription className="text-xs uppercase tracking-wider">Team TAKT Time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold" style={{ color: COLORS.red }}>{setup.taktTime.toFixed(1)} min</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1">
                    <CardDescription className="text-xs uppercase tracking-wider">Team Cycle Time Avg</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold" style={{ color: currentCycleTime <= setup.taktTime ? COLORS.green : COLORS.red }}>
                      {currentCycleTime > 0 ? currentCycleTime.toFixed(1) : adjustedTakt.toFixed(1)} min
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1">
                    <CardDescription className="text-xs uppercase tracking-wider">KPA Goal vs KPI</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-white">{setup.dailyGoal} <span className="text-base text-[#9ca3af]">goal</span> / {totalClosed} <span className="text-base" style={{ color: COLORS.blue }}>actual</span></p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1">
                    <CardDescription className="text-xs uppercase tracking-wider">Active Technologists</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-white">{setup.techCount}</p>
                    <p className="text-xs text-[#9ca3af]">{setup.totalEffectiveMinutes.toLocaleString()} effective minutes</p>
                  </CardContent>
                </Card>
              </div>

              {/* Cycle Time Gauge (EOD context) */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Team Cycle Time vs TAKT</CardTitle>
                </CardHeader>
                <CardContent>
                  <CycleTimeGauge actual={currentCycleTime > 0 ? currentCycleTime : adjustedTakt * 0.97} taktTarget={setup.taktTime} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── CI NOTES TAB ── */}
            <TabsContent value="ci" className="space-y-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Continuous Process Improvements</CardTitle>
                  <CardDescription>Team observations and improvement items</CardDescription>
                </CardHeader>
                <CardContent>
                  {ciNotes.length === 0 ? (
                    <p className="text-[#9ca3af] text-center py-8">No CI notes available</p>
                  ) : (
                    <div className="space-y-3">
                      {ciNotes.map(note => (
                        <div key={note.id} className="flex gap-3 p-3 rounded-lg bg-white/5">
                          <div className="flex-1">
                            <p className="text-sm text-white">{note.content}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-[#9ca3af]">{note.category}</span>
                              <span className="text-[10px] text-[#9ca3af]">by {note.createdBy}</span>
                              <span className="text-[10px] text-[#9ca3af]">{new Date(note.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <span className="inline-flex items-center self-start rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{
                            backgroundColor: note.status === "open" ? `${COLORS.yellow}20` : note.status === "in_progress" ? `${COLORS.blue}20` : `${COLORS.green}20`,
                            color: note.status === "open" ? COLORS.yellow : note.status === "in_progress" ? COLORS.blue : COLORS.green,
                          }}>
                            {note.status.replace("_", " ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

        </div>
      </div>
    </TooltipProvider>
  )
}

export default App
