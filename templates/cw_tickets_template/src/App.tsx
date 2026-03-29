import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "@/components/ui/chart"

const USE_MOCK = true

const MOCK_DATA: DayData[] = [
  { label: "Mon", date: "", isFriday: false, tickets: 32 },
  { label: "Tue", date: "", isFriday: false, tickets: 41 },
  { label: "Wed", date: "", isFriday: false, tickets: 37 },
  { label: "Thu", date: "", isFriday: false, tickets: 45 },
  { label: "Fri", date: "", isFriday: true,  tickets: 39 },
]

// Uses Vite proxy — requests to /api are forwarded to wintracker on port 3000
const WINTRACKER_URL = ""

type DayData = {
  label: string
  date: string
  isFriday: boolean
  tickets: number
}

function getWeekDates(): Omit<DayData, "tickets">[] {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))

  return ["Mon", "Tue", "Wed", "Thu", "Fri"].map((label, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return {
      label,
      date: d.toISOString().split("T")[0],
      isFriday: i === 4,
    }
  })
}

// ─── SpaceKit Data ──────────────────────────────────────────
// No SpaceKits declared — this template reads CW data via channels only.
// The rushed-agent can add SQLite/Redis hooks here if local persistence is needed.

function App() {
  const [days, setDays] = useState<DayData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (USE_MOCK) {
      setDays(MOCK_DATA)
      setLoading(false)
      return
    }

    const weekDates = getWeekDates()

    Promise.all(
      weekDates.map(async (day) => {
        try {
          const res = await fetch(`${WINTRACKER_URL}/api/dashboard/data?date=${day.date}`)
          if (!res.ok) return { ...day, tickets: 0 }
          const json = await res.json()
          const data = json.data ?? json
          return {
            ...day,
            tickets: (data.regularHoursTickets || 0) + (data.afterHoursTickets || 0),
          }
        } catch {
          return { ...day, tickets: 0 }
        }
      })
    )
      .then((results) => {
        setDays(results)
        setLoading(false)
      })
      .catch(() => {
        setError("Could not connect to WinTracker. Make sure it's running on port 3000.")
        setLoading(false)
      })
  }, [])

  const totalTickets = days.reduce((sum, d) => sum + d.tickets, 0)
  const fridayTickets = days.find((d) => d.isFriday)?.tickets ?? 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F4F4F4" }}>
        <p style={{ color: "#6b6b6b", fontFamily: "Open Sans, sans-serif" }}>
          Loading ticket data from WinTracker...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F4F4F4" }}>
        <p style={{ color: "#dc3545" }}>{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: "#F4F4F4" }}>

      {/* Navbar */}
      <nav style={{
        background: "linear-gradient(135deg, #045ea9, #0672c4)",
        borderBottom: "2px solid #e66e32",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        padding: "0.75rem 1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
      }}>
        <span style={{
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 700,
          fontSize: "1.1rem",
          color: "#ffffff",
          letterSpacing: "0.02em",
        }}>
          DataCorps
        </span>
        <span style={{
          width: "1px",
          height: "1.25rem",
          background: "rgba(255,255,255,0.3)",
        }} />
        <span style={{
          fontFamily: "Open Sans, sans-serif",
          fontSize: "0.9rem",
          color: "rgba(255,255,255,0.85)",
        }}>
          WinTracker™
        </span>
      </nav>

      {/* Content */}
      <div className="p-8">
        <div className="max-w-2xl mx-auto space-y-6">

          <div>
            <h1 style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 700,
              fontSize: "1.75rem",
              color: "#045ea9",
              margin: 0,
            }}>
              Ticket Count This Week
            </h1>
            <p style={{ color: "#6b6b6b", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              Live from ConnectWise via WinTracker
            </p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card style={{
              background: "rgba(255,255,255,0.85)",
              border: "1px solid #e6e6e6",
              borderRadius: "10px",
              backdropFilter: "blur(12px)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            }}>
              <CardHeader className="pb-2">
                <CardTitle style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#e66e32",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}>
                  Total This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p style={{ fontSize: "2.5rem", fontWeight: 700, color: "#045ea9", lineHeight: 1 }}>
                  {totalTickets}
                </p>
              </CardContent>
            </Card>

            <Card style={{
              background: "rgba(255,255,255,0.85)",
              border: "1px solid #e6e6e6",
              borderRadius: "10px",
              backdropFilter: "blur(12px)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            }}>
              <CardHeader className="pb-2">
                <CardTitle style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#e66e32",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}>
                  Friday Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p style={{ fontSize: "2.5rem", fontWeight: 700, color: "#e66e32", lineHeight: 1 }}>
                  {fridayTickets}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card style={{
            background: "rgba(255,255,255,0.85)",
            border: "1px solid #e6e6e6",
            borderRadius: "10px",
            backdropFilter: "blur(12px)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          }}>
            <CardHeader style={{ borderBottom: "1px solid #e6e6e6" }}>
              <CardTitle style={{
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 600,
                color: "#045ea9",
              }}>
                Tickets Per Day
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ChartContainer className="h-64">
                <BarChart data={days}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e6e6" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontFamily: "Open Sans, sans-serif", fontSize: 13, fill: "#6b6b6b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontFamily: "Open Sans, sans-serif", fontSize: 12, fill: "#6b6b6b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="tickets" name="Tickets" radius={[6, 6, 0, 0]}>
                    {days.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.isFriday ? "#e66e32" : "#045ea9"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
              <div className="flex items-center gap-4 mt-3" style={{ fontSize: "0.8rem", color: "#6b6b6b" }}>
                <span className="flex items-center gap-1.5">
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: "#045ea9", display: "inline-block" }} />
                  Regular days
                </span>
                <span className="flex items-center gap-1.5">
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: "#e66e32", display: "inline-block" }} />
                  Friday
                </span>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}

export default App
