'use client';

import { useState, useEffect } from 'react';
import { Play, Square, AlertTriangle, Settings, LogOut, CheckCircle, Upload, Activity, Monitor } from 'lucide-react';
import { getMachines, updateMachineStatus, resolveDowntime, logJob, logout, getCurrentUser, changeMyPassword } from '@/actions';
import { StatusBadge } from '@/components/StatusBadge';
import { motion } from 'framer-motion';

export default function EmployeePortal() {
  const [machines, setMachines] = useState<any[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  
  const [plan, setPlan] = useState({ companyName: '', componentName: '', quantity: 0 });
  const [downtimeReason, setDowntimeReason] = useState('BREAKDOWN');
  const [jobData, setJobData] = useState({ okParts: 0, castingRejection: 0, machineRejection: 0, blowHole: 0, rework: 0 });

  const [userSession, setUserSession] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
      
      <div className="w-full max-w-7xl flex flex-col h-screen">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20 text-primary">
              <Settings size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono-display tracking-tight text-card-foreground">Smart Shop-Floor</h1>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest">Operator Terminal</p>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-6 text-sm">
            <div className="font-medium text-muted-foreground mr-1 md:mr-4 hidden sm:block">
              Session Active: <span className="font-bold text-foreground ml-1">{userSession?.name}</span>
            </div>
            
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

        {/* Main Content Area */}
        <main className="flex-1 flex gap-6 p-6 min-h-0 overflow-hidden">
          
          {/* Left Panel: Hardware Link */}
          <motion.div variants={container} initial="hidden" animate="show" className="w-[340px] flex flex-col gap-6 shrink-0 overflow-y-auto pr-2 custom-scrollbar">
            
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
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Spec Signature</label>
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
              <div className="flex-1 card-industrial flex flex-col items-center justify-center text-center p-8 bg-card/50">
                <div className="w-24 h-24 rounded-full bg-secondary/30 border border-border flex items-center justify-center mb-6">
                  <Monitor size={40} className="text-muted-foreground opacity-50" />
                </div>
                <h3 className="text-xl font-bold font-mono-display text-muted-foreground mb-2 uppercase tracking-widest">Awaiting Link</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Initialize a secure hardware link from the terminal controls in the left panel to begin operational telemetry recording.
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
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
                        
                        {/* Giant OK Yield Field */}
                        <div className="col-span-2 lg:col-span-4 rounded-xl flex flex-col items-center p-8 bg-emerald-500/5 border border-emerald-500/20 transition-all hover:border-emerald-500/40">
                          <label className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-emerald-500">
                            <CheckCircle size={18} /> Verified Net Yield (OK)
                          </label>
                          <input 
                            type="number" 
                            min="0" 
                            value={jobData.okParts || ''} 
                            onChange={e=>setJobData({...jobData, okParts: parseInt(e.target.value) || 0})} 
                            className="bg-transparent border-none outline-none text-center text-emerald-500 font-mono-display font-bold w-full p-2 placeholder:text-emerald-500/30"
                            style={{ fontSize: '5rem', height: '6rem', MozAppearance: 'textfield' }}
                            placeholder="0" 
                          />
                        </div>

                        {/* Defect Quadrants */}
                        <div className="rounded-xl flex flex-col items-center p-4 bg-rose-500/5 border border-rose-500/20 transition-all hover:border-rose-500/40">
                          <label className="text-[10px] uppercase font-bold tracking-widest mb-2 text-rose-500 text-center">Cast Fracture</label>
                          <input type="number" min="0" value={jobData.castingRejection || ''} onChange={e=>setJobData({...jobData, castingRejection: parseInt(e.target.value) || 0})} className="bg-transparent border-none outline-none text-center text-rose-500 font-mono-display font-bold text-4xl w-full placeholder:text-rose-500/30" placeholder="0" />
                        </div>
                        
                        <div className="rounded-xl flex flex-col items-center p-4 bg-rose-500/5 border border-rose-500/20 transition-all hover:border-rose-500/40">
                          <label className="text-[10px] uppercase font-bold tracking-widest mb-2 text-rose-500 text-center">Machining Err</label>
                          <input type="number" min="0" value={jobData.machineRejection || ''} onChange={e=>setJobData({...jobData, machineRejection: parseInt(e.target.value) || 0})} className="bg-transparent border-none outline-none text-center text-rose-500 font-mono-display font-bold text-4xl w-full placeholder:text-rose-500/30" placeholder="0" />
                        </div>
                        
                        <div className="rounded-xl flex flex-col items-center p-4 bg-rose-500/5 border border-rose-500/20 transition-all hover:border-rose-500/40">
                          <label className="text-[10px] uppercase font-bold tracking-widest mb-2 text-rose-500 text-center">Blow Hole</label>
                          <input type="number" min="0" value={jobData.blowHole || ''} onChange={e=>setJobData({...jobData, blowHole: parseInt(e.target.value) || 0})} className="bg-transparent border-none outline-none text-center text-rose-500 font-mono-display font-bold text-4xl w-full placeholder:text-rose-500/30" placeholder="0" />
                        </div>
                        
                        <div className="rounded-xl flex flex-col items-center p-4 bg-amber-500/5 border border-amber-500/20 transition-all hover:border-amber-500/40">
                          <label className="text-[10px] uppercase font-bold tracking-widest mb-2 text-amber-500 text-center">Scrap/Rework</label>
                          <input type="number" min="0" value={jobData.rework || ''} onChange={e=>setJobData({...jobData, rework: parseInt(e.target.value) || 0})} className="bg-transparent border-none outline-none text-center text-amber-500 font-mono-display font-bold text-4xl w-full placeholder:text-amber-500/30" placeholder="0" />
                        </div>

                      </div>
                  </div>

                  {/* Internal Form Footer */}
                  <div className="flex justify-end p-4 px-6 border-t border-border bg-secondary/10">
                    <button 
                      disabled={isSubmitting}
                      onClick={async () => {
                        const fallbackPlan = {
                          companyName: plan.companyName || 'Generic Client',
                          componentName: plan.componentName || 'Test Component',
                          quantity: plan.quantity || 100
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
