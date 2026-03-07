import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  CHART_COLORS,
} from "@/components/ui/chart"

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
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-1">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{endpointContext.space.name}</h1>
              <p className="text-muted-foreground">{endpointContext.endpoint.description}</p>
            </div>
            <Badge variant={endpointContext.cache_hit ? "info" : "secondary"}>
              {endpointContext.cache_hit ? "Cached" : "Live"}
            </Badge>
          </div>
        </header>

        <Separator />

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
