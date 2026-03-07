import { useState } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { technicianConfig, ticketData } from "@/data/tickets"
import type { TechKey } from "@/data/tickets"
import TechnicianAnalytics from "@/pages/TechnicianAnalytics"

// Virtual Endpoint payload structure — AI agent replaces this with real data
const endpointContext = {
  strategy: "merge",
  space: { id: "", name: "Data Space", base_path: "/" },
  endpoint: { path: "/data", method: "GET", description: "Sample data endpoint" },
  sources: ["source_a", "source_b"],
  execution_time_ms: 0,
  record_count: 0,
  cache_hit: false,
}

const collections = [
  {
    key: "source_a",
    title: "Source A",
    description: "Records from Source A",
    record_count: 3,
    schema: { id: "string", name: "string", value: "number", status: "string" },
    records: [
      { id: "1", name: "Item A", value: 100, status: "Active" },
      { id: "2", name: "Item B", value: 250, status: "Pending" },
      { id: "3", name: "Item C", value: 180, status: "Active" },
    ],
  },
]

const insights = {
  total_collections: 1,
  total_records: 3,
  shared_fields: {},
  recommended_use: "Replace this with live Virtual Endpoint data from mSpace.",
}

function App() {
  const [page, setPage] = useState<"dashboard" | "analytics">("dashboard")
  const [activeTechs, setActiveTechs] = useState<Set<TechKey>>(
    new Set(Object.keys(technicianConfig) as TechKey[])
  )

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

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-1">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{endpointContext.space.name}</h1>
              <p className="text-muted-foreground">{endpointContext.endpoint.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex rounded-md border overflow-hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`rounded-none ${page === "dashboard" ? "bg-muted" : ""}`}
                  onClick={() => setPage("dashboard")}
                >
                  Dashboard
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`rounded-none ${page === "analytics" ? "bg-muted" : ""}`}
                  onClick={() => setPage("analytics")}
                >
                  Analytics
                </Button>
              </div>
              <Badge variant={endpointContext.cache_hit ? "default" : "secondary"}>
                {endpointContext.cache_hit ? "Cached" : "Live"}
              </Badge>
            </div>
          </div>
        </header>

        <Separator />

        {page === "analytics" && <TechnicianAnalytics />}

        {/* Summary stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Records</CardDescription>
              <CardTitle className="text-4xl">{insights.total_records}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Collections</CardDescription>
              <CardTitle className="text-4xl">{insights.total_collections}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Strategy</CardDescription>
              <CardTitle className="text-2xl capitalize">{endpointContext.strategy}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Execution Time</CardDescription>
              <CardTitle className="text-2xl">{endpointContext.execution_time_ms}ms</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Tickets per technician — area chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>Completed Tickets per Day</CardTitle>
                <CardDescription>February 2025 · by technician</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(technicianConfig) as TechKey[]).map((key) => {
                  const active = activeTechs.has(key)
                  return (
                    <Button
                      key={key}
                      variant={active ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleTech(key)}
                      style={active ? { backgroundColor: technicianConfig[key].color, borderColor: technicianConfig[key].color } : { borderColor: technicianConfig[key].color, color: technicianConfig[key].color }}
                    >
                      {technicianConfig[key].label as string}
                    </Button>
                  )
                })}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={technicianConfig} className="h-72 w-full">
              <AreaChart data={ticketData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  {(Object.keys(technicianConfig) as TechKey[]).map((key) => (
                    <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={technicianConfig[key].color as string} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={technicianConfig[key].color as string} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={3}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <ChartLegend content={<ChartLegendContent />} />
                {(Object.keys(technicianConfig) as TechKey[]).map((key) =>
                  activeTechs.has(key) ? (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={technicianConfig[key].color as string}
                      strokeWidth={2}
                      fill={`url(#grad-${key})`}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ) : null
                )}
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Collections as tabs */}
        <Tabs defaultValue={collections[0]?.key ?? "data"}>
          <TabsList>
            {collections.map((col) => (
              <TabsTrigger key={col.key} value={col.key}>{col.title}</TabsTrigger>
            ))}
          </TabsList>

          {collections.map((col) => (
            <TabsContent key={col.key} value={col.key} className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{col.title}</CardTitle>
                      <CardDescription>{col.description}</CardDescription>
                    </div>
                    <Badge variant="outline">{col.record_count} records</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(col.schema).map((field) => (
                          <TableHead key={field} className="capitalize">{field.replace(/_/g, " ")}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {col.records.map((record, i) => (
                        <TableRow key={i}>
                          {Object.keys(col.schema).map((field) => (
                            <TableCell key={field}>
                              {String((record as Record<string, unknown>)[field] ?? "")}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Insights panel */}
        {insights.recommended_use && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{insights.recommended_use}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default App
