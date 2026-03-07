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
  const day = now.getDay() // 0=Sun, 1=Mon ... 6=Sat
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading ticket data from WinTracker...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Ticket Count This Week</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Live from ConnectWise via WinTracker
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalTickets}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Friday Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" style={{ color: "hsl(var(--chart-3))" }}>
                {fridayTickets}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tickets Per Day</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-64">
              <BarChart data={days}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="tickets" name="Tickets" radius={[4, 4, 0, 0]}>
                  {days.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.isFriday ? "hsl(var(--chart-3))" : "hsl(var(--chart-1))"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App
