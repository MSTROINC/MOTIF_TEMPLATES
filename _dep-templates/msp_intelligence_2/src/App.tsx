import { useState, useEffect, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  CHART_COLORS,
} from "@/components/ui/chart"
import {
  Shield, Server, MapPin, AlertTriangle, Activity, Monitor, Wifi,
  HardDrive, Clock, Users, ChevronLeft, ChevronRight, X, Zap, Radio, Eye,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────

interface Customer {
  id: string
  name: string
  type: string
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
  lat: number
  lng: number
  city: string
  state: string
  deviceCount: number
  openTickets: number
  revenue: number
  contractEnd: string
  primaryContact: string
  address?: string
}

interface Device {
  id: string
  customerId: string
  hostname: string
  type: 'Firewall' | 'Server' | 'Workstation' | 'Switch' | 'Access Point' | 'NAS'
  status: 'online' | 'degraded' | 'offline' | 'maintenance'
  ip: string
  os: string
  lastSeen: string
  alerts: number
  uptime: string
}

interface TicketData {
  id: string
  customerId: string
  deviceId: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  created: string
  assignee: string
  category: string
}

// ─── Color Helpers ──────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#10b981',
}
const STATUS_COLORS: Record<string, string> = {
  online: '#10b981', degraded: '#f59e0b', offline: '#ef4444', maintenance: '#8b5cf6',
}
const riskColor = (level: string) => RISK_COLORS[level] ?? '#64748b'
const statusColor = (status: string) => STATUS_COLORS[status] ?? '#64748b'

// ─── Mock Data ──────────────────────────────────────────────

const customers: Customer[] = [
  { id: "C-001", name: "Nexus Healthcare Systems", type: "Healthcare", riskLevel: "critical", lat: 40.7128, lng: -74.006, city: "New York", state: "NY", deviceCount: 127, openTickets: 8, revenue: 45000, contractEnd: "2025-06-30", primaryContact: "Dr. Sarah Chen", address: "350 5th Ave, New York, NY 10118" },
  { id: "C-002", name: "Apex Financial Group", type: "Finance", riskLevel: "high", lat: 37.7749, lng: -122.4194, city: "San Francisco", state: "CA", deviceCount: 89, openTickets: 3, revenue: 62000, contractEnd: "2025-12-31", primaryContact: "Marcus Webb", address: "101 California St, San Francisco, CA 94111" },
  { id: "C-003", name: "Titan Manufacturing", type: "Manufacturing", riskLevel: "low", lat: 42.3314, lng: -83.0458, city: "Detroit", state: "MI", deviceCount: 203, openTickets: 1, revenue: 38000, contractEnd: "2026-03-15", primaryContact: "James Morrison", address: "1 American Rd, Dearborn, MI 48126" },
  { id: "C-004", name: "Pinnacle Legal Partners", type: "Legal", riskLevel: "medium", lat: 41.8781, lng: -87.6298, city: "Chicago", state: "IL", deviceCount: 54, openTickets: 4, revenue: 28000, contractEnd: "2025-09-30", primaryContact: "Amanda Torres", address: "233 S Wacker Dr, Chicago, IL 60606" },
  { id: "C-005", name: "Quantum Biotech", type: "Biotech", riskLevel: "critical", lat: 42.3601, lng: -71.0589, city: "Boston", state: "MA", deviceCount: 156, openTickets: 11, revenue: 73000, contractEnd: "2025-08-15", primaryContact: "Dr. Ryan Park", address: "75 Francis St, Boston, MA 02115" },
  { id: "C-006", name: "Atlas Logistics", type: "Logistics", riskLevel: "low", lat: 32.7767, lng: -96.797, city: "Dallas", state: "TX", deviceCount: 312, openTickets: 2, revenue: 51000, contractEnd: "2026-01-31", primaryContact: "Diana Cruz", address: "2323 Bryan St, Dallas, TX 75201" },
  { id: "C-007", name: "Meridian Education", type: "Education", riskLevel: "medium", lat: 47.6062, lng: -122.3321, city: "Seattle", state: "WA", deviceCount: 178, openTickets: 5, revenue: 34000, contractEnd: "2025-11-30", primaryContact: "Prof. Alex Huang", address: "1410 NE Campus Pkwy, Seattle, WA 98195" },
  { id: "C-008", name: "Vanguard Energy Corp", type: "Energy", riskLevel: "high", lat: 29.7604, lng: -95.3698, city: "Houston", state: "TX", deviceCount: 267, openTickets: 7, revenue: 89000, contractEnd: "2026-06-30", primaryContact: "Robert Nash", address: "1400 Smith St, Houston, TX 77002" },
  { id: "C-009", name: "Cipher Security Solutions", type: "Security", riskLevel: "low", lat: 38.9072, lng: -77.0369, city: "Washington", state: "DC", deviceCount: 91, openTickets: 0, revenue: 42000, contractEnd: "2025-10-31", primaryContact: "Kate Sullivan", address: "1000 Constitution Ave NW, Washington, DC 20004" },
  { id: "C-010", name: "Prism Retail Group", type: "Retail", riskLevel: "medium", lat: 34.0522, lng: -118.2437, city: "Los Angeles", state: "CA", deviceCount: 145, openTickets: 6, revenue: 55000, contractEnd: "2026-02-28", primaryContact: "Mike Okafor", address: "700 S Flower St, Los Angeles, CA 90017" },
]

const devices: Device[] = [
  { id: "D-001", customerId: "C-001", hostname: "NX-FW-01", type: "Firewall", status: "online", ip: "10.0.1.1", os: "FortiOS 7.4", lastSeen: "2025-01-15T10:30:00Z", alerts: 2, uptime: "99.98%" },
  { id: "D-002", customerId: "C-001", hostname: "NX-DC-01", type: "Server", status: "degraded", ip: "10.0.1.10", os: "Windows Server 2022", lastSeen: "2025-01-15T10:28:00Z", alerts: 3, uptime: "99.2%" },
  { id: "D-003", customerId: "C-001", hostname: "NX-DC-02", type: "Server", status: "online", ip: "10.0.1.11", os: "Ubuntu 22.04", lastSeen: "2025-01-15T10:30:00Z", alerts: 0, uptime: "99.99%" },
  { id: "D-004", customerId: "C-001", hostname: "NX-SW-01", type: "Switch", status: "online", ip: "10.0.1.2", os: "Cisco IOS 17.3", lastSeen: "2025-01-15T10:29:00Z", alerts: 0, uptime: "100%" },
  { id: "D-005", customerId: "C-001", hostname: "NX-NAS-01", type: "NAS", status: "online", ip: "10.0.1.20", os: "Synology DSM 7.2", lastSeen: "2025-01-15T10:30:00Z", alerts: 1, uptime: "99.95%" },
  { id: "D-006", customerId: "C-002", hostname: "AX-FW-01", type: "Firewall", status: "online", ip: "172.16.0.1", os: "PAN-OS 11.1", lastSeen: "2025-01-15T10:30:00Z", alerts: 0, uptime: "99.99%" },
  { id: "D-007", customerId: "C-002", hostname: "AX-SRV-01", type: "Server", status: "online", ip: "172.16.0.10", os: "Windows Server 2022", lastSeen: "2025-01-15T10:30:00Z", alerts: 1, uptime: "99.8%" },
  { id: "D-008", customerId: "C-002", hostname: "AX-SRV-02", type: "Server", status: "offline", ip: "172.16.0.11", os: "RHEL 9.3", lastSeen: "2025-01-14T23:45:00Z", alerts: 5, uptime: "87.3%" },
  { id: "D-009", customerId: "C-002", hostname: "AX-AP-01", type: "Access Point", status: "online", ip: "172.16.0.30", os: "UniFi 7.1", lastSeen: "2025-01-15T10:30:00Z", alerts: 0, uptime: "99.9%" },
  { id: "D-010", customerId: "C-003", hostname: "TT-FW-01", type: "Firewall", status: "online", ip: "192.168.1.1", os: "SonicOS 7.0", lastSeen: "2025-01-15T10:30:00Z", alerts: 0, uptime: "100%" },
  { id: "D-011", customerId: "C-003", hostname: "TT-SRV-01", type: "Server", status: "online", ip: "192.168.1.10", os: "Windows Server 2019", lastSeen: "2025-01-15T10:29:00Z", alerts: 0, uptime: "99.99%" },
  { id: "D-012", customerId: "C-003", hostname: "TT-SW-01", type: "Switch", status: "online", ip: "192.168.1.2", os: "HP ProCurve", lastSeen: "2025-01-15T10:30:00Z", alerts: 0, uptime: "100%" },
  { id: "D-013", customerId: "C-005", hostname: "QB-FW-01", type: "Firewall", status: "degraded", ip: "10.10.0.1", os: "FortiOS 7.4", lastSeen: "2025-01-15T10:25:00Z", alerts: 4, uptime: "98.1%" },
  { id: "D-014", customerId: "C-005", hostname: "QB-SRV-01", type: "Server", status: "offline", ip: "10.10.0.10", os: "Windows Server 2022", lastSeen: "2025-01-15T02:00:00Z", alerts: 8, uptime: "72.5%" },
  { id: "D-015", customerId: "C-005", hostname: "QB-SRV-02", type: "Server", status: "online", ip: "10.10.0.11", os: "Ubuntu 24.04", lastSeen: "2025-01-15T10:30:00Z", alerts: 0, uptime: "99.99%" },
  { id: "D-016", customerId: "C-005", hostname: "QB-NAS-01", type: "NAS", status: "degraded", ip: "10.10.0.20", os: "QNAP QTS 5.1", lastSeen: "2025-01-15T10:20:00Z", alerts: 2, uptime: "96.8%" },
  { id: "D-017", customerId: "C-005", hostname: "QB-AP-01", type: "Access Point", status: "online", ip: "10.10.0.30", os: "Aruba OS 8.11", lastSeen: "2025-01-15T10:30:00Z", alerts: 0, uptime: "99.95%" },
  { id: "D-018", customerId: "C-008", hostname: "VG-FW-01", type: "Firewall", status: "online", ip: "10.20.0.1", os: "PAN-OS 11.0", lastSeen: "2025-01-15T10:30:00Z", alerts: 1, uptime: "99.95%" },
  { id: "D-019", customerId: "C-008", hostname: "VG-SRV-01", type: "Server", status: "degraded", ip: "10.20.0.10", os: "Windows Server 2022", lastSeen: "2025-01-15T10:27:00Z", alerts: 3, uptime: "97.5%" },
  { id: "D-020", customerId: "C-008", hostname: "VG-SRV-02", type: "Server", status: "online", ip: "10.20.0.11", os: "CentOS 9", lastSeen: "2025-01-15T10:30:00Z", alerts: 0, uptime: "99.98%" },
  { id: "D-021", customerId: "C-008", hostname: "VG-SW-01", type: "Switch", status: "online", ip: "10.20.0.2", os: "Cisco NX-OS 10.3", lastSeen: "2025-01-15T10:30:00Z", alerts: 0, uptime: "100%" },
  { id: "D-022", customerId: "C-008", hostname: "VG-NAS-01", type: "NAS", status: "maintenance", ip: "10.20.0.20", os: "Synology DSM 7.2", lastSeen: "2025-01-15T08:00:00Z", alerts: 0, uptime: "95.0%" },
  { id: "D-023", customerId: "C-004", hostname: "PL-FW-01", type: "Firewall", status: "online", ip: "10.4.0.1", os: "FortiOS 7.2", lastSeen: "2025-01-15T10:30:00Z", alerts: 1, uptime: "99.97%" },
  { id: "D-024", customerId: "C-004", hostname: "PL-SRV-01", type: "Server", status: "online", ip: "10.4.0.10", os: "Windows Server 2022", lastSeen: "2025-01-15T10:30:00Z", alerts: 0, uptime: "99.95%" },
  { id: "D-025", customerId: "C-006", hostname: "AL-FW-01", type: "Firewall", status: "online", ip: "10.6.0.1", os: "SonicOS 7.1", lastSeen: "2025-01-15T10:30:00Z", alerts: 0, uptime: "100%" },
  { id: "D-026", customerId: "C-006", hostname: "AL-SRV-01", type: "Server", status: "online", ip: "10.6.0.10", os: "Ubuntu 22.04", lastSeen: "2025-01-15T10:30:00Z", alerts: 0, uptime: "99.99%" },
  { id: "D-027", customerId: "C-007", hostname: "ME-FW-01", type: "Firewall", status: "online", ip: "10.7.0.1", os: "PAN-OS 10.2", lastSeen: "2025-01-15T10:30:00Z", alerts: 0, uptime: "99.98%" },
  { id: "D-028", customerId: "C-007", hostname: "ME-SRV-01", type: "Server", status: "online", ip: "10.7.0.10", os: "Windows Server 2022", lastSeen: "2025-01-15T10:29:00Z", alerts: 2, uptime: "99.5%" },
  { id: "D-029", customerId: "C-009", hostname: "CS-FW-01", type: "Firewall", status: "online", ip: "10.9.0.1", os: "PAN-OS 11.1", lastSeen: "2025-01-15T10:30:00Z", alerts: 0, uptime: "100%" },
  { id: "D-030", customerId: "C-009", hostname: "CS-SRV-01", type: "Server", status: "online", ip: "10.9.0.10", os: "RHEL 9.3", lastSeen: "2025-01-15T10:30:00Z", alerts: 0, uptime: "99.99%" },
  { id: "D-031", customerId: "C-010", hostname: "PR-FW-01", type: "Firewall", status: "online", ip: "10.10.1.1", os: "FortiOS 7.4", lastSeen: "2025-01-15T10:30:00Z", alerts: 1, uptime: "99.9%" },
  { id: "D-032", customerId: "C-010", hostname: "PR-SRV-01", type: "Server", status: "degraded", ip: "10.10.1.10", os: "Windows Server 2022", lastSeen: "2025-01-15T10:20:00Z", alerts: 2, uptime: "98.7%" },
]

const tickets: TicketData[] = [
  { id: "T-001", customerId: "C-005", deviceId: "D-014", title: "Server Unresponsive - Production DB", severity: "critical", status: "open", created: "2025-01-15T02:15:00Z", assignee: "Mike Chen", category: "Hardware" },
  { id: "T-002", customerId: "C-001", deviceId: "D-002", title: "Ransomware Alert - Suspicious Activity", severity: "critical", status: "in_progress", created: "2025-01-15T08:30:00Z", assignee: "Sarah Kim", category: "Security" },
  { id: "T-003", customerId: "C-005", deviceId: "D-013", title: "Firewall Policy Bypass Detected", severity: "critical", status: "open", created: "2025-01-15T06:00:00Z", assignee: "Tom Reeves", category: "Security" },
  { id: "T-004", customerId: "C-002", deviceId: "D-008", title: "Server Offline - RHEL Kernel Panic", severity: "high", status: "in_progress", created: "2025-01-14T23:50:00Z", assignee: "Alex Wong", category: "Hardware" },
  { id: "T-005", customerId: "C-008", deviceId: "D-019", title: "Disk Array Degraded - RAID 5", severity: "high", status: "open", created: "2025-01-15T07:00:00Z", assignee: "Carlos Diaz", category: "Hardware" },
  { id: "T-006", customerId: "C-001", deviceId: "D-005", title: "Backup Job Failed - 3 Consecutive", severity: "high", status: "open", created: "2025-01-15T04:00:00Z", assignee: "Sarah Kim", category: "Backup" },
  { id: "T-007", customerId: "C-005", deviceId: "D-016", title: "NAS Storage 92% Full", severity: "high", status: "open", created: "2025-01-15T09:00:00Z", assignee: "Mike Chen", category: "Storage" },
  { id: "T-008", customerId: "C-008", deviceId: "D-018", title: "SSL Certificate Expiring in 7 Days", severity: "high", status: "in_progress", created: "2025-01-14T16:00:00Z", assignee: "Carlos Diaz", category: "Security" },
  { id: "T-009", customerId: "C-004", deviceId: "", title: "Office 365 License Renewal Required", severity: "medium", status: "open", created: "2025-01-13T10:00:00Z", assignee: "Jenny Liu", category: "Licensing" },
  { id: "T-010", customerId: "C-007", deviceId: "", title: "Windows Update Pending - 12 Workstations", severity: "medium", status: "open", created: "2025-01-12T14:00:00Z", assignee: "David Park", category: "Patching" },
  { id: "T-011", customerId: "C-010", deviceId: "", title: "VPN Performance Degraded", severity: "medium", status: "in_progress", created: "2025-01-14T11:00:00Z", assignee: "Rachel Green", category: "Network" },
  { id: "T-012", customerId: "C-001", deviceId: "D-001", title: "IDS Signature Update Required", severity: "medium", status: "open", created: "2025-01-14T09:00:00Z", assignee: "Tom Reeves", category: "Security" },
  { id: "T-013", customerId: "C-008", deviceId: "D-022", title: "Scheduled NAS Firmware Update", severity: "medium", status: "in_progress", created: "2025-01-15T08:00:00Z", assignee: "Carlos Diaz", category: "Maintenance" },
  { id: "T-014", customerId: "C-003", deviceId: "", title: "Printer Network Config Update", severity: "low", status: "open", created: "2025-01-10T08:00:00Z", assignee: "Jenny Liu", category: "Hardware" },
  { id: "T-015", customerId: "C-007", deviceId: "", title: "New Employee Onboarding - 3 Users", severity: "low", status: "open", created: "2025-01-13T09:00:00Z", assignee: "David Park", category: "User Management" },
  { id: "T-016", customerId: "C-010", deviceId: "", title: "Monitor Procurement Request", severity: "low", status: "open", created: "2025-01-11T15:00:00Z", assignee: "Rachel Green", category: "Procurement" },
  { id: "T-017", customerId: "C-002", deviceId: "", title: "Annual Security Training Due", severity: "low", status: "open", created: "2025-01-08T10:00:00Z", assignee: "Alex Wong", category: "Compliance" },
  { id: "T-018", customerId: "C-004", deviceId: "", title: "Meeting Room AV System Upgrade", severity: "low", status: "in_progress", created: "2025-01-09T11:00:00Z", assignee: "Jenny Liu", category: "Hardware" },
  { id: "T-019", customerId: "C-001", deviceId: "D-002", title: "Memory Usage Exceeding 95%", severity: "high", status: "open", created: "2025-01-15T09:45:00Z", assignee: "Sarah Kim", category: "Performance" },
  { id: "T-020", customerId: "C-005", deviceId: "D-014", title: "Database Recovery Required", severity: "critical", status: "in_progress", created: "2025-01-15T03:00:00Z", assignee: "Mike Chen", category: "Data" },
  { id: "T-021", customerId: "C-008", deviceId: "D-019", title: "Thermal Warning - Server Room", severity: "high", status: "open", created: "2025-01-15T10:00:00Z", assignee: "Carlos Diaz", category: "Environment" },
  { id: "T-022", customerId: "C-010", deviceId: "D-032", title: "Slow Response Time on POS System", severity: "medium", status: "open", created: "2025-01-14T13:00:00Z", assignee: "Rachel Green", category: "Performance" },
  { id: "T-023", customerId: "C-007", deviceId: "D-028", title: "Active Directory Sync Errors", severity: "medium", status: "in_progress", created: "2025-01-14T16:30:00Z", assignee: "David Park", category: "Identity" },
]

// ─── Data Helpers ───────────────────────────────────────────

const getCustomerDevices = (id: string) => devices.filter(d => d.customerId === id)
const getCustomerTickets = (id: string) => tickets.filter(t => t.customerId === id)

const createMarkerIcon = (customer: Customer, isSelected: boolean) => {
  const color = riskColor(customer.riskLevel)
  const isCritical = customer.riskLevel === 'critical'
  return L.divIcon({
    className: '',
    html: `
      <div class="intel-marker ${isSelected ? 'selected' : ''}" style="--marker-color: ${color}">
        ${isCritical ? '<div class="intel-marker-pulse"></div>' : ''}
        <div class="intel-marker-ring"></div>
        <div class="intel-marker-core"></div>
        ${customer.openTickets > 0 ? `<div class="intel-marker-count">${customer.openTickets}</div>` : ''}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

// ─── Geocoding ──────────────────────────────────────────────

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
    { headers: { 'User-Agent': 'MSPIntelligence/1.0' } }
  )
  const data = await res.json()
  if (data.length > 0) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  }
  return null
}

// ─── Sub-Components ─────────────────────────────────────────

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 })
  }, [center, zoom, map])
  return null
}

function StatChip({ icon, label, value, accent, critical }: {
  icon: React.ReactNode; label: string; value: string; accent?: boolean; critical?: boolean
}) {
  const colorClass = critical && accent ? 'text-intel-red' : accent ? 'text-intel-amber' : 'text-intel-muted'
  const valueClass = critical && accent ? 'text-intel-red' : accent ? 'text-intel-amber' : 'text-intel-text'
  return (
    <div className="flex items-center gap-2">
      <span className={colorClass}>{icon}</span>
      <span className="font-mono text-[10px] text-intel-muted tracking-wider">{label}</span>
      <span className={`font-mono text-sm font-semibold ${valueClass}`}>{value}</span>
    </div>
  )
}

function StatusBar({ customers }: { customers: Customer[] }) {
  const totalDevices = customers.reduce((sum, c) => sum + c.deviceCount, 0)
  const totalTickets = tickets.filter(t => t.status !== 'closed').length
  const criticalCount = tickets.filter(t => t.severity === 'critical' && t.status !== 'closed').length

  return (
    <div className="h-12 border-b border-intel-border bg-intel-surface flex items-center justify-between px-5 shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-intel-cyan" />
          <span className="font-display font-bold text-base tracking-wider text-intel-cyan">MSP INTELLIGENCE</span>
        </div>
        <div className="w-px h-6 bg-intel-border mx-2" />
        <span className="font-mono text-[10px] text-intel-muted tracking-widest">TACTICAL OVERVIEW</span>
      </div>
      <div className="flex items-center gap-6">
        <StatChip icon={<Users className="w-3.5 h-3.5" />} label="CUSTOMERS" value={customers.length.toString()} />
        <StatChip icon={<Server className="w-3.5 h-3.5" />} label="DEVICES" value={totalDevices.toLocaleString()} />
        <StatChip icon={<AlertTriangle className="w-3.5 h-3.5" />} label="TICKETS" value={totalTickets.toString()} accent={totalTickets > 10} />
        <StatChip icon={<Zap className="w-3.5 h-3.5" />} label="CRITICAL" value={criticalCount.toString()} accent={criticalCount > 0} critical />
        <div className="w-px h-6 bg-intel-border" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-intel-green animate-pulse" />
          <span className="font-mono text-[10px] text-intel-green tracking-wider">OPERATIONAL</span>
        </div>
      </div>
    </div>
  )
}

function DeviceIcon({ type, className = "w-3.5 h-3.5 text-intel-muted" }: { type: string; className?: string }) {
  switch (type) {
    case 'Firewall': return <Shield className={className} />
    case 'Server': return <Server className={className} />
    case 'Switch': return <Activity className={className} />
    case 'Access Point': return <Wifi className={className} />
    case 'NAS': return <HardDrive className={className} />
    case 'Workstation': return <Monitor className={className} />
    default: return <Server className={className} />
  }
}

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[10px] font-mono text-intel-dim tracking-wider uppercase">{label}</div>
      <div
        className={`text-xs font-mono mt-0.5 ${color ? '' : 'text-intel-text'}`}
        style={color ? { color } : undefined}
      >
        {value}
      </div>
    </div>
  )
}

function TicketRow({ ticket }: { ticket: TicketData }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded bg-intel-bg/50 border border-intel-border/30">
      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: riskColor(ticket.severity) }} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-mono text-intel-text truncate">{ticket.title}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-mono font-semibold capitalize" style={{ color: riskColor(ticket.severity) }}>
            {ticket.severity}
          </span>
          <span className="text-[10px] font-mono text-intel-dim">&middot;</span>
          <span className="text-[10px] font-mono text-intel-muted capitalize">{ticket.status.replace('_', ' ')}</span>
          <span className="text-[10px] font-mono text-intel-dim">&middot;</span>
          <span className="text-[10px] font-mono text-intel-muted">{ticket.assignee}</span>
        </div>
      </div>
      <span className="text-[10px] font-mono text-intel-dim shrink-0">{ticket.id}</span>
    </div>
  )
}

function CustomerListPanel({ customers, onSelectCustomer }: { customers: Customer[]; onSelectCustomer: (c: Customer) => void }) {
  const sortedCustomers = useMemo(() => {
    const riskOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    return [...customers].sort((a, b) => (riskOrder[a.riskLevel] ?? 4) - (riskOrder[b.riskLevel] ?? 4))
  }, [customers])

  const ticketsBySeverity = useMemo(() => {
    const open = tickets.filter(t => t.status !== 'closed')
    return [
      { name: 'Critical', value: open.filter(t => t.severity === 'critical').length, fill: RISK_COLORS.critical },
      { name: 'High', value: open.filter(t => t.severity === 'high').length, fill: RISK_COLORS.high },
      { name: 'Medium', value: open.filter(t => t.severity === 'medium').length, fill: RISK_COLORS.medium },
      { name: 'Low', value: open.filter(t => t.severity === 'low').length, fill: RISK_COLORS.low },
    ]
  }, [])

  return (
    <div className="p-3 space-y-3">
      {/* Threat Distribution */}
      <div className="hud-card p-3">
        <div className="text-[10px] font-display font-semibold tracking-wider text-intel-muted mb-3 uppercase">
          Risk Distribution
        </div>
        <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-intel-bg">
          {(['critical', 'high', 'medium', 'low'] as const).map(level => {
            const count = customers.filter(c => c.riskLevel === level).length
            const pct = (count / customers.length) * 100
            return (
              <div
                key={level}
                style={{ width: `${pct}%`, backgroundColor: riskColor(level) }}
                className="h-full transition-all duration-500"
              />
            )
          })}
        </div>
        <div className="flex justify-between mt-2">
          {(['critical', 'high', 'medium', 'low'] as const).map(level => {
            const count = customers.filter(c => c.riskLevel === level).length
            return (
              <div key={level} className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: riskColor(level) }} />
                <span className="text-[9px] font-mono text-intel-muted capitalize">{level}</span>
                <span className="text-[9px] font-mono text-intel-text font-semibold">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Ticket Severity Chart */}
      <div className="hud-card p-3">
        <div className="text-[10px] font-display font-semibold tracking-wider text-intel-muted mb-2 uppercase">
          Tickets by Severity
        </div>
        <ChartContainer className="h-[100px]">
          <BarChart data={ticketsBySeverity} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={52} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={12}>
              {ticketsBySeverity.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>

      {/* Customer List */}
      <div className="text-[10px] font-display font-semibold tracking-wider text-intel-muted uppercase px-1">
        Customers ({customers.length})
      </div>
      {sortedCustomers.map(customer => (
        <button
          key={customer.id}
          onClick={() => onSelectCustomer(customer)}
          className="w-full hud-card p-3 text-left hover:border-[rgba(0,212,255,0.3)] transition-all duration-200 group"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: riskColor(customer.riskLevel) }} />
                <span className="text-sm font-display font-semibold text-intel-text truncate group-hover:text-intel-cyan transition-colors">
                  {customer.name}
                </span>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <span className="text-[10px] font-mono text-intel-muted">{customer.city}, {customer.state}</span>
                <span className="text-[10px] font-mono text-intel-dim">|</span>
                <span className="text-[10px] font-mono text-intel-muted">{customer.type}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 ml-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <Server className="w-3 h-3 text-intel-muted" />
                <span className="text-xs font-mono text-intel-text">{customer.deviceCount}</span>
              </div>
              {customer.openTickets > 0 && (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-intel-amber" />
                  <span className="text-xs font-mono text-intel-amber">{customer.openTickets}</span>
                </div>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

function CustomerDetailPanel({ customer, onSelectDevice }: {
  customer: Customer
  onSelectDevice: (d: Device) => void
}) {
  const customerDevices = useMemo(() => getCustomerDevices(customer.id), [customer.id])
  const customerTickets = useMemo(() => getCustomerTickets(customer.id), [customer.id])

  const deviceStatusData = useMemo(() => {
    const counts: Record<string, number> = { online: 0, degraded: 0, offline: 0, maintenance: 0 }
    customerDevices.forEach(d => { counts[d.status] = (counts[d.status] || 0) + 1 })
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: k, value: v, fill: statusColor(k) }))
  }, [customerDevices])

  return (
    <div className="p-3 space-y-3 animate-fade-in">
      {/* Customer Header */}
      <div className="hud-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: riskColor(customer.riskLevel) }} />
          <span className="font-display font-bold text-lg text-intel-text">{customer.name}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <InfoRow label="Sector" value={customer.type} />
          <InfoRow label="Location" value={`${customer.city}, ${customer.state}`} />
          <InfoRow label="Risk Level" value={customer.riskLevel.toUpperCase()} color={riskColor(customer.riskLevel)} />
          <InfoRow label="MRR" value={`$${customer.revenue.toLocaleString()}`} />
          <InfoRow label="Contract End" value={customer.contractEnd} />
          <InfoRow label="Contact" value={customer.primaryContact} />
          {customer.address && <InfoRow label="Address" value={customer.address} />}
        </div>
      </div>

      {/* Device Status Breakdown */}
      {deviceStatusData.length > 0 && (
        <div className="hud-card p-3">
          <div className="text-[10px] font-display font-semibold tracking-wider text-intel-muted uppercase mb-2">
            Device Health
          </div>
          <div className="flex items-center gap-4">
            <ChartContainer className="h-[80px] w-[80px]">
              <PieChart>
                <Pie data={deviceStatusData} dataKey="value" cx="50%" cy="50%" innerRadius={22} outerRadius={36} strokeWidth={0}>
                  {deviceStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex-1 grid grid-cols-2 gap-2">
              {deviceStatusData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                  <span className="text-[10px] font-mono text-intel-muted capitalize">{d.name}</span>
                  <span className="text-[10px] font-mono text-intel-text font-semibold">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Device Matrix */}
      <div className="hud-card p-3">
        <div className="text-[10px] font-display font-semibold tracking-wider text-intel-muted uppercase mb-3">
          Device Matrix ({customerDevices.length})
        </div>
        <div className="space-y-1.5">
          {customerDevices.map(device => (
            <button
              key={device.id}
              onClick={() => onSelectDevice(device)}
              className="w-full flex items-center gap-3 p-2 rounded border border-intel-border/30 hover:border-[rgba(0,212,255,0.25)] bg-intel-bg/40 transition-all group"
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: statusColor(device.status) }} />
              <DeviceIcon type={device.type} />
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs font-mono text-intel-text group-hover:text-intel-cyan transition-colors truncate">
                  {device.hostname}
                </div>
                <div className="text-[10px] font-mono text-intel-muted">{device.ip}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] font-mono text-intel-muted capitalize">{device.status}</div>
                {device.alerts > 0 && (
                  <div className="text-[10px] font-mono text-intel-red">{device.alerts} alerts</div>
                )}
              </div>
              <ChevronRight className="w-3 h-3 text-intel-dim group-hover:text-intel-cyan transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Active Tickets */}
      {customerTickets.length > 0 && (
        <div className="hud-card p-3">
          <div className="text-[10px] font-display font-semibold tracking-wider text-intel-muted uppercase mb-3">
            Active Tickets ({customerTickets.length})
          </div>
          <div className="space-y-1.5">
            {customerTickets
              .sort((a, b) => {
                const sev: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
                return (sev[a.severity] ?? 4) - (sev[b.severity] ?? 4)
              })
              .map(ticket => (
                <TicketRow key={ticket.id} ticket={ticket} />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DeviceDetailPanel({ device, customers }: { device: Device; customers: Customer[] }) {
  const deviceTickets = useMemo(() => tickets.filter(t => t.deviceId === device.id), [device.id])
  const customer = useMemo(() => customers.find(c => c.id === device.customerId), [device.customerId, customers])

  return (
    <div className="p-3 space-y-3 animate-fade-in">
      <div className="hud-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColor(device.status) }} />
          <DeviceIcon type={device.type} className="w-4 h-4 text-intel-cyan" />
          <span className="font-display font-bold text-lg text-intel-text">{device.hostname}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <InfoRow label="Type" value={device.type} />
          <InfoRow label="Status" value={device.status.toUpperCase()} color={statusColor(device.status)} />
          <InfoRow label="IP Address" value={device.ip} />
          <InfoRow label="Operating System" value={device.os} />
          <InfoRow label="Uptime" value={device.uptime} />
          <InfoRow label="Active Alerts" value={device.alerts.toString()} color={device.alerts > 0 ? RISK_COLORS.high : undefined} />
          {customer && <InfoRow label="Customer" value={customer.name} />}
          <InfoRow label="Last Seen" value={new Date(device.lastSeen).toLocaleString()} />
        </div>
      </div>

      {deviceTickets.length > 0 && (
        <div className="hud-card p-3">
          <div className="text-[10px] font-display font-semibold tracking-wider text-intel-muted uppercase mb-3">
            Related Tickets ({deviceTickets.length})
          </div>
          <div className="space-y-1.5">
            {deviceTickets.map(ticket => (
              <TicketRow key={ticket.id} ticket={ticket} />
            ))}
          </div>
        </div>
      )}

      {deviceTickets.length === 0 && (
        <div className="hud-card p-4 flex flex-col items-center justify-center text-center">
          <Shield className="w-8 h-8 text-intel-green/40 mb-2" />
          <span className="text-xs font-mono text-intel-muted">No active tickets</span>
          <span className="text-[10px] font-mono text-intel-dim">Device operating normally</span>
        </div>
      )}
    </div>
  )
}

function BottomBar({ customers }: { customers: Customer[] }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const onlineDevices = devices.filter(d => d.status === 'online').length

  return (
    <div className="h-8 border-t border-intel-border bg-intel-surface flex items-center justify-between px-5 shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-intel-green" />
          <span className="text-[10px] font-mono text-intel-muted">STATUS:</span>
          <span className="text-[10px] font-mono text-intel-green font-semibold">NOMINAL</span>
        </div>
        <span className="text-intel-dim">|</span>
        <div className="flex items-center gap-1.5">
          <Eye className="w-3 h-3 text-intel-muted" />
          <span className="text-[10px] font-mono text-intel-muted">MONITORING:</span>
          <span className="text-[10px] font-mono text-intel-text font-semibold">{onlineDevices}/{devices.length}</span>
        </div>
        <span className="text-intel-dim">|</span>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-intel-muted" />
          <span className="text-[10px] font-mono text-intel-muted">LOCATIONS:</span>
          <span className="text-[10px] font-mono text-intel-text font-semibold">{customers.length}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Clock className="w-3 h-3 text-intel-muted" />
        <span className="text-[10px] font-mono text-intel-cyan tabular-nums">
          {time.toLocaleTimeString('en-US', { hour12: false })}
        </span>
        <span className="text-[10px] font-mono text-intel-dim">UTC</span>
      </div>
    </div>
  )
}

// ─── Main App ───────────────────────────────────────────────

function App() {
  const [liveCustomers, setLiveCustomers] = useState<Customer[]>(customers)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const pending = liveCustomers.filter(c => c.address && !c.lat && !c.lng)
      if (!pending.length) return
      const updated = [...liveCustomers]
      for (const c of pending) {
        if (cancelled) return
        const coords = await geocodeAddress(c.address!)
        if (coords) {
          const idx = updated.findIndex(u => u.id === c.id)
          if (idx !== -1) updated[idx] = { ...updated[idx], ...coords }
        }
        await new Promise(r => setTimeout(r, 1100))
      }
      if (!cancelled) setLiveCustomers(updated)
    }
    run()
    return () => { cancelled = true }
  }, [])

  const mapCenter = useMemo<[number, number]>(() => {
    if (selectedCustomer) return [selectedCustomer.lat, selectedCustomer.lng]
    return [39.8283, -98.5795]
  }, [selectedCustomer])

  const mapZoom = useMemo(() => selectedCustomer ? 8 : 4, [selectedCustomer])

  const handleSelectCustomer = useCallback((customer: Customer | null) => {
    setSelectedCustomer(customer)
    setSelectedDevice(null)
  }, [])

  const handleSelectDevice = useCallback((device: Device | null) => {
    setSelectedDevice(device)
  }, [])

  const handleBack = useCallback(() => {
    if (selectedDevice) {
      setSelectedDevice(null)
    } else {
      setSelectedCustomer(null)
    }
  }, [selectedDevice])

  return (
    <div className="h-screen w-screen overflow-hidden bg-intel-bg flex flex-col">
      <StatusBar customers={liveCustomers} />

      <div className="flex flex-1 min-h-0">
        {/* ── Tactical Map ── */}
        <div className="flex-1 relative">
          <MapContainer
            center={[39.8283, -98.5795]}
            zoom={4}
            className="h-full w-full"
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            <MapController center={mapCenter} zoom={mapZoom} />
            {liveCustomers.filter(c => c.lat && c.lng).map(c => (
              <Marker
                key={c.id}
                position={[c.lat, c.lng]}
                icon={createMarkerIcon(c, selectedCustomer?.id === c.id)}
                eventHandlers={{ click: () => handleSelectCustomer(c) }}
              >
                <Popup>
                  <div className="font-mono" style={{ minWidth: 160 }}>
                    <div className="text-sm font-bold" style={{ color: '#e2e8f0' }}>{c.name}</div>
                    <div className="text-xs mt-1" style={{ color: '#64748b' }}>{c.city}, {c.state} &middot; {c.type}</div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px]" style={{ color: riskColor(c.riskLevel) }}>&#9679; {c.riskLevel.toUpperCase()}</span>
                      <span className="text-[10px]" style={{ color: '#64748b' }}>{c.deviceCount} devices</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Map Overlays */}
          <div className="absolute inset-0 pointer-events-none z-[400]">
            <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-intel-bg/70 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-intel-bg/70 to-transparent" />
            <div className="absolute right-0 inset-y-0 w-12 bg-gradient-to-l from-intel-bg/80 to-transparent" />
          </div>
          <div className="absolute inset-0 pointer-events-none scanline-overlay z-[401]" />

          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 z-[500] hud-card p-2.5">
            <div className="text-[9px] font-display font-semibold tracking-wider text-intel-muted uppercase mb-1.5">
              Threat Level
            </div>
            <div className="flex gap-3">
              {(['critical', 'high', 'medium', 'low'] as const).map(level => (
                <div key={level} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: riskColor(level) }} />
                  <span className="text-[9px] font-mono text-intel-muted capitalize">{level}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Intel Panel ── */}
        <div className="w-[440px] border-l border-intel-border bg-intel-surface overflow-hidden flex flex-col shrink-0">
          {/* Panel Header */}
          <div className="h-10 border-b border-intel-border flex items-center px-4 gap-2 shrink-0">
            {(selectedCustomer || selectedDevice) && (
              <button onClick={handleBack} className="text-intel-muted hover:text-intel-cyan transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <span className="font-display text-xs font-semibold tracking-wider text-intel-muted uppercase">
              {selectedDevice ? 'Device Intel' : selectedCustomer ? 'Customer Intel' : 'Network Overview'}
            </span>
            {selectedCustomer && !selectedDevice && (
              <button onClick={() => handleSelectCustomer(null)} className="ml-auto text-intel-muted hover:text-intel-red transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {selectedDevice && (
              <span className="ml-auto text-[10px] font-mono text-intel-dim">{selectedDevice.id}</span>
            )}
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {selectedDevice ? (
              <DeviceDetailPanel device={selectedDevice} customers={liveCustomers} />
            ) : selectedCustomer ? (
              <CustomerDetailPanel customer={selectedCustomer} onSelectDevice={handleSelectDevice} />
            ) : (
              <CustomerListPanel customers={liveCustomers} onSelectCustomer={handleSelectCustomer} />
            )}
          </div>
        </div>
      </div>

      <BottomBar customers={liveCustomers} />
    </div>
  )
}

export default App
