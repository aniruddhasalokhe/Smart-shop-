'use client';

import { useState, useEffect, useCallback } from 'react';
import { Play, Square, AlertTriangle, Settings, LogOut, CheckCircle, Upload, Activity, Monitor, Clock } from 'lucide-react';
import { getMachines, updateMachineStatus, resolveDowntime, logJob, logout, getCurrentUser, changeMyPassword } from '@/actions';
import { StatusBadge } from '@/components/StatusBadge';
import { motion } from 'framer-motion';
import TurbotechLogo from '@/components/TurbotechLogo';

export default function EmployeePortal() {
  const [machines, setMachines] = useState<any[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  
  const [plan, setPlan] = useState({ companyName: '', componentName: '', quantity: 0 });
  const [downtimeReason, setDowntimeReason] = useState('BREAKDOWN');
  const [jobData, setJobData] = useState({ okParts: 0, castingRejection: 0, machineRejection: 0, blowHole: 0, rework: 0 });

  const [userSession, setUserSession] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock — ticks every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine current shift from time
  const getShiftInfo = useCallback((date: Date) => {
    const hour = date.getHours();
    if (hour >= 8 && hour < 16) return { number: 1, label: 'Shift I', window: '08:00 AM – 04:00 PM', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20' };
    if (hour >= 16 && hour < 24) return { number: 2, label: 'Shift II', window: '04:00 PM – 12:00 AM', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', glow: 'shadow-amber-500/20' };
    return { number: 3, label: 'Shift III', window: '12:00 AM – 08:00 AM', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', glow: 'shadow-blue-500/20' };
  }, []);

  const shiftInfo = getShiftInfo(currentTime);
  const timeString = currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  const loadData = async () => {
    const data = await getMachines();
    const session = await getCurrentUser();
    setMachines(data);
    setUserSession(session);
    
    if (session) {
      const activeMachine = data.find((m: any) => m.currentOperatorId === session.id && m.status !== 'OFF');
      if (activeMachine && !selectedMachineId) {
        setSelectedMachineId(activeMachine.id);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
         <div className="flex flex-col items-center gap-4 text-primary animate-pulse">
           <Activity size={32} />
           <div className="font-bold font-mono-display tracking-widest text-sm">INITIALIZING TERMINAL LINK...</div>
         </div>
      </div>
    );
  }

  const selectedMachine = machines.find(m => m.id === selectedMachineId);
  const isOperatorAssigned = selectedMachine?.status !== 'OFF' && selectedMachineId;
  const availableMachines = machines.filter(m => m.status === 'OFF' || m.currentOperatorId === userSession?.id);

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

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="flex justify-center min-h-screen bg-background text-foreground font-body">
      
      <div className="w-full max-w-7xl flex flex-col min-h-screen md:h-screen">
        {/* Header */}
        <header className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border bg-card shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <TurbotechLogo variant="full" size="sm" />
            <div className="h-5 w-[1px] bg-border mx-1 hidden sm:block"></div>
            <p className="text-[10px] font-semibold text-primary uppercase tracking-widest hidden sm:block pt-1" style={{ color: 'hsl(var(--primary))' }}>Operator Terminal</p>
          </div>
          <div className="flex items-center gap-2 md:gap-4 text-sm">
            {/* Shift Badge in Header */}
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md ${shiftInfo.bg} ${shiftInfo.border} border`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${shiftInfo.color.replace('text-', 'bg-')}`}></span>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${shiftInfo.color}`}>{shiftInfo.label}</span>
              <span className="text-[9px] text-muted-foreground font-mono-display">{timeString}</span>
            </div>
            <div className="font-medium text-muted-foreground hidden md:block text-xs">
              <span className="font-bold text-foreground">{userSession?.name}</span>
            </div>
            
            <button onClick={handlePasswordChange} className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/50 text-secondary-foreground hover:bg-secondary transition-colors text-[10px] font-bold uppercase tracking-wider">
              <Settings size={12} /> Passkey
            </button>

            <form action={logout}>
              <button type="submit" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-destructive-foreground transition-colors text-[10px] font-bold uppercase tracking-wider">
                <LogOut size={12} /> Exit
              </button>
            </form>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 p-4 md:p-6 min-h-0 overflow-y-auto md:overflow-hidden">
          
          {/* Left Panel: Hardware Link */}
          <motion.div variants={container} initial="hidden" animate="show" className="w-full md:w-[340px] flex flex-col gap-4 md:gap-6 shrink-0 md:overflow-y-auto md:pr-2 custom-scrollbar">
            
            {/* Shift Info Card */}
            <motion.div variants={item} className={`card-industrial ${shiftInfo.border} border overflow-hidden relative`}>
              <div className={`absolute inset-0 ${shiftInfo.bg} opacity-30`}></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold font-mono-display uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Clock size={14} className={shiftInfo.color} /> Active Shift
                  </h3>
                  <span className={`w-2 h-2 rounded-full animate-pulse ${shiftInfo.color.replace('text-', 'bg-')}`}></span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-2xl font-bold font-mono-display ${shiftInfo.color}`}>{shiftInfo.label}</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono-display">{shiftInfo.window}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold font-mono-display text-foreground">{timeString}</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={item} className="card-industrial">
              <h3 className="text-sm font-semibold font-mono-display mb-4 uppercase tracking-widest text-muted-foreground">Hardware Interface</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Select Target Line</label>
                  <select 
                    value={selectedMachineId} 
                    onChange={e => setSelectedMachineId(e.target.value)}
                    className="w-full p-2.5 rounded-md bg-background border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none"
                  >
                    <option value="">-- Disconnected --</option>
                    {availableMachines.map(m => (
                      <option key={m.id} value={m.id}>{m.name} {m.currentOperatorId === userSession?.id ? '(Paired)' : ''}</option>
                    ))}
                  </select>
                </div>

                {!isOperatorAssigned && selectedMachineId && (
                  <button 
                    onClick={async () => {
                      await updateMachineStatus(selectedMachineId, 'ON');
                      loadData();
                    }} 
                    className="w-full flex items-center justify-center gap-2 p-3 mt-4 rounded-md bg-primary text-primary-foreground font-bold uppercase tracking-wider text-sm hover:brightness-110 transition-all glow-primary"
                  >
                    <Play size={16} fill="currentColor" /> INITIATE LINK
                  </button>
                )}

                {isOperatorAssigned && selectedMachine && (
                  <div className="p-4 mt-2 rounded-md bg-secondary/30 border border-border">
                    <div className="flex items-center justify-between mb-4">
                       <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Status Link</span>
                       <StatusBadge status={selectedMachine.status === 'ON' ? 'running' : 'breakdown'} type="machine" />
                    </div>

                    <div className="flex gap-2 mb-4">
                      {selectedMachine.status === 'ON' ? (
                        <button className="flex-1 flex items-center justify-center gap-2 p-2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-bold uppercase hover:bg-amber-500/20 transition-colors"
                          onClick={async () => {
                            await updateMachineStatus(selectedMachineId, 'DOWNTIME', downtimeReason);
                            loadData();
                          }}>
                          <AlertTriangle size={14} /> PAUSE
                        </button>
                      ) : (
                        <button className="flex-1 flex items-center justify-center gap-2 p-2 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold uppercase hover:bg-emerald-500/20 transition-colors"
                          onClick={async () => {
                            await resolveDowntime(selectedMachineId);
                            loadData();
                          }}>
                          <CheckCircle size={14} /> RESUME
                        </button>
                      )}
                      <button className="flex-1 flex items-center justify-center gap-2 p-2 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs font-bold uppercase hover:bg-rose-500/20 transition-colors"
                        onClick={async () => {
                          await updateMachineStatus(selectedMachineId, 'OFF');
                          setSelectedMachineId('');
                          loadData();
                        }}>
                        <Square size={14} /> SEVER
                      </button>
                    </div>

                    {selectedMachine.status === 'ON' && (
                      <div className="pt-4 border-t border-border mt-2 space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Pause Reason Flag</label>
                        <select 
                          value={downtimeReason} 
                          onChange={e => setDowntimeReason(e.target.value)} 
                          className="w-full p-2.5 rounded-md bg-background border border-border text-xs focus:outline-none focus:border-primary"
                        >
                          <option value="BREAKDOWN">Machine Breakdown</option>
                          <option value="POWER_CUT">Power Cut Isolation</option>
                          <option value="SETUP">Tool Swap Calibration</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            {isOperatorAssigned && selectedMachine?.status === 'ON' && (
              <motion.div variants={item} className="card-industrial">
                 <h3 className="text-sm font-semibold font-mono-display mb-4 uppercase tracking-widest text-muted-foreground">Production Schematic</h3>
                 <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Client Origin</label>
                      <input placeholder="Ex: Acme Corp Industries" required value={plan.companyName} onChange={e => setPlan({...plan, companyName: e.target.value})} className="w-full p-2.5 rounded-md bg-background border border-border text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground/50" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Component Name</label>
                      <input placeholder="Ex: Gear Shaft B1" required value={plan.componentName} onChange={e => setPlan({...plan, componentName: e.target.value})} className="w-full p-2.5 rounded-md bg-background border border-border text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground/50" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quota Volume</label>
                      <input type="number" placeholder="0" required min="1" value={plan.quantity || ''} onChange={e => setPlan({...plan, quantity: parseInt(e.target.value)})} className="w-full p-2.5 rounded-md bg-background border border-border text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground/50" />
                    </div>
                 </div>
              </motion.div>
            )}

          </motion.div>

          {/* Right Panel: Telemetry Form */}
          <div className="flex-1 flex flex-col min-w-0">
            {(!isOperatorAssigned || selectedMachine?.status !== 'ON') ? (
              <div className="flex-1 card-industrial flex flex-col items-center justify-center text-center p-6 md:p-8 bg-card/50 min-h-[200px]">
                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-secondary/30 border border-border flex items-center justify-center mb-4 md:mb-6">
                  <Monitor size={28} className="text-muted-foreground opacity-50 md:hidden" />
                  <Monitor size={40} className="text-muted-foreground opacity-50 hidden md:block" />
                </div>
                <h3 className="text-base md:text-xl font-bold font-mono-display text-muted-foreground mb-2 uppercase tracking-widest">Awaiting Link</h3>
                <p className="text-xs md:text-sm text-muted-foreground max-w-sm">
                  Select a machine above and tap INITIATE LINK to begin.
                </p>
              </div>
            ) : (
              <motion.div variants={container} initial="hidden" animate="show" className="flex-1 card-industrial flex flex-col overflow-hidden p-0 border-border">
                  
                  {/* Internal Form Header */}
                  <div className="flex items-center justify-between p-4 px-6 border-b border-border bg-secondary/20">
                     <h3 className="text-sm font-bold m-0 uppercase flex items-center gap-2 font-mono-display text-primary">
                       <span className="w-2 h-2 rounded-full bg-primary animate-pulse blur-[1px]"></span>
                       Telemetry Batch Form
                     </h3>
                     <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                       Target Node: <span className="text-foreground">{selectedMachine?.name}</span>
                     </span>
                  </div>

                  {/* Scrollable Form Body */}
                  <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        
                        {/* Giant OK Yield Field */}
                        <div className="col-span-1 sm:col-span-3 rounded-xl flex flex-col items-center p-4 md:p-8 bg-emerald-500/5 border border-emerald-500/20 transition-all hover:border-emerald-500/40">
                          <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 md:mb-4 flex items-center gap-2 text-emerald-500">
                            <CheckCircle size={16} /> Verified Net Yield (OK)
                          </label>
                          <input 
                            type="number" 
                            min="0" 
                            value={jobData.okParts || ''} 
                            onChange={e=>setJobData({...jobData, okParts: parseInt(e.target.value) || 0})} 
                            className="bg-transparent border-none outline-none text-center text-emerald-500 font-mono-display font-bold w-full p-2 placeholder:text-emerald-500/30 text-5xl md:text-7xl"
                            style={{ MozAppearance: 'textfield' }}
                            placeholder="0" 
                          />
                        </div>

                        {/* Defect Quadrants */}
                        <div className="rounded-xl flex flex-col items-center p-3 md:p-4 bg-rose-500/5 border border-rose-500/20 transition-all hover:border-rose-500/40">
                          <label className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest mb-2 text-rose-500 text-center">Cast Fracture</label>
                          <input type="number" min="0" value={jobData.castingRejection || ''} onChange={e=>setJobData({...jobData, castingRejection: parseInt(e.target.value) || 0})} className="bg-transparent border-none outline-none text-center text-rose-500 font-mono-display font-bold text-3xl md:text-4xl w-full placeholder:text-rose-500/30" placeholder="0" />
                        </div>
                        
                        <div className="rounded-xl flex flex-col items-center p-3 md:p-4 bg-rose-500/5 border border-rose-500/20 transition-all hover:border-rose-500/40">
                          <label className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest mb-2 text-rose-500 text-center">Machining Err</label>
                          <input type="number" min="0" value={jobData.machineRejection || ''} onChange={e=>setJobData({...jobData, machineRejection: parseInt(e.target.value) || 0})} className="bg-transparent border-none outline-none text-center text-rose-500 font-mono-display font-bold text-3xl md:text-4xl w-full placeholder:text-rose-500/30" placeholder="0" />
                        </div>
                        
                        <div className="rounded-xl flex flex-col items-center p-3 md:p-4 bg-amber-500/5 border border-amber-500/20 transition-all hover:border-amber-500/40">
                          <label className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest mb-2 text-amber-500 text-center">Scrap/Rework</label>
                          <input type="number" min="0" value={jobData.rework || ''} onChange={e=>setJobData({...jobData, rework: parseInt(e.target.value) || 0})} className="bg-transparent border-none outline-none text-center text-amber-500 font-mono-display font-bold text-3xl md:text-4xl w-full placeholder:text-amber-500/30" placeholder="0" />
                        </div>

                      </div>
                  </div>

                  {/* Internal Form Footer */}
                  <div className="flex justify-end p-4 px-6 border-t border-border bg-secondary/10">
                    <button 
                      disabled={isSubmitting}
                      onClick={async () => {
                        const fallbackPlan = {
                          companyName: plan.companyName || 'Valmet India',
                          componentName: plan.componentName || 'QTF 90 Body 1st',
                          quantity: plan.quantity || 50
                        };
                        setIsSubmitting(true);
                        await logJob(selectedMachineId, { ...fallbackPlan, ...jobData });
                        setJobData({ okParts: 0, castingRejection: 0, machineRejection: 0, blowHole: 0, rework: 0 });
                        setIsSubmitting(false);
                        loadData();
                      }}
                      className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-md bg-primary text-primary-foreground font-bold uppercase tracking-wider text-sm hover:brightness-110 disabled:opacity-50 transition-all glow-primary"
                    >
                      <Upload size={16} /> {isSubmitting ? 'UPLOADING...' : 'BROADCAST BATCH'}
                    </button>
                  </div>

              </motion.div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
