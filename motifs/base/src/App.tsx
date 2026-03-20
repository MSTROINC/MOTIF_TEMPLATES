import { useEffect } from "react";
import { initChannel, disconnectChannel, useChannelStatus, useChannelData } from "@/lib/channel-client";
import { Activity, TrendingUp, Users, Wifi, WifiOff } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────
interface PrimaryRecord {
  id: string;
  name: string;
  value: number;
  status: "active" | "pending" | "inactive";
}

interface MetricRecord {
  label: string;
  value: number;
}

// ─── Mock Data ──────────────────────────────────────────────
const MOCK_PRIMARY: PrimaryRecord[] = [
  { id: "1", name: "Alpha", value: 1250, status: "active" },
  { id: "2", name: "Bravo", value: 830, status: "active" },
  { id: "3", name: "Charlie", value: 475, status: "pending" },
  { id: "4", name: "Delta", value: 2100, status: "inactive" },
  { id: "5", name: "Echo", value: 960, status: "active" },
];

const MOCK_METRICS: MetricRecord[] = [
  { label: "Revenue", value: 48200 },
  { label: "Users", value: 1284 },
  { label: "Sessions", value: 5621 },
  { label: "Conversion", value: 3.8 },
];

// ─── Data Helpers ───────────────────────────────────────────
function useMotifData() {
  const { data: primaryData } = useChannelData<PrimaryRecord>("primary");
  const { data: metricsData } = useChannelData<MetricRecord>("metrics");

  return {
    primary: primaryData.length > 0 ? primaryData : MOCK_PRIMARY,
    metrics: metricsData.length > 0 ? metricsData : MOCK_METRICS,
  };
}

// ─── Status Badge ───────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    inactive: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${colors[status] ?? colors.inactive}`}>
      {status}
    </span>
  );
}

// ─── KPI Card ───────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <div className="motif-card animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <span className="motif-kpi-label">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="motif-kpi-value">{typeof value === "number" ? value.toLocaleString() : value}</p>
    </div>
  );
}

// ─── App ────────────────────────────────────────────────────
export default function App() {
  const { connected, status } = useChannelStatus();
  const { primary, metrics } = useMotifData();

  useEffect(() => {
    initChannel();
    return () => disconnectChannel();
  }, []);

  const kpiIcons = [TrendingUp, Users, Activity, TrendingUp];

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Base motif template</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {connected ? (
            <><Wifi className="h-3.5 w-3.5 text-emerald-400" /><span className="text-emerald-400">{status}</span></>
          ) : (
            <><WifiOff className="h-3.5 w-3.5" /><span>Offline</span></>
          )}
        </div>
      </header>

      {/* KPI Row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.slice(0, 4).map((m, i) => (
          <KpiCard key={m.label} label={m.label} value={m.value} icon={kpiIcons[i % kpiIcons.length]} />
        ))}
      </section>

      {/* Data Table */}
      <section className="motif-card">
        <h2 className="text-sm font-medium mb-4">Records</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 pr-4 text-xs text-muted-foreground font-medium">Name</th>
                <th className="pb-2 pr-4 text-xs text-muted-foreground font-medium text-right">Value</th>
                <th className="pb-2 text-xs text-muted-foreground font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {primary.map((row) => (
                <tr key={row.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 pr-4 font-medium">{row.name}</td>
                  <td className="py-2.5 pr-4 text-right font-mono text-muted-foreground">{row.value.toLocaleString()}</td>
                  <td className="py-2.5 text-right"><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-[10px] text-muted-foreground/50 pt-2">
        Channel {connected ? "connected" : "disconnected"}
      </footer>
    </div>
  );
}
