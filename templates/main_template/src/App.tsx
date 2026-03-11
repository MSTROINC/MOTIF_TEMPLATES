import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Button } from "@/components/ui/button"

// Sample data - will be replaced by dataspace data
const tableData = [
  { id: 1, name: "Item A", value: 100, status: "Active" },
  { id: 2, name: "Item B", value: 250, status: "Pending" },
  { id: 3, name: "Item C", value: 180, status: "Active" },
  { id: 4, name: "Item D", value: 320, status: "Inactive" },
]

const chartData = [
  { name: "Jan", value: 400 },
  { name: "Feb", value: 300 },
  { name: "Mar", value: 500 },
  { name: "Apr", value: 280 },
  { name: "May", value: 590 },
  { name: "Jun", value: 430 },
]

function App() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">mSpace Dataspace</h1>
          <p className="text-muted-foreground">
            Interactive data visualization powered by shadcn/ui
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Chart Card */}
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>Monthly performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer className="h-[300px]">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Items</CardDescription>
                <CardTitle className="text-4xl">{tableData.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Value</CardDescription>
                <CardTitle className="text-4xl">
                  {tableData.reduce((sum, item) => sum + item.value, 0)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active</CardDescription>
                <CardTitle className="text-4xl">
                  {tableData.filter((item) => item.status === "Active").length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Average</CardDescription>
                <CardTitle className="text-4xl">
                  {Math.round(tableData.reduce((sum, item) => sum + item.value, 0) / tableData.length)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Data Table</CardTitle>
                <CardDescription>Complete dataset overview</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.value}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          row.status === "Active"
                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            : row.status === "Pending"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {row.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App
