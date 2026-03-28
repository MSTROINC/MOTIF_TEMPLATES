import { useEffect, useState } from "react";
import { initChannel, disconnectChannel, useChannelStatus, useChannelData } from "@/lib/channel-client";
import { sqlite, useSqliteRows } from "@/lib/spacekit-client";
import { Activity, TrendingUp, Users, Wifi, WifiOff, Database, Plus, Check, Trash2 } from "lucide-react";

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

interface ItemRecord {
  id: number;
  title: string;
  completed: number;
  created_at: string;
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

const MOCK_ITEMS: ItemRecord[] = [
  { id: 1, title: "Set up project", completed: 1, created_at: "2026-01-01" },
  { id: 2, title: "Build dashboard", completed: 0, created_at: "2026-01-02" },
  { id: 3, title: "Deploy to production", completed: 0, created_at: "2026-01-03" },
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

// ─── SpaceKit Data ──────────────────────────────────────────
function useSpaceKitData() {
  const { data, loading, refresh } = useSqliteRows<ItemRecord>("items");
  return {
    items: data.length > 0 ? data : MOCK_ITEMS,
    itemsLoading: loading,
    refreshItems: refresh,
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

// ─── SpaceKit Item Row ──────────────────────────────────────
function ItemRow({ item, onToggle, onDelete }: { item: ItemRecord; onToggle: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0 group">
      <button onClick={onToggle} className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-colors ${item.completed ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "border-border hover:border-muted-foreground/40"}`}>
        {item.completed ? <Check className="h-3 w-3" /> : null}
      </button>
      <span className={`flex-1 text-sm ${item.completed ? "line-through text-muted-foreground/50" : ""}`}>{item.title}</span>
      <span className="text-[10px] text-muted-foreground/40">{item.created_at?.slice(0, 10)}</span>
      <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-red-400/50 hover:text-red-400 transition-all">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── App ────────────────────────────────────────────────────
export default function App() {
  const { connected, status } = useChannelStatus();
  const { primary, metrics } = useMotifData();
  const { items, refreshItems } = useSpaceKitData();
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    initChannel();
    return () => disconnectChannel();
  }, []);

  const handleAddItem = async () => {
    if (!newTitle.trim()) return;
    try {
      await sqlite.insert("items", { title: newTitle.trim() });
      setNewTitle("");
      refreshItems();
    } catch {
      // SpaceKit not connected — silently ignore in dev
    }
  };

  const handleToggle = async (item: ItemRecord) => {
    try {
      await sqlite.update("items", item.id, { completed: item.completed ? 0 : 1 });
      refreshItems();
    } catch {}
  };

  const handleDelete = async (id: number) => {
    try {
      await sqlite.delete("items", id);
      refreshItems();
    } catch {}
  };

  const kpiIcons = [TrendingUp, Users, Activity, TrendingUp];

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Base motif template</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-violet-400">SpaceKit</span>
          </div>
          {connected ? (
            <div className="flex items-center gap-1.5">
              <Wifi className="h-3.5 w-3.5 text-emerald-400" /><span className="text-emerald-400">{status}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <WifiOff className="h-3.5 w-3.5" /><span>Offline</span>
            </div>
          )}
        </div>
      </header>

      {/* KPI Row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.slice(0, 4).map((m, i) => (
          <KpiCard key={m.label} label={m.label} value={m.value} icon={kpiIcons[i % kpiIcons.length]} />
        ))}
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Data Table (Channel) */}
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

        {/* SpaceKit Items (SQLite) */}
        <section className="motif-card">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-medium">Items</h2>
            <span className="text-[10px] text-muted-foreground bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded">SpaceKit</span>
          </div>

          <div className="flex gap-2 mb-3">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
              placeholder="Add item..."
              className="flex-1 bg-muted/30 border border-border rounded px-3 py-1.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button onClick={handleAddItem} className="h-8 w-8 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div>
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onToggle={() => handleToggle(item)}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
            {items.length === 0 && (
              <p className="text-xs text-muted-foreground/40 text-center py-4">No items yet</p>
            )}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="text-center text-[10px] text-muted-foreground/50 pt-2">
        Channel {connected ? "connected" : "disconnected"} · SpaceKit SQLite
      </footer>
    </div>
  );
}
