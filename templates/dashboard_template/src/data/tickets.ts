import type { ChartConfig } from "@/components/ui/chart"

export const technicianConfig: ChartConfig = {
  alice:  { label: "Alice",  color: "#6366f1" },
  bob:    { label: "Bob",    color: "#22c55e" },
  carlos: { label: "Carlos", color: "#f59e0b" },
  diana:  { label: "Diana",  color: "#ec4899" },
}

export type TechKey = "alice" | "bob" | "carlos" | "diana"
export type TicketDay = { date: string } & Record<TechKey, number>

// Feb 2025 — daily completed tickets per technician
// Feb 1 = Saturday; weekends show reduced/no activity
export const ticketData: TicketDay[] = [
  { date: "Feb 1",  alice: 2,  bob: 1,  carlos: 0,  diana: 3  },
  { date: "Feb 2",  alice: 1,  bob: 0,  carlos: 0,  diana: 2  },
  { date: "Feb 3",  alice: 7,  bob: 11, carlos: 5,  diana: 6  },
  { date: "Feb 4",  alice: 9,  bob: 13, carlos: 8,  diana: 7  },
  { date: "Feb 5",  alice: 6,  bob: 9,  carlos: 12, diana: 8  },
  { date: "Feb 6",  alice: 10, bob: 14, carlos: 4,  diana: 6  },
  { date: "Feb 7",  alice: 8,  bob: 7,  carlos: 9,  diana: 9  },
  { date: "Feb 8",  alice: 3,  bob: 2,  carlos: 1,  diana: 4  },
  { date: "Feb 9",  alice: 0,  bob: 1,  carlos: 0,  diana: 2  },
  { date: "Feb 10", alice: 9,  bob: 12, carlos: 6,  diana: 7  },
  { date: "Feb 11", alice: 7,  bob: 10, carlos: 11, diana: 5  },
  { date: "Feb 12", alice: 11, bob: 8,  carlos: 3,  diana: 9  },
  { date: "Feb 13", alice: 6,  bob: 15, carlos: 7,  diana: 6  },
  { date: "Feb 14", alice: 8,  bob: 9,  carlos: 10, diana: 8  },
  { date: "Feb 15", alice: 2,  bob: 3,  carlos: 0,  diana: 1  },
  { date: "Feb 16", alice: 1,  bob: 0,  carlos: 2,  diana: 3  },
  { date: "Feb 17", alice: 10, bob: 11, carlos: 5,  diana: 7  },
  { date: "Feb 18", alice: 7,  bob: 13, carlos: 9,  diana: 4  },
  { date: "Feb 19", alice: 12, bob: 6,  carlos: 4,  diana: 10 },
  { date: "Feb 20", alice: 5,  bob: 14, carlos: 12, diana: 6  },
  { date: "Feb 21", alice: 9,  bob: 10, carlos: 7,  diana: 8  },
  { date: "Feb 22", alice: 3,  bob: 2,  carlos: 1,  diana: 4  },
  { date: "Feb 23", alice: 0,  bob: 1,  carlos: 0,  diana: 2  },
  { date: "Feb 24", alice: 8,  bob: 12, carlos: 6,  diana: 7  },
  { date: "Feb 25", alice: 11, bob: 9,  carlos: 10, diana: 5  },
  { date: "Feb 26", alice: 6,  bob: 15, carlos: 8,  diana: 9  },
  { date: "Feb 27", alice: 9,  bob: 7,  carlos: 3,  diana: 11 },
  { date: "Feb 28", alice: 7,  bob: 11, carlos: 9,  diana: 6  },
]
