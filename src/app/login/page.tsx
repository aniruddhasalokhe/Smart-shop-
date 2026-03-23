'use client';

import { useState } from 'react';
import { Shield, User, Lock, Activity, ChevronRight, CheckCircle, Package, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const submitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { error: text }; }
      
      if (!res.ok) {
        throw new Error(data.error || 'Authentication sequence failed.');
      }
      
      router.push(data.role === 'OWNER' ? '/dashboard' : '/employee');
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground font-body relative overflow-hidden">
      
      {/* Structural ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-20" />

      <div className="w-full max-w-5xl z-10 flex flex-col md:flex-row gap-8 p-6">
        
        {/* Left Informational Panel */}
        <div className="flex-1 flex flex-col justify-center gap-6 p-8 lg:p-12 animate-in fade-in slide-in-from-left-8 duration-700">
          <div className="flex items-center gap-4 mb-4">
             <div className="p-3 rounded-xl bg-primary/20 text-primary glow-primary relative">
                <Activity size={32} />
             </div>
             <h1 className="text-4xl font-bold font-mono-display tracking-tight text-foreground">
               Smart Shop-Floor
             </h1>
          </div>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
            Advanced operational telemetry, live fleet synchronization, and real-time operator diagnostics.
          </p>
          
          <div className="space-y-4 mt-8">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-primary" size={20} />
              <span className="text-sm font-semibold text-secondary-foreground uppercase tracking-widest">Real-time Node Monitoring</span>
            </div>
            <div className="flex items-center gap-3">
              <Package className="text-primary" size={20} />
              <span className="text-sm font-semibold text-secondary-foreground uppercase tracking-widest">Automated Yield Tracking</span>
            </div>
          </div>
        </div>

        {/* Right Authentication Form */}
        <div className="flex-1 flex items-center justify-center animate-in fade-in slide-in-from-right-8 duration-700 delay-150">
          <div className="w-full max-w-md card-industrial bg-card/80 backdrop-blur-md p-8 relative overflow-hidden">
            
            {/* Top scanning animation line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>

            <div className="flex flex-col items-center mb-8">
              <Shield size={48} className="text-primary mb-4 opacity-80" />
              <h2 className="text-xl font-bold font-mono-display tracking-widest uppercase text-foreground">System Authentication</h2>
              <p className="text-xs text-muted-foreground tracking-widest uppercase mt-2">Enter credentials to establish link</p>
            </div>

            <form onSubmit={submitAuth} className="space-y-5">
              
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Operator Alias</label>
                <div className="relative flex items-center">
                  <User size={16} className="absolute left-4 opacity-50 text-foreground" />
                  <input 
                    name="username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    className="w-full bg-secondary/50 border border-border rounded-md py-3 pl-12 pr-4 text-sm font-mono-display focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/30"
                    placeholder="sys.admin or op.01"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Security Passkey</label>
                <div className="relative flex items-center">
                  <Lock size={16} className="absolute left-4 opacity-50 text-foreground" />
                  <input 
                    name="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full bg-secondary/50 border border-border rounded-md py-3 pl-12 pr-4 text-sm font-mono-display focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/30"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 mt-4 rounded border border-destructive/30 bg-destructive/10 text-destructive text-sm font-medium font-mono-display animate-in slide-in-from-top-2">
                  <AlertTriangle className="inline mr-2" size={16} />
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className={`w-full group mt-6 py-3 px-4 rounded-md bg-primary text-primary-foreground font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all ${loading ? 'opacity-50 cursor-not-allowed' : 'glow-primary'}`}
              >
                {loading ? 'Validating...' : 'Initialize Secure Link'}
                {!loading && <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>

            <div className="mt-8 text-center border-t border-border pt-6">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-mono-display">Verified Fleet Credentials</p>
              <div className="flex justify-center gap-4 text-xs font-mono-display text-muted-foreground">
                <span className="hover:text-primary transition-colors cursor-crosshair">boss : password123</span>
                <span>//</span>
                <span className="hover:text-primary transition-colors cursor-crosshair">m.chen : password123</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
