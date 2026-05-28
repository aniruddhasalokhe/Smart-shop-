'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download, Search, 
  Users, Monitor, CheckCircle, AlertTriangle, TrendingUp, Activity, 
  Clock, ArrowLeft, Filter, FileSpreadsheet, RefreshCw
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import TurbotechLogo from '@/components/TurbotechLogo';

interface CalendarViewProps {
  machines: any[];
  jobs: any[];
  users: any[];
}

export default function CalendarView({ machines, jobs, users }: CalendarViewProps) {
  // Navigation & View States
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'year'>('day');
  
  // Calendar Grid Nav States
  const [navYear, setNavYear] = useState<number>(selectedDate.getFullYear());
  const [navMonth, setNavMonth] = useState<number>(selectedDate.getMonth()); // 0-indexed

  // Filters State
  const [selectedOperator, setSelectedOperator] = useState<string>('ALL');
  const [selectedMachine, setSelectedMachine] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ---------------------------------------------------------------------------
  // Helper Date Functions
  // ---------------------------------------------------------------------------
  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getWeekRange = (d: Date) => {
    const temp = new Date(d);
    const day = temp.getDay();
    const diff = temp.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(temp.setDate(diff));
    const sunday = new Date(temp.setDate(diff + 6));
    return { start: monday, end: sunday };
  };

  const getMonthName = (monthIdx: number) => {
    const names = [
      'January', 'February', 'March', 'April', 'May', 'June', 
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return names[monthIdx];
  };

  // ---------------------------------------------------------------------------
  // Filtered & Grouped Jobs Selector
  // ---------------------------------------------------------------------------
  // Parse all jobs with proper local date elements to guarantee precision
  const parsedJobs = useMemo(() => {
    return jobs.map(j => {
      const d = new Date(j.createdAt);
      const dateStr = getLocalDateString(d);
      return {
        ...j,
        localDate: d,
        localDateString: dateStr,
        localYear: d.getFullYear(),
        localMonth: d.getMonth(),
        localWeekRange: getWeekRange(d)
      };
    });
  }, [jobs]);

  // Apply filters first (Operator, Machine, Keyword Search)
  const filteredJobs = useMemo(() => {
    return parsedJobs.filter(job => {
      // 1. Operator Filter
      if (selectedOperator !== 'ALL' && job.operatorId !== selectedOperator) {
        return false;
      }
      // 2. Machine Filter
      if (selectedMachine !== 'ALL' && job.machineId !== selectedMachine) {
        return false;
      }
      // 3. Search Query Filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const opName = users.find(u => u.id === job.operatorId)?.name?.toLowerCase() || '';
        const opAlias = users.find(u => u.id === job.operatorId)?.username?.toLowerCase() || '';
        const machName = machines.find(m => m.id === job.machineId)?.name?.toLowerCase() || '';
        const compName = job.componentName?.toLowerCase() || '';
        const compOrig = job.companyName?.toLowerCase() || '';
        
        const matches = 
          opName.includes(query) || 
          opAlias.includes(query) || 
          machName.includes(query) || 
          compName.includes(query) || 
          compOrig.includes(query);

        if (!matches) return false;
      }
      return true;
    });
  }, [parsedJobs, selectedOperator, selectedMachine, searchQuery, users, machines]);

  // Further filter jobs based on active Period Selection (Day, Week, Month, Year)
  const activePeriodJobs = useMemo(() => {
    return filteredJobs.filter(job => {
      const jDate = job.localDate;
      
      if (viewMode === 'day') {
        return job.localDateString === getLocalDateString(selectedDate);
      }
      
      if (viewMode === 'week') {
        const { start, end } = getWeekRange(selectedDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return jDate >= start && jDate <= end;
      }
      
      if (viewMode === 'month') {
        return job.localYear === selectedDate.getFullYear() && job.localMonth === selectedDate.getMonth();
      }
      
      if (viewMode === 'year') {
        return job.localYear === selectedDate.getFullYear();
      }

      return true;
    });
  }, [filteredJobs, viewMode, selectedDate]);

  // Aggregate Metrics for Active Period Selection
  const metrics = useMemo(() => {
    let ok = 0;
    let casting = 0;
    let machining = 0;
    let rework = 0;
    let quantity = 0;

    activePeriodJobs.forEach(j => {
      ok += j.okParts;
      casting += j.castingRejection;
      machining += j.machineRejection;
      rework += j.rework;
      quantity += j.quantity;
    });

    const defects = casting + machining;
    const totalProcessed = ok + defects + rework;
    const oee = totalProcessed > 0 ? ((ok / totalProcessed) * 100).toFixed(1) : '0.0';

    return { ok, defects, casting, machining, rework, totalProcessed, quantity, oee };
  }, [activePeriodJobs]);

  // Grouped Job metrics by Day for visual Calendar Grid overlay
  const jobsByDayMap = useMemo(() => {
    const map: Record<string, { ok: number; rejections: number; total: number }> = {};
    
    // We base calendar overlay metrics on overall filtered jobs so it reflects active filters (operator/machine/search)
    filteredJobs.forEach(job => {
      const dateStr = job.localDateString;
      if (!map[dateStr]) {
        map[dateStr] = { ok: 0, rejections: 0, total: 0 };
      }
      map[dateStr].ok += job.okParts;
      map[dateStr].rejections += job.castingRejection + job.machineRejection + job.rework;
      map[dateStr].total += job.okParts + job.castingRejection + job.machineRejection + job.rework;
    });
    return map;
  }, [filteredJobs]);

  // ---------------------------------------------------------------------------
  // Excel/CSV Exporter
  // ---------------------------------------------------------------------------
  const handleExportCSV = async () => {
    try {
      const res = await fetch('/api/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `TurboTech_Production_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export. Please try again.');
    }
  };

  // ---------------------------------------------------------------------------
  // Calendar Grid Constructor
  // ---------------------------------------------------------------------------
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(navYear, navMonth, 1).getDay(); // 0 = Sun, 1 = Mon...
    const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Mon = 0, Sun = 6
    const daysInCurMonth = new Date(navYear, navMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(navYear, navMonth, 0).getDate();

    const cells: { date: Date; isCurrentMonth: boolean; key: string }[] = [];

    // Prev Month Padding Days
    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      const dayVal = daysInPrevMonth - i;
      const prevDate = new Date(navMonth === 0 ? navYear - 1 : navYear, navMonth === 0 ? 11 : navMonth - 1, dayVal);
      cells.push({
        date: prevDate,
        isCurrentMonth: false,
        key: `prev-${dayVal}`
      });
    }

    // Current Month Days
    for (let i = 1; i <= daysInCurMonth; i++) {
      const curDate = new Date(navYear, navMonth, i);
      cells.push({
        date: curDate,
        isCurrentMonth: true,
        key: `cur-${i}`
      });
    }

    // Next Month Padding Days to complete standard 6-row grid (42 cells)
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(navMonth === 11 ? navYear + 1 : navYear, navMonth === 11 ? 0 : navMonth + 1, i);
      cells.push({
        date: nextDate,
        isCurrentMonth: false,
        key: `next-${i}`
      });
    }

    return cells;
  }, [navYear, navMonth]);

  const handlePrevMonth = () => {
    if (navMonth === 0) {
      setNavMonth(11);
      setNavYear(y => y - 1);
    } else {
      setNavMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (navMonth === 11) {
      setNavMonth(0);
      setNavYear(y => y + 1);
    } else {
      setNavMonth(m => m + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setNavMonth(today.getMonth());
    setNavYear(today.getFullYear());
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() && 
           d1.getMonth() === d2.getMonth() && 
           d1.getDate() === d2.getDate();
  };

  const isSameWeek = (d1: Date, d2: Date) => {
    const w1 = getWeekRange(d1);
    const w2 = getWeekRange(d2);
    return w1.start.getTime() === w2.start.getTime();
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedOperator('ALL');
    setSelectedMachine('ALL');
    setSearchQuery('');
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body select-none">
      
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shadow-sm z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all border border-border/50">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-3">
            <TurbotechLogo variant="full" size="md" />
            <div className="h-6 w-[1px] bg-border mx-2 hidden sm:block"></div>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest hidden sm:block pt-1.5" style={{ color: 'hsl(var(--primary))' }}>Activity Calendar</p>
          </div>
        </div>

        {/* View Selection Bar */}
        <div className="flex bg-secondary p-1 rounded-lg border border-border">
          {(['day', 'week', 'month', 'year'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setViewMode(mode);
                if (mode === 'month') {
                  setSelectedDate(new Date(navYear, navMonth, 1));
                }
              }}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                viewMode === mode 
                  ? 'bg-primary text-primary-foreground shadow glow-primary font-bold' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Action Button */}
        <button 
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded-md hover:bg-emerald-500 transition-all shadow-sm outline-none"
        >
          <FileSpreadsheet size={14} /> Export Excel
        </button>
      </header>

      {/* Main Layout Grid */}
      <main className="flex-1 flex flex-col xl:flex-row min-h-0 overflow-hidden">
        
        {/* Left Section: Calendar and Filters */}
        <section className="w-full xl:w-[480px] p-6 border-r border-border flex flex-col gap-6 overflow-y-auto shrink-0 custom-scrollbar bg-card/10">
          
          {/* Quick Filters */}
          <div className="card-industrial space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <h3 className="text-xs font-bold font-mono-display uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Filter size={12} /> Active Telemetry Filters
              </h3>
              {(selectedOperator !== 'ALL' || selectedMachine !== 'ALL' || searchQuery !== '') && (
                <button onClick={handleResetFilters} className="text-[10px] text-primary hover:underline uppercase font-bold flex items-center gap-1">
                  <RefreshCw size={8} /> Clear
                </button>
              )}
            </div>

            <div className="space-y-3 text-xs">
              {/* Operator */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Operator Selection</label>
                <select
                  value={selectedOperator}
                  onChange={(e) => setSelectedOperator(e.target.value)}
                  className="w-full p-2 rounded bg-background border border-border focus:outline-none focus:border-primary text-xs"
                >
                  <option value="ALL">All Operators</option>
                  {users.filter(u=>u.role === 'OPERATOR').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.username})</option>
                  ))}
                </select>
              </div>

              {/* Machine */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Hardware Node</label>
                <select
                  value={selectedMachine}
                  onChange={(e) => setSelectedMachine(e.target.value)}
                  className="w-full p-2 rounded bg-background border border-border focus:outline-none focus:border-primary text-xs"
                >
                  <option value="ALL">All Hardware Nodes</option>
                  {machines.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Keyword Search */}
              <div className="space-y-1 relative">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Schematic Keyword</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search component, client, etc..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-2 pl-8 rounded bg-background border border-border focus:outline-none focus:border-primary text-xs placeholder:text-muted-foreground/45"
                  />
                  <Search size={12} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Display Control (Day, Week, Month view grids) */}
          {viewMode !== 'year' ? (
            <div className="card-industrial p-4 flex flex-col gap-4">
              
              {/* Calendar Navigator */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold font-mono-display text-foreground leading-tight">
                    {getMonthName(navMonth)} {navYear}
                  </h4>
                  <p className="text-[10px] text-muted-foreground">Active Selection: {selectedDate.toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={handlePrevMonth} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={handleToday} className="px-2 py-1 rounded hover:bg-secondary text-[10px] font-mono-display uppercase tracking-widest text-primary font-bold">
                    TODAY
                  </button>
                  <button onClick={handleNextMonth} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Weekly Header Row */}
              <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border/30 pb-2">
                <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
              </div>

              {/* Monthly Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((cell) => {
                  const dayJobs = jobsByDayMap[getLocalDateString(cell.date)];
                  const hasActivity = dayJobs && dayJobs.total > 0;
                  const isSelected = viewMode === 'day' && isSameDay(cell.date, selectedDate);
                  const isInSelectedWeek = viewMode === 'week' && isSameWeek(cell.date, selectedDate);
                  
                  // Color codes for status overlay
                  let dotColor = 'bg-muted';
                  let cellBg = '';
                  
                  if (hasActivity) {
                    const defectRate = dayJobs.rejections / dayJobs.total;
                    if (defectRate === 0) {
                      dotColor = 'bg-status-running'; // Solid Approved Green
                      cellBg = 'bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10';
                    } else if (defectRate < 0.15) {
                      dotColor = 'bg-status-idle'; // Caution Amber
                      cellBg = 'bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10';
                    } else {
                      dotColor = 'bg-status-down'; // Reject Red
                      cellBg = 'bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10';
                    }
                  }

                  const isTodayCell = isSameDay(cell.date, new Date());

                  return (
                    <button
                      key={cell.key}
                      onClick={() => {
                        setSelectedDate(cell.date);
                        setNavMonth(cell.date.getMonth());
                        setNavYear(cell.date.getFullYear());
                      }}
                      className={`relative aspect-square flex flex-col justify-between p-1.5 rounded transition-all select-none border text-left group ${
                        !cell.isCurrentMonth ? 'opacity-35 hover:opacity-75' : ''
                      } ${cellBg || 'border-transparent hover:bg-secondary/35'} ${
                        isSelected 
                          ? 'border-primary bg-primary/10! ring-1 ring-primary glow-primary' 
                          : isInSelectedWeek 
                            ? 'border-primary/50 bg-primary/5!' 
                            : ''
                      } ${isTodayCell ? 'ring-1 ring-muted-foreground/30' : ''}`}
                    >
                      {/* Day Number */}
                      <span className={`text-xs font-mono-display font-medium ${
                        isTodayCell ? 'text-primary font-bold' : ''
                      }`}>
                        {cell.date.getDate()}
                      </span>

                      {/* Small Indicator */}
                      {hasActivity && (
                        <div className="flex items-center justify-between w-full">
                          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotColor}`}></span>
                          <span className="text-[8px] font-mono-display text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            +{dayJobs.ok}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

            </div>
          ) : (
            /* Year Mode Selector Grid (12 Months) */
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 12 }).map((_, idx) => {
                const monthDate = new Date(selectedDate.getFullYear(), idx, 1);
                const isSelected = selectedDate.getMonth() === idx;
                
                // Aggregate monthly activity to show in cards
                const monthJobs = filteredJobs.filter(j => j.localYear === selectedDate.getFullYear() && j.localMonth === idx);
                const monthOk = monthJobs.reduce((s,j)=>s+j.okParts, 0);
                const monthTotal = monthJobs.reduce((s,j)=>s+j.okParts+j.castingRejection+j.machineRejection+j.rework, 0);
                
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      const newDate = new Date(selectedDate.getFullYear(), idx, 1);
                      setSelectedDate(newDate);
                    }}
                    className={`card-industrial p-3 text-left transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border'
                    }`}
                  >
                    <span className="text-xs font-bold font-mono-display block text-muted-foreground uppercase">{getMonthName(idx).substring(0, 3)}</span>
                    <strong className="text-lg font-mono-display block mt-1">{selectedDate.getFullYear()}</strong>
                    <div className="mt-3 flex items-center justify-between text-[9px] font-bold text-muted-foreground">
                      <span>Log Roster:</span>
                      <span className={monthJobs.length > 0 ? 'text-primary' : ''}>{monthJobs.length} batches</span>
                    </div>
                    {monthJobs.length > 0 && (
                      <div className="h-1 bg-secondary rounded-full overflow-hidden mt-1">
                        <div 
                          className="h-full bg-status-running" 
                          style={{ width: `${(monthOk/monthTotal)*100}%` }}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

        </section>

        {/* Right Section: Detailed Operational Telemetry Ledger */}
        <section className="flex-1 p-6 flex flex-col gap-6 overflow-hidden min-w-0 bg-background">
          
          {/* Active ledger title & date string display */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 border-b border-border/50 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Active Telemetry Scope</span>
              <h2 className="text-xl font-bold font-mono-display flex items-center gap-2 mt-0.5">
                <Activity size={18} className="text-primary animate-pulse" />
                {viewMode === 'day' && `Daily Activity Ledger: ${selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
                {viewMode === 'week' && `Weekly Activity Ledger: Week of ${getWeekRange(selectedDate).start.toLocaleDateString()} - ${getWeekRange(selectedDate).end.toLocaleDateString()}`}
                {viewMode === 'month' && `Monthly Activity Ledger: ${getMonthName(selectedDate.getMonth())} ${selectedDate.getFullYear()}`}
                {viewMode === 'year' && `Yearly Activity Ledger: Full Year ${selectedDate.getFullYear()}`}
              </h2>
            </div>
            
            <div className="text-xs bg-secondary/45 border border-border px-3 py-1.5 rounded-lg flex items-center gap-3">
              <span className="text-muted-foreground font-medium">Batch Record Count:</span>
              <strong className="text-primary font-bold font-mono-display text-sm">{activePeriodJobs.length}</strong>
            </div>
          </div>

          {/* Scope KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
            {/* Net processed */}
            <div className="card-industrial p-4 flex flex-col justify-between h-24 bg-card/45 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Log Processing Net</span>
                <Activity size={16} className="text-muted-foreground/60" />
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-bold font-mono-display">{metrics.totalProcessed}</span>
                <span className="text-[10px] text-muted-foreground">parts</span>
              </div>
            </div>

            {/* Approved Yield (OK) */}
            <div className="card-industrial p-4 flex flex-col justify-between h-24 bg-card/45 relative overflow-hidden group border-emerald-500/10 hover:border-emerald-500/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Verified Net Yield</span>
                <CheckCircle size={16} className="text-emerald-500/70" />
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-bold font-mono-display text-emerald-500">{metrics.ok}</span>
                <span className="text-[10px] text-muted-foreground">parts</span>
              </div>
            </div>

            {/* Defects Toll */}
            <div className="card-industrial p-4 flex flex-col justify-between h-24 bg-card/45 relative overflow-hidden group border-rose-500/10 hover:border-rose-500/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500">Defects & Scrap</span>
                <AlertTriangle size={16} className="text-rose-500/70" />
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-bold font-mono-display text-rose-500">{(metrics.defects + metrics.rework)}</span>
                <span className="text-[10px] text-muted-foreground">({metrics.defects} Def / {metrics.rework} Rew)</span>
              </div>
            </div>

            {/* Quality yield OEE */}
            <div className="card-industrial p-4 flex flex-col justify-between h-24 bg-card/45 relative overflow-hidden group border-primary/10 hover:border-primary/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Yield Approved Rate</span>
                <TrendingUp size={16} className="text-primary/70" />
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-bold font-mono-display text-primary">{metrics.oee}%</span>
                <span className="text-[10px] text-muted-foreground">Avg Efficiency</span>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 card-industrial p-0 flex flex-col min-h-0 border-border overflow-hidden bg-card/30">
            <div className="flex items-center justify-between p-4 px-6 border-b border-border bg-secondary/15 shrink-0">
              <h3 className="text-xs font-bold m-0 uppercase font-mono-display tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock size={12} /> Operational Batch Registry
              </h3>
              <span className="text-[10px] text-muted-foreground font-mono-display uppercase tracking-widest">
                Showing {activePeriodJobs.length} records
              </span>
            </div>

            {/* Table Scroll Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/80 text-muted-foreground sticky top-0 bg-card z-10">
                    <th className="py-3 px-6 font-bold uppercase tracking-wider">Timestamp</th>
                    <th className="py-3 px-4 font-bold uppercase tracking-wider">Operator</th>
                    <th className="py-3 px-4 font-bold uppercase tracking-wider">Machine Node</th>
                    <th className="py-3 px-4 font-bold uppercase tracking-wider">Component Name</th>
                    <th className="py-3 px-4 font-bold uppercase tracking-wider">Client/Company</th>
                    <th className="py-3 px-4 font-bold uppercase tracking-wider text-right">Yield (OK/Def/Rew)</th>
                    <th className="py-3 px-6 font-bold uppercase tracking-wider text-right">OEE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono-display">
                  <AnimatePresence initial={false}>
                    {activePeriodJobs.map((job) => {
                      const op = users.find(u => u.id === job.operatorId);
                      const mach = machines.find(m => m.id === job.machineId);
                      const timeStr = new Date(job.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                      const dateStr = new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      
                      const total = job.okParts + job.castingRejection + job.machineRejection + job.rework;
                      const rate = total > 0 ? ((job.okParts / total) * 100) : 0;

                      return (
                        <motion.tr 
                          key={job.id} 
                          layout
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="hover:bg-secondary/15 transition-all text-muted-foreground hover:text-foreground border-b border-border/20"
                        >
                          {/* Timestamp */}
                          <td className="py-3.5 px-6 font-medium text-foreground">
                            <span className="block">{dateStr}</span>
                            <span className="text-[10px] text-muted-foreground">{timeStr}</span>
                          </td>
                          {/* Operator */}
                          <td className="py-3.5 px-4 font-medium text-primary">
                            <div className="flex items-center gap-1.5 font-body">
                              <Users size={12} className="text-primary/70 shrink-0" />
                              <span className="truncate max-w-[120px]" title={op?.name}>{op?.name || 'Unknown'}</span>
                            </div>
                          </td>
                          {/* Machine */}
                          <td className="py-3.5 px-4 font-medium">
                            <div className="flex items-center gap-1.5 font-body">
                              <Monitor size={12} className="text-muted-foreground/75 shrink-0" />
                              <span className="truncate max-w-[110px]" title={mach?.name}>{mach?.name || 'Unknown'}</span>
                            </div>
                          </td>
                          {/* Component */}
                          <td className="py-3.5 px-4 font-semibold text-foreground truncate max-w-[140px]" title={job.componentName}>
                            {job.componentName}
                          </td>
                          {/* Company */}
                          <td className="py-3.5 px-4 truncate max-w-[120px]" title={job.companyName}>
                            {job.companyName}
                          </td>
                          {/* Yield (OK/Def/Rew) */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-emerald-500 font-bold" title="OK Net Yield">{job.okParts}</span>
                              <span className="text-muted-foreground">/</span>
                              <span className="text-rose-500 font-semibold" title="Defects (Casting & Machining)">{job.castingRejection + job.machineRejection}</span>
                              <span className="text-muted-foreground">/</span>
                              <span className="text-amber-500" title="Scrap Rework">{job.rework}</span>
                            </div>
                            <span className="text-[9px] text-muted-foreground/60 block">Quota: {job.quantity}</span>
                          </td>
                          {/* OEE */}
                          <td className="py-3.5 px-6 text-right font-bold text-foreground">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className={rate >= 90 ? 'text-emerald-500' : rate >= 70 ? 'text-amber-500' : 'text-rose-500'}>
                                {rate.toFixed(1)}%
                              </span>
                              <div className="w-12 h-1 bg-secondary rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${rate >= 90 ? 'bg-emerald-500' : rate >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                  style={{ width: `${rate}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>

                  {activePeriodJobs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-muted-foreground font-body text-sm">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <CalendarIcon size={32} className="text-muted-foreground/40 animate-pulse" />
                          <div>
                            <p className="font-bold text-muted-foreground/90 uppercase tracking-widest text-xs">No Operational Roster Logs</p>
                            <p className="text-xs text-muted-foreground/50 mt-1 max-w-sm">No batches were logged matching the active date filters or keywords.</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </section>

      </main>

    </div>
  );
}
