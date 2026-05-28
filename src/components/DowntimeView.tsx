'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Zap, Clock, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';
import TurbotechLogo from '@/components/TurbotechLogo';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

interface Downtime {
  id: string;
  machineId: string;
  operatorId: string;
  reason: string;
  startTime: Date;
  endTime: Date | null;
  durationMinutes: number | null;
}

const REASON_LABELS: Record<string, string> = {
  BREAKDOWN: 'Machine Breakdown',
  POWER_CUT: 'Power Cut',
  SETUP: 'Tool Setup / Changeover',
};

const REASON_COLORS: Record<string, string> = {
  BREAKDOWN: '#ef4444',
  POWER_CUT: '#f59e0b',
  SETUP: '#3b82f6',
};

const REASON_ICONS: Record<string, any> = {
  BREAKDOWN: AlertTriangle,
  POWER_CUT: Zap,
  SETUP: Wrench,
};

export default function DowntimeView({ downtimes, machines, users }: { downtimes: Downtime[], machines: any[], users: any[] }) {
  const [machineFilter, setMachineFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = useMemo(() => {
    let result = [...downtimes];
    if (machineFilter !== 'all') result = result.filter(d => d.machineId === machineFilter);
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter(d => new Date(d.startTime) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59);
      result = result.filter(d => new Date(d.startTime) <= to);
    }
    return result;
  }, [downtimes, machineFilter, dateFrom, dateTo]);

  // Stats
  const totalEvents = filtered.length;
  const totalMinutes = filtered.reduce((s, d) => s + (d.durationMinutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const avgDuration = totalEvents > 0 ? (totalMinutes / totalEvents).toFixed(0) : '0';

  // Pie chart: by reason
  const reasonCounts = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(d => {
      map[d.reason] = (map[d.reason] || 0) + 1;
    });
    return Object.entries(map).map(([reason, count]) => ({
      name: REASON_LABELS[reason] || reason,
      value: count,
      color: REASON_COLORS[reason] || '#888',
    }));
  }, [filtered]);

  // Bar chart: duration by machine
  const machineDurations = useMemo(() => {
    const map: Record<string, { total: number, breakdown: number, power: number, setup: number }> = {};
    machines.forEach(m => { map[m.id] = { total: 0, breakdown: 0, power: 0, setup: 0 }; });
    filtered.forEach(d => {
      if (!map[d.machineId]) return;
      const mins = d.durationMinutes || 0;
      map[d.machineId].total += mins;
      if (d.reason === 'BREAKDOWN') map[d.machineId].breakdown += mins;
      else if (d.reason === 'POWER_CUT') map[d.machineId].power += mins;
      else if (d.reason === 'SETUP') map[d.machineId].setup += mins;
    });
    return machines.map(m => ({
      name: m.name,
      Breakdown: Math.round(map[m.id]?.breakdown || 0),
      'Power Cut': Math.round(map[m.id]?.power || 0),
      Setup: Math.round(map[m.id]?.setup || 0),
    }));
  }, [filtered, machines]);

  // Reason summary cards
  const reasonSummary = useMemo(() => {
    const map: Record<string, { count: number, minutes: number }> = {};
    filtered.forEach(d => {
      if (!map[d.reason]) map[d.reason] = { count: 0, minutes: 0 };
      map[d.reason].count++;
      map[d.reason].minutes += d.durationMinutes || 0;
    });
    return Object.entries(map).map(([reason, data]) => ({
      reason,
      label: REASON_LABELS[reason] || reason,
      ...data,
    }));
  }, [filtered]);

  return (
    <div className="flex justify-center min-h-screen bg-background text-foreground font-body">
      <div className="w-full max-w-7xl flex flex-col min-h-screen">

        {/* Header */}
        <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border bg-card shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <TurbotechLogo variant="icon" size="sm" />
            <h1 className="text-sm font-bold uppercase tracking-widest text-foreground">Downtime Analysis</h1>
          </div>
          <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-wider rounded-md hover:bg-secondary/80 transition-colors">
            <ArrowLeft size={14} /> Dashboard
          </Link>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 max-w-7xl mx-auto">

            {/* Filters */}
            <div className="card-industrial p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <select value={machineFilter} onChange={e => setMachineFilter(e.target.value)}
                  className="px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-primary">
                  <option value="all">All Machines</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="card-industrial p-4 text-center border-l-4 border-l-status-down">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Total Events</p>
                <p className="text-2xl font-bold font-mono-display">{totalEvents}</p>
              </div>
              <div className="card-industrial p-4 text-center border-l-4 border-l-status-idle">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Total Downtime</p>
                <p className="text-2xl font-bold font-mono-display">{totalHours}h</p>
              </div>
              <div className="card-industrial p-4 text-center border-l-4 border-l-primary">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Avg Duration</p>
                <p className="text-2xl font-bold font-mono-display">{avgDuration}m</p>
              </div>
              <div className="card-industrial p-4 text-center border-l-4 border-l-status-running">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Machines Affected</p>
                <p className="text-2xl font-bold font-mono-display">{new Set(filtered.map(d => d.machineId)).size}</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Pie Chart: By Reason */}
              <div className="card-industrial p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Downtime by Reason</h3>
                {reasonCounts.length > 0 ? (
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={reasonCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={50} strokeWidth={2} stroke="hsl(var(--background))">
                          {reasonCounts.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3">
                      {reasonCounts.map(r => (
                        <div key={r.name} className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                          <span className="text-xs">{r.name}</span>
                          <span className="text-xs font-bold ml-auto font-mono-display">{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No downtime events in selected range</p>
                )}
              </div>

              {/* Bar Chart: Duration by Machine */}
              <div className="card-industrial p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Downtime Duration by Machine (minutes)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={machineDurations} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="Breakdown" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Power Cut" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="Setup" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Reason breakdown cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {reasonSummary.map(r => {
                const Icon = REASON_ICONS[r.reason] || AlertTriangle;
                const color = REASON_COLORS[r.reason] || '#888';
                return (
                  <div key={r.reason} className="card-industrial p-5 flex items-start gap-4">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: `${color}15` }}>
                      <Icon size={22} style={{ color }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">{r.label}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{r.count} events · {(r.minutes / 60).toFixed(1)} hours total</p>
                      <p className="text-xs text-muted-foreground">Avg: {r.count > 0 ? Math.round(r.minutes / r.count) : 0} min per event</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent Events Table */}
            <div className="card-industrial p-0 overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-secondary/20">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">All Downtime Events</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                      <th className="px-4 py-2.5 text-left">Date</th>
                      <th className="px-4 py-2.5 text-left">Machine</th>
                      <th className="px-4 py-2.5 text-left">Operator</th>
                      <th className="px-4 py-2.5 text-left">Reason</th>
                      <th className="px-4 py-2.5 text-right">Duration</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 50).map((d, idx) => {
                      const machine = machines.find(m => m.id === d.machineId);
                      const operator = users.find(u => u.id === d.operatorId);
                      const color = REASON_COLORS[d.reason] || '#888';
                      return (
                        <tr key={d.id} className={`border-b border-border/50 hover:bg-secondary/20 transition-colors ${idx % 2 === 0 ? '' : 'bg-secondary/5'}`}>
                          <td className="px-4 py-2 text-xs font-mono-display text-muted-foreground">
                            {new Date(d.startTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                            <span className="ml-1 opacity-50">{new Date(d.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td className="px-4 py-2 text-xs font-medium">{machine?.name || d.machineId}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{operator?.name || d.operatorId}</td>
                          <td className="px-4 py-2">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}15`, color }}>
                              {REASON_LABELS[d.reason] || d.reason}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-xs text-right font-mono-display font-bold">
                            {d.durationMinutes ? `${d.durationMinutes}m` : '—'}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`text-[10px] uppercase font-bold tracking-wider ${d.endTime ? 'text-status-running' : 'text-status-down'}`}>
                              {d.endTime ? 'Resolved' : 'Open'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </motion.div>
        </main>
      </div>
    </div>
  );
}
