import { useEffect, useState } from "react";
import {
  initChannel,
  disconnectChannel,
  useChannelStatus,
  useChannelData,
  useChannelRequest,
} from "@/lib/channel-client";
import { BookOpen, ExternalLink, Search, Ticket, Wifi, WifiOff } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────
interface CWTicket {
  id: string;
  summary: string;
  description?: string;
  status: string;
  enteredDate: string;
  company: string;
}

interface SowiMatch {
  ticketId: string;
  sowiId: string;
  title: string;
  url?: string;
  excerpt?: string;
  confidence: number;
}

// ─── Mock Data ──────────────────────────────────────────────
const MOCK_TICKETS: CWTicket[] = [
  {
    id: "T-10421",
    summary: "Outlook not syncing emails after password change",
    status: "New",
    enteredDate: "2026-03-20T08:14:00Z",
    company: "Acme Corp",
    description:
      "User reports Outlook stopped syncing after IT forced a password reset. Getting authentication errors.",
  },
  {
    id: "T-10420",
    summary: "Laptop won't connect to VPN from home",
    status: "New",
    enteredDate: "2026-03-20T07:55:00Z",
    company: "BrightPath LLC",
    description:
      "Remote worker cannot establish VPN connection. Cisco AnyConnect error: 'Unable to contact the VPN server'.",
  },
  {
    id: "T-10419",
    summary: "Printer offline on workstation after Windows update",
    status: "New",
    enteredDate: "2026-03-20T07:30:00Z",
    company: "Acme Corp",
    description: "HP LaserJet showing offline after KB5034441 was pushed overnight.",
  },
  {
    id: "T-10418",
    summary: "MFA prompt looping, user locked out of M365",
    status: "New",
    enteredDate: "2026-03-20T06:45:00Z",
    company: "Granite Partners",
    description:
      "User getting continuous MFA prompts and can't log in to any M365 apps.",
  },
  {
    id: "T-10417",
    summary: "Teams calls dropping after 5 minutes",
    status: "New",
    enteredDate: "2026-03-19T16:20:00Z",
    company: "SunWest Logistics",
    description:
      "All Teams video calls drop exactly after 5 minutes. Happens on both wired and wireless.",
  },
];

const MOCK_SOWI_MATCHES: SowiMatch[] = [
  {
    ticketId: "T-10421",
    sowiId: "S-042",
    title: "Reconfigure Outlook Profile After Password Change",
    url: "#",
    excerpt:
      "When a user's password is reset by IT, Outlook cached credentials may need to be cleared. Navigate to Control Panel > Credential Manager and remove all Microsoft Office entries...",
    confidence: 0.94,
  },
  {
    ticketId: "T-10421",
    sowiId: "S-108",
    title: "Modern Auth Token Refresh Procedure",
    url: "#",
    excerpt:
      "If Outlook is stuck on legacy auth, force a token refresh by signing out of all Office apps via the Office 365 portal and re-signing in with MFA...",
    confidence: 0.81,
  },
  {
    ticketId: "T-10420",
    sowiId: "S-017",
    title: "Cisco AnyConnect VPN Troubleshooting Guide",
    url: "#",
    excerpt:
      "For 'Unable to contact VPN server' errors: verify the client is on v4.10+, check Windows Firewall is allowing AnyConnect, and confirm split tunneling policy...",
    confidence: 0.97,
  },
  {
    ticketId: "T-10420",
    sowiId: "S-089",
    title: "Home Network Firewall Conflicts with VPN",
    url: "#",
    excerpt:
      "Some consumer routers block IPSec/UDP 500. Ask the user to try connecting via mobile hotspot to isolate if the home router is the issue...",
    confidence: 0.72,
  },
  {
    ticketId: "T-10419",
    sowiId: "S-055",
    title: "Printer Offline After Windows Update Fix",
    url: "#",
    excerpt:
      "KB5034441 is known to reset printer spooler settings. Run 'net stop spooler && net start spooler' then delete contents of C:\\Windows\\System32\\spool\\PRINTERS...",
    confidence: 0.96,
  },
  {
    ticketId: "T-10418",
    sowiId: "S-031",
    title: "M365 MFA Loop Resolution Steps",
    url: "#",
    excerpt:
      "MFA loops are usually caused by a corrupted refresh token. In Azure AD admin, navigate to the user > Authentication methods and require re-registration...",
    confidence: 0.92,
  },
  {
    ticketId: "T-10417",
    sowiId: "S-076",
    title: "Teams Calls Drop at 5-Minute Mark (NAT Timeout)",
    url: "#",
    excerpt:
      "This is a known issue with NAT session timeouts at exactly 300 seconds. Enable QoS marking for Teams media traffic or adjust the router's UDP timeout setting...",
    confidence: 0.98,
  },
];

// ─── Data Helpers ───────────────────────────────────────────
function useMotifData() {
  const { data: liveTickets } = useChannelData<CWTicket>("newTickets");
  const { data: liveMatches } = useChannelData<SowiMatch>("sowiMatches");

  return {
    tickets: liveTickets.length > 0 ? liveTickets : MOCK_TICKETS,
    sowiMatches: liveMatches.length > 0 ? liveMatches : MOCK_SOWI_MATCHES,
  };
}

// ─── Sub-components ─────────────────────────────────────────
function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 90
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
      : pct >= 70
      ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
      : "bg-zinc-500/15 text-zinc-400 border-zinc-500/25";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${color}`}
    >
      {pct}% match
    </span>
  );
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 90 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-zinc-500";
  return (
    <div className="h-1 w-full bg-border rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ─── App ────────────────────────────────────────────────────
export default function App() {
  const { connected, status } = useChannelStatus();
  const { fetchData } = useChannelRequest();
  const { tickets, sowiMatches } = useMotifData();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    initChannel();
    return () => disconnectChannel();
  }, []);

  // Auto-select the first ticket on load
  useEffect(() => {
    if (!selectedId && tickets.length > 0) {
      setSelectedId(tickets[0].id);
    }
  }, [tickets, selectedId]);

  function handleSelectTicket(id: string) {
    setSelectedId(id);
    // Tells the backend to push sowiMatches for this ticket
    fetchData("sowiMatches", { filters: { ticketId: id } });
  }

  const selectedTicket = tickets.find((t) => t.id === selectedId);
  const matches = sowiMatches
    .filter((m) => m.ticketId === selectedId)
    .sort((a, b) => b.confidence - a.confidence);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm tracking-tight">SOWI Finder</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {connected ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">{status}</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5" />
              <span>Offline</span>
            </>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Ticket List */}
        <aside className="w-64 border-r border-border flex flex-col overflow-hidden shrink-0">
          <div className="px-3 py-2 border-b border-border flex items-center gap-2 shrink-0">
            <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              New Tickets
            </span>
            <span className="ml-auto text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-mono">
              {tickets.length}
            </span>
          </div>
          <div className="overflow-y-auto flex-1">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => handleSelectTicket(ticket.id)}
                className={`w-full text-left px-3 py-3 border-b border-border/50 hover:bg-accent/50 transition-colors ${
                  selectedId === ticket.id
                    ? "bg-accent border-l-2 border-l-primary"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {ticket.id}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatTime(ticket.enteredDate)}
                  </span>
                </div>
                <p className="text-xs font-medium leading-snug line-clamp-2">
                  {ticket.summary}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {ticket.company}
                </p>
              </button>
            ))}
          </div>
        </aside>

        {/* Right: SOWI Matches */}
        <main className="flex-1 overflow-y-auto p-4 space-y-3">
          {selectedTicket ? (
            <>
              {/* Ticket detail card */}
              <div className="motif-card">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-muted-foreground">
                    {selectedTicket.id}
                  </span>
                  <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/25 rounded-full px-2 py-0.5">
                    {selectedTicket.status}
                  </span>
                </div>
                <h2 className="text-sm font-semibold leading-snug">
                  {selectedTicket.summary}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedTicket.company}
                </p>
                {selectedTicket.description && (
                  <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border leading-relaxed">
                    {selectedTicket.description}
                  </p>
                )}
              </div>

              {/* Match results */}
              <div className="flex items-center gap-2 pb-1">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Matched SOWIs
                </span>
                <span className="text-xs text-muted-foreground">
                  ({matches.length} found)
                </span>
              </div>

              {matches.length === 0 ? (
                <div className="motif-card text-center py-10 text-sm text-muted-foreground">
                  No SOWIs matched yet
                </div>
              ) : (
                matches.map((match) => (
                  <div
                    key={match.sowiId}
                    className="motif-card space-y-2 animate-fade-in"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {match.sowiId}
                          </span>
                          <ConfidenceBadge score={match.confidence} />
                        </div>
                        <h3 className="text-sm font-semibold leading-snug">
                          {match.title}
                        </h3>
                      </div>
                      {match.url && match.url !== "#" && (
                        <a
                          href={match.url}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    {match.excerpt && (
                      <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-2">
                        {match.excerpt}
                      </p>
                    )}
                    <ConfidenceBar score={match.confidence} />
                  </div>
                ))
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Select a ticket to see SOWI matches
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
