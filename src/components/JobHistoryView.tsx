'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Filter, Package, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import TurbotechLogo from '@/components/TurbotechLogo';

interface Job {
  id: string;
  machineId: string;
  operatorId: string;
  createdAt: Date;
  companyName: string;
  componentName: string;
  quantity: number;
  okParts: number;
  castingRejection: number;
  machineRejection: number;
  blowHole: number;
  rework: number;
}

export default function JobHistoryView({ jobs, machines, users }: { jobs: Job[], machines: any[], users: any[] }) {
  const [search, setSearch] = useState('');
  const [machineFilter, setMachineFilter] = useState('all');
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortField, setSortField] = useState<'date' | 'ok' | 'defects' | 'oee'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const PER_PAGE = 25;

  const operators = users.filter(u => u.role === 'OPERATOR');

  const filteredJobs = useMemo(() => {
    let result = jobs.map(j => {
      const totalDefects = j.castingRejection + j.machineRejection + j.blowHole + j.rework;
      const totalParts = j.okParts + totalDefects;
      const oee = totalParts > 0 ? (j.okParts / totalParts) * 100 : 0;
      return { ...j, totalDefects, totalParts, oee };
    });

    // Search
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(j => 
        j.companyName.toLowerCase().includes(s) || 
        j.componentName.toLowerCase().includes(s) ||
        machines.find(m => m.id === j.machineId)?.name.toLowerCase().includes(s) ||
        users.find(u => u.id === j.operatorId)?.name.toLowerCase().includes(s)
      );
    }

    // Machine filter
    if (machineFilter !== 'all') {
      result = result.filter(j => j.machineId === machineFilter);
    }

    // Operator filter
    if (operatorFilter !== 'all') {
      result = result.filter(j => j.operatorId === operatorFilter);
    }

    // Date range
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter(j => new Date(j.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59);
      result = result.filter(j => new Date(j.createdAt) <= to);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortField === 'ok') cmp = a.okParts - b.okParts;
      else if (sortField === 'defects') cmp = a.totalDefects - b.totalDefects;
      else if (sortField === 'oee') cmp = a.oee - b.oee;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [jobs, search, machineFilter, operatorFilter, dateFrom, dateTo, sortField, sortDir, machines, users]);

  const totalPages = Math.ceil(filteredJobs.length / PER_PAGE);
  const pageJobs = filteredJobs.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  // Summary stats
  const totalOk = filteredJobs.reduce((s, j) => s + j.okParts, 0);
  const totalDef = filteredJobs.reduce((s, j) => s + j.totalDefects, 0);
  const avgOee = filteredJobs.length > 0 ? (filteredJobs.reduce((s, j) => s + j.oee, 0) / filteredJobs.length) : 0;

  return (
    <div className="flex justify-center min-h-screen bg-background text-foreground font-body">
      <div className="w-full max-w-7xl flex flex-col min-h-screen">

        {/* Header */}
        <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border bg-card shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <TurbotechLogo variant="icon" size="sm" />
            <h1 className="text-sm font-bold uppercase tracking-widest text-foreground">Job History</h1>
          </div>
          <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-wider rounded-md hover:bg-secondary/80 transition-colors">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 max-w-7xl mx-auto">

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="card-industrial p-4 text-center">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Matching Jobs</p>
                <p className="text-2xl font-bold font-mono-display">{filteredJobs.length.toLocaleString()}</p>
              </div>
              <div className="card-industrial p-4 text-center">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">OK Parts</p>
                <p className="text-2xl font-bold font-mono-display text-status-running">{totalOk.toLocaleString()}</p>
              </div>
              <div className="card-industrial p-4 text-center">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Total Defects</p>
                <p className="text-2xl font-bold font-mono-display text-status-down">{totalDef.toLocaleString()}</p>
              </div>
              <div className="card-industrial p-4 text-center">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Avg OEE</p>
                <p className={`text-2xl font-bold font-mono-display ${avgOee >= 95 ? 'text-status-running' : avgOee >= 85 ? 'text-status-idle' : 'text-status-down'}`}>{avgOee.toFixed(1)}%</p>
              </div>
            </div>

            {/* Filters */}
            <div className="card-industrial p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search by component, company, operator, machine..."
                    className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <select value={machineFilter} onChange={e => { setMachineFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-primary">
                  <option value="all">All Machines</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <select value={operatorFilter} onChange={e => { setOperatorFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-primary">
                  <option value="all">All Operators</option>
                  {operators.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                  className="px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
                <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
                  className="px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
              </div>
            </div>

            {/* Table */}
            <div className="card-industrial p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30 text-[10px] uppercase tracking-widest text-muted-foreground">
                      <th className="px-4 py-3 text-left cursor-pointer hover:text-foreground" onClick={() => toggleSort('date')}>
                        <span className="flex items-center gap-1">Date <SortIcon field="date" /></span>
                      </th>
                      <th className="px-4 py-3 text-left">Machine</th>
                      <th className="px-4 py-3 text-left">Operator</th>
                      <th className="px-4 py-3 text-left">Company</th>
                      <th className="px-4 py-3 text-left">Component</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right cursor-pointer hover:text-foreground" onClick={() => toggleSort('ok')}>
                        <span className="flex items-center justify-end gap-1">OK <SortIcon field="ok" /></span>
                      </th>
                      <th className="px-4 py-3 text-right cursor-pointer hover:text-foreground" onClick={() => toggleSort('defects')}>
                        <span className="flex items-center justify-end gap-1">Defects <SortIcon field="defects" /></span>
                      </th>
                      <th className="px-4 py-3 text-right cursor-pointer hover:text-foreground" onClick={() => toggleSort('oee')}>
                        <span className="flex items-center justify-end gap-1">OEE <SortIcon field="oee" /></span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageJobs.map((j, idx) => {
                      const machine = machines.find(m => m.id === j.machineId);
                      const operator = users.find(u => u.id === j.operatorId);
                      return (
                        <tr key={j.id} className={`border-b border-border/50 hover:bg-secondary/20 transition-colors ${idx % 2 === 0 ? '' : 'bg-secondary/5'}`}>
                          <td className="px-4 py-2.5 text-xs font-mono-display text-muted-foreground">
                            {new Date(j.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                            <span className="ml-1.5 opacity-50">
                              {new Date(j.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-medium text-xs">{machine?.name || j.machineId}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{operator?.name || j.operatorId}</td>
                          <td className="px-4 py-2.5 text-xs">{j.companyName}</td>
                          <td className="px-4 py-2.5 text-xs font-medium">{j.componentName}</td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono-display">{j.quantity}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="text-xs font-bold text-status-running font-mono-display">{j.okParts}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`text-xs font-bold font-mono-display ${j.totalDefects > 0 ? 'text-status-down' : 'text-muted-foreground'}`}>
                              {j.totalDefects}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`inline-flex items-center gap-1 text-xs font-bold font-mono-display px-2 py-0.5 rounded-full ${
                              j.oee >= 95 ? 'bg-status-running/10 text-status-running' :
                              j.oee >= 85 ? 'bg-status-idle/10 text-status-idle' :
                              'bg-status-down/10 text-status-down'
                            }`}>
                              {j.oee >= 95 ? <CheckCircle size={10} /> : j.oee < 85 ? <XCircle size={10} /> : null}
                              {j.oee.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/10">
                  <p className="text-xs text-muted-foreground">
                    Showing {((page - 1) * PER_PAGE) + 1}–{Math.min(page * PER_PAGE, filteredJobs.length)} of {filteredJobs.length.toLocaleString()} jobs
                  </p>
                  <div className="flex gap-1">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                      className="px-3 py-1 rounded text-xs font-bold bg-secondary hover:bg-secondary/80 disabled:opacity-30 transition-colors">Prev</button>
                    {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                      const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
                      if (p < 1 || p > totalPages) return null;
                      return (
                        <button key={p} onClick={() => setPage(p)}
                          className={`px-3 py-1 rounded text-xs font-bold transition-colors ${page === p ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}>{p}</button>
                      );
                    })}
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                      className="px-3 py-1 rounded text-xs font-bold bg-secondary hover:bg-secondary/80 disabled:opacity-30 transition-colors">Next</button>
                  </div>
                </div>
              )}
            </div>

          </motion.div>
        </main>
      </div>
    </div>
  );
}
