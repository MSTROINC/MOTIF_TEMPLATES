import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Sample data for tickets
const tickets = [
  {
    id: "1",
    ticketId: "TKT-1001",
    age: 2,
    status: "Open",
    companyName: "Acme Corp",
    contact: "John Doe",
    summary: "Server connectivity issues in regional office",
    owner: "Alex Smith",
    resources: "None",
    dateOpen: "2026-03-10 09:00",
    lastUpdated: "2026-03-11 14:30",
    type: "Incident",
    subType: "Network",
    item: "Router",
    configurations: "RTR-NYC-01",
    externalNotes: "Customer reported intermittent drops.",
    internalNotes: "Checking firmware version on the core switch.",
  },
  {
    id: "2",
    ticketId: "TKT-1002",
    age: 5,
    status: "Pending Close",
    companyName: "Globex",
    contact: "Jane Miller",
    summary: "Software license renewal",
    owner: "Sarah Johnson",
    resources: "Finance Team",
    dateOpen: "2026-03-07 11:00",
    lastUpdated: "2026-03-12 10:15",
    type: "Service Request",
    subType: "Software",
    item: "License",
    configurations: "LIC-MS-365",
    externalNotes: "Awaiting final approval from procurement.",
    internalNotes: "All documents uploaded.",
  },
]

const stats = {
  currentOpen: 24,
  openThisWeek: 12,
  closedThisWeek: 8,
  pendingClose: 5,
}

function App() {
  const [selectedTicket, setSelectedTicket] = useState<typeof tickets[0] | null>(null)

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return "bg-blue-100 text-blue-700 border-blue-200"
      case "pending close":
        return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "closed":
        return "bg-green-100 text-green-700 border-green-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Ticket Dashboard</h1>
          <p className="text-muted-foreground">Manage and track service tickets</p>
        </header>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Open Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.currentOpen}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets Open This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.openThisWeek}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets Closed This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.closedThisWeek}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets Pending Close</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingClose}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tickets Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Tickets</CardTitle>
            <CardDescription>A list of tickets requiring attention.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Age (Days)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Date Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow 
                    key={ticket.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <TableCell className="font-medium">{ticket.ticketId}</TableCell>
                    <TableCell>{ticket.age}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(ticket.status)}>
                        {ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{ticket.companyName}</TableCell>
                    <TableCell>{ticket.contact}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{ticket.summary}</TableCell>
                    <TableCell>{ticket.owner}</TableCell>
                    <TableCell className="text-xs">{ticket.dateOpen}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Ticket Details Modal */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTicket?.ticketId}
              <Badge variant="outline" className={selectedTicket ? getStatusColor(selectedTicket.status) : ""}>
                {selectedTicket?.status}
              </Badge>
            </DialogTitle>
            <DialogDescription>{selectedTicket?.summary}</DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold block">Type:</span>
                  <span className="text-muted-foreground">{selectedTicket.type}</span>
                </div>
                <div>
                  <span className="font-semibold block">Sub-Type:</span>
                  <span className="text-muted-foreground">{selectedTicket.subType}</span>
                </div>
                <div>
                  <span className="font-semibold block">Item:</span>
                  <span className="text-muted-foreground">{selectedTicket.item}</span>
                </div>
                <div>
                  <span className="font-semibold block">Configurations:</span>
                  <span className="text-muted-foreground">{selectedTicket.configurations}</span>
                </div>
                <div>
                  <span className="font-semibold block">Last Updated:</span>
                  <span className="text-muted-foreground">{selectedTicket.lastUpdated}</span>
                </div>
                <div>
                  <span className="font-semibold block">Resources:</span>
                  <span className="text-muted-foreground">{selectedTicket.resources}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-md bg-muted p-4">
                  <h4 className="font-semibold mb-2 text-sm">External Notes</h4>
                  <p className="text-sm text-muted-foreground">{selectedTicket.externalNotes}</p>
                </div>
                <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-4 border border-blue-100 dark:border-blue-900">
                  <h4 className="font-semibold mb-2 text-sm text-blue-900 dark:text-blue-100">Internal Notes</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">{selectedTicket.internalNotes}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end mt-4">
            <Button onClick={() => setSelectedTicket(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
