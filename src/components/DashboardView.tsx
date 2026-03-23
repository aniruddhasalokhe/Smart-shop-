'use client';

import { useState, useRef } from 'react';
import { 
  Monitor, Zap, Package, Clock, TrendingUp, Users, Activity, 
  BarChart2, AlertTriangle, LogOut, CheckCircle, Plus, Upload, Download, Settings
} from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { logout, createEmployee, importMachines, resetEmployeePassword, changeMyPassword } from "@/actions";
import { motion } from "framer-motion";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  BarChart, Bar, Cell, PieChart, Pie
} from "recharts";

export default function DashboardView({ machines, jobs, users, attendances }: { machines: any[], jobs: any[], users: any[], attendances: any[] }) {
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [showAttModal, setShowAttModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [empForm, setEmpForm] = useState({ username: '', name: '', passwordRaw: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const csv = 'Name\nCNC Lathe 01\nMilling Station A\nHydraulic Press C\nAssembly Line Beta\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_nodes_template.csv';
    a.click();
  };


  const handleExportCSV = () => {
    let csv = 'Type,Name,Status,TotalCycles,ToolLife,OK,Defects,Operator\n';
    machines.forEach(m => {
      const mJobs = jobs.filter(j => j.machineId === m.id);
      const ok = mJobs.reduce((s, j) => s + j.okParts, 0);
      const rej = mJobs.reduce((s, j) => s + j.castingRejection + j.machineRejection + j.blowHole + j.rework, 0);
      const op = users.find(u => u.id === m.currentOperatorId)?.name || 'None';
      csv += `Node,${m.name},${m.status},${m.totalCycles},${m.toolLifePercent}%,${ok},${rej},${op}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fleet_analytics_${new Date().getTime()}.csv`;
    a.click();
  };

  const handleFileUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await importMachines(text);
    window.location.reload();
  };

  const handleAddEmployee = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createEmployee(empForm);
      setShowEmpModal(false);
      setEmpForm({ username: '', name: '', passwordRaw: '' });
      window.location.reload();
    } catch (err) {
      alert('Error creating employee. Username might exist.');
    }
    setIsSubmitting(false);
  };

  const handleResetPassword = async (userId: string, name: string) => {
    const newPass = window.prompt(`Override passkey for operator: ${name}\n\nEnter new temporary passkey:`);
    if (!newPass) return;
    if (newPass.length < 4) return alert('Passkey must be at least 4 characters long.');
    
    try {
      await resetEmployeePassword(userId, newPass);
      alert(`Passkey for ${name} has been successfully updated!`);
    } catch (err) {
      alert('Failed to reset passkey. Ensure you have owner permissions.');
    }
  };

  const handlePasswordChange = async () => {
    const newPass = window.prompt("ACCOUNT SECURITY\nEnter your new passkey (minimum 4 characters):");
    if (!newPass) return;
    if (newPass.length < 4) return alert("Passkey must be at least 4 characters long.");
    try {
      await changeMyPassword(newPass);
      alert("Your passkey has been successfully updated!");
    } catch (err) {
      alert("Failed to update passkey. Please ensure your session is active.");
    }
  };

  const totalOk = jobs.reduce((acc, j) => acc + j.okParts, 0);
  const totalRej = jobs.reduce((acc, j) => acc + j.castingRejection + j.machineRejection + j.blowHole, 0);
  const totalRework = jobs.reduce((a, j)=> a + j.rework, 0);
  const totalJobs = totalOk + totalRej + totalRework;
  const efficiency = totalJobs > 0 ? ((totalOk / totalJobs) * 100).toFixed(1) : '0.0';

  const running = machines.filter(m => m.status === 'ON').length;
  const idle = machines.filter(m => m.status === 'OFF').length;
  const down = machines.filter(m => m.status === 'DOWNTIME').length;

  const barData = machines.map(m => {
    const mJobs = jobs.filter(j => j.machineId === m.id);
    return {
      name: m.name.substring(0, 10),
      ok: mJobs.reduce((s, j) => s + j.okParts, 0),
      rejections: mJobs.reduce((s, j) => s + j.castingRejection + j.machineRejection + j.blowHole + j.rework, 0)
    };
  });

  const pieDataRaw = [
    { name: 'Casting Rej', value: jobs.reduce((s, j) => s + j.castingRejection, 0), color: '#ef4444' },
    { name: 'Machining Rej', value: jobs.reduce((s, j) => s + j.machineRejection, 0), color: '#f97316' },
    { name: 'Blow Hole', value: jobs.reduce((s, j) => s + j.blowHole, 0), color: '#f59e0b' },
    { name: 'Rework/Scrap', value: totalRework, color: '#3b82f6' },
  ].filter(d => d.value > 0);
  
  const pieData = pieDataRaw.length > 0 ? pieDataRaw : [{ name: 'No defects', value: 1, color: '#10b981' }];

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shadow-sm z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20 text-primary">
            <Activity size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold font-mono-display tracking-tight text-card-foreground">Smart Shop-Floor</h1>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest">Command Center</p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <span className="text-muted-foreground hidden md:inline-block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          
          <button onClick={handlePasswordChange} className="flex items-center gap-2 px-4 py-2 rounded-md bg-secondary/50 text-secondary-foreground hover:bg-secondary transition-colors text-xs font-bold uppercase tracking-wider">
            <Settings size={14} /> Change Passkey
          </button>

          <form action={logout}>
            <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-md bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-destructive-foreground transition-colors text-xs font-bold uppercase tracking-wider">
              <LogOut size={14} /> System Exit
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-7xl mx-auto">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
               <h2 className="text-2xl font-bold mb-1">Industrial Dashboard</h2>
               <p className="text-sm text-muted-foreground">Live Telemetry & Fleet Operations Overview</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setShowAttModal(true)} className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-wider rounded-md hover:bg-secondary/80 outline-none">
                <Clock size={14} /> Log
              </button>
              <button onClick={() => setShowUsersModal(true)} className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-wider rounded-md hover:bg-secondary/80 outline-none">
                <Settings size={14} /> Directory
              </button>
              <button onClick={() => setShowEmpModal(true)} className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-wider rounded-md hover:bg-secondary/80 outline-none">
                <Plus size={14} /> Add User
              </button>
              <button onClick={() => setShowNodeModal(true)} className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-wider rounded-md hover:bg-secondary/80 outline-none">
                <Upload size={14} /> Import Nodes
              </button>
              <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-md hover:brightness-110 outline-none glow-primary">
                <Download size={14} /> Export Metrics
              </button>
            </div>
          </div>

          {/* KPI Row 1: Hardware State */}
          <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Total Nodes" value={machines.length} icon={Monitor} accentColor="primary" />
            <KpiCard title="Active Streams" value={running} icon={Zap} accentColor="running" trend="up" trendValue={`${((running/machines.length)*100).toFixed(0)}% Utilized`} />
            <KpiCard title="Standby Offline" value={idle} icon={Clock} accentColor="idle" />
            <KpiCard title="Maintenance Halt" value={down} icon={AlertTriangle} accentColor="down" />
          </motion.div>

          {/* KPI Row 2: Production Metrics */}
          <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Total Batches" value={jobs.length} subtitle="logged today" icon={Package} />
            <KpiCard title="Verified Yield" value={totalOk} icon={CheckCircle} accentColor="running" trend="up" trendValue="Quality Approved" />
            <KpiCard title="Defect Toll" value={totalRej} icon={Activity} accentColor="down" />
            <KpiCard title="OEE Score" value={`${efficiency}%`} icon={TrendingUp} trend={parseFloat(efficiency) > 85 ? 'up' : 'down'} trendValue="Rolling Avg" />
          </motion.div>

          {/* Middle Analytics Grid */}
          <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Left: Bar Chart */}
            <div className="xl:col-span-2 card-industrial flex flex-col min-h-[350px]">
              <div className="flex items-center gap-2 mb-6">
                <BarChart2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold font-mono-display">Yield Matrix by Node</h3>
              </div>
              <div className="flex-1 w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--card-foreground))' }}
                      itemStyle={{ color: 'hsl(var(--card-foreground))' }}
                    />
                    <Bar dataKey="ok" name="Approved Parts" fill="hsl(var(--status-running))" radius={[4, 4, 0, 0]} barSize={32} />
                    <Bar dataKey="rejections" name="Defects" fill="hsl(var(--status-down))" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right: Pie Chart + Stream */}
            <div className="flex flex-col gap-6">
              <div className="card-industrial flex flex-col h-full min-h-[220px]">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-warning" />
                  <h3 className="text-sm font-semibold font-mono-display">Defect Stratification</h3>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                  {pieDataRaw.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                      <span className="text-muted-foreground">{d.name}</span>
                      <strong className="text-foreground">{d.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Bottom Machine Grid */}
          <motion.div variants={item} className="card-industrial">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold font-mono-display">Live Fleet Status Board</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 font-medium px-4">Node Designation</th>
                    <th className="pb-3 font-medium">Assigned Sub-Routine</th>
                    <th className="pb-3 font-medium">Operator ID</th>
                    <th className="pb-3 font-medium">Tool Stress</th>
                    <th className="pb-3 font-medium">Cycle Counter</th>
                    <th className="pb-3 font-medium text-right px-4">Status Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {machines.map(m => {
                    const op = users.find(u => u.id === m.currentOperatorId);
                    let displayStatus = 'idle';
                    if (m.status === 'ON') displayStatus = 'running';
                    if (m.status === 'DOWNTIME') displayStatus = 'breakdown';

                    return (
                      <tr key={m.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="py-4 font-mono-display font-medium px-4 flex items-center gap-2">
                          <Monitor size={14} className="text-muted-foreground" />
                          {m.name}
                        </td>
                        <td className="py-4">{/* mock job */}{m.status === 'ON' ? 'Active Schematic' : '—'}</td>
                        <td className="py-4 font-medium text-primary">
                          {op ? <div className="flex items-center gap-2"><Users size={12}/>{op.name}</div> : <span className="text-muted-foreground">UNASSIGNED</span>}
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2 w-32">
                            <span className={`text-xs ${m.toolLifePercent < 20 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>{m.toolLifePercent}%</span>
                            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${m.toolLifePercent < 20 ? 'bg-destructive' : 'bg-primary'}`} 
                                style={{ width: `${m.toolLifePercent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 font-mono-display text-muted-foreground">{m.totalCycles}</td>
                        <td className="py-4 text-right px-4">
                          <div className="inline-block">
                            <StatusBadge status={displayStatus as any} type="machine" size="sm" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>

        </motion.div>
      </main>

      {/* Employee Modal */}
      {showEmpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-sm card-industrial border-primary/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold font-mono-display uppercase tracking-widest text-foreground">Register Operator</h3>
            </div>
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Full Name</label>
                <input required value={empForm.name} onChange={e=>setEmpForm({...empForm, name: e.target.value})} className="w-full p-2.5 rounded-md bg-background border border-border text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Username (Alias)</label>
                <input required value={empForm.username} onChange={e=>setEmpForm({...empForm, username: e.target.value})} className="w-full p-2.5 rounded-md bg-background border border-border text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Temporary Passkey</label>
                <input required type="password" value={empForm.passwordRaw} onChange={e=>setEmpForm({...empForm, passwordRaw: e.target.value})} className="w-full p-2.5 rounded-md bg-background border border-border text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="flex gap-3 pt-4 border-t border-border mt-6">
                <button type="button" onClick={() => setShowEmpModal(false)} className="flex-1 px-4 py-2 rounded bg-secondary text-xs font-bold uppercase tracking-wider">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 rounded bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider disabled:opacity-50">Create Link</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Nodes Modal */}
      {showNodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-sm card-industrial border-primary/20">
            <div className="mb-6">
              <h3 className="text-lg font-bold font-mono-display uppercase tracking-widest text-foreground flex items-center gap-2">
                <Monitor size={18} /> Provision Hardware
              </h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Connect multiple nodes by uploading a CSV payload. Ensure your file format strictly matches the template constraints before uploading.
              </p>
            </div>
            
            <input type="file" accept=".csv" ref={fileRef} className="hidden" onChange={handleFileUpload} />
            
            <div className="flex flex-col gap-3">
              <button onClick={handleDownloadTemplate} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-wider hover:bg-secondary/80 outline-none">
                <Download size={14} /> Download Template Payload
              </button>
              <button onClick={() => fileRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:brightness-110 outline-none glow-primary">
                <Upload size={14} /> Upload Node Roster (.csv)
              </button>
            </div>

            <div className="pt-4 border-t border-border mt-6">
              <button type="button" onClick={() => setShowNodeModal(false)} className="w-full px-4 py-2 rounded bg-background border border-border text-xs font-bold uppercase tracking-wider hover:bg-secondary/50">Cancel Routine</button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl card-industrial border-primary/20 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold font-mono-display uppercase tracking-widest text-foreground flex items-center gap-2">
                <Users size={18} /> Shift Attendance Logs
              </h3>
              <button onClick={() => setShowAttModal(false)} className="text-muted-foreground hover:text-foreground">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto mb-6 pr-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground sticky top-0 bg-card">
                    <th className="pb-3 font-medium px-4">Operator</th>
                    <th className="pb-3 font-medium">Clock In</th>
                    <th className="pb-3 font-medium">Clock Out</th>
                    <th className="pb-3 font-medium text-right px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {(attendances || []).map(att => {
                    const usr = users.find(u => u.id === att.userId);
                    return (
                      <tr key={att.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="py-3 font-medium px-4 text-primary">{usr?.name || 'Unknown'}</td>
                        <td className="py-3 text-muted-foreground">{new Date(att.loginTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="py-3 text-muted-foreground">{att.logoutTime ? new Date(att.logoutTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td className="py-3 text-right px-4">
                          {att.logoutTime ? (
                            <span className="px-2 py-1 bg-secondary text-secondary-foreground text-[10px] font-bold uppercase rounded">Completed</span>
                          ) : (
                            <span className="px-2 py-1 bg-status-running/20 text-status-running border border-status-running/30 text-[10px] font-bold uppercase rounded">Active Shift</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {(!attendances || attendances.length === 0) && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">No shift records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="pt-4 border-t border-border">
              <button type="button" onClick={() => setShowAttModal(false)} className="w-full px-4 py-2 rounded bg-background border border-border text-xs font-bold uppercase tracking-wider hover:bg-secondary/50">Close Viewer</button>
            </div>
          </div>
        </div>
      )}

      {/* Team Directory Modal */}
      {showUsersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl card-industrial border-primary/20 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold font-mono-display uppercase tracking-widest text-foreground flex items-center gap-2">
                <Settings size={18} /> Operator Directory
              </h3>
              <button onClick={() => setShowUsersModal(false)} className="text-muted-foreground hover:text-foreground">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto mb-6 pr-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground sticky top-0 bg-card">
                    <th className="pb-3 font-medium px-4">Full Name</th>
                    <th className="pb-3 font-medium">Terminal Alias</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium text-right px-4">Security Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {users.filter(u => u.role !== 'OWNER').map(usr => (
                    <tr key={usr.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-3 font-medium px-4 text-primary">{usr.name}</td>
                      <td className="py-3 text-muted-foreground font-mono-display">{usr.username}</td>
                      <td className="py-3 text-muted-foreground">{usr.role}</td>
                      <td className="py-3 text-right px-4">
                        <button 
                          onClick={() => handleResetPassword(usr.id, usr.name)}
                          className="px-3 py-1.5 bg-destructive/20 text-destructive border border-destructive/30 text-[10px] font-bold uppercase rounded hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        >
                          Override Passkey
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.filter(u => u.role !== 'OWNER').length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">No personnel registered yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="pt-4 border-t border-border">
              <button type="button" onClick={() => setShowUsersModal(false)} className="w-full px-4 py-2 rounded bg-background border border-border text-xs font-bold uppercase tracking-wider hover:bg-secondary/50">Close Directory</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
