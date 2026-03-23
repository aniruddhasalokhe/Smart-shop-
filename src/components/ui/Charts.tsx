'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ChartProps {
  data: any[];
}

export function DetailedBarChart({ data }: ChartProps) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            contentStyle={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}
          />
          <Bar dataKey="ok" stackId="a" fill="url(#colorOk)" radius={[0, 0, 4, 4]} />
          <Bar dataKey="rejections" stackId="a" fill="url(#colorRej)" radius={[4, 4, 0, 0]} />
          <defs>
            <linearGradient id="colorOk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity={1}/>
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.8}/>
            </linearGradient>
            <linearGradient id="colorRej" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
              <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.8}/>
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RejectionPieChart({ data }: ChartProps) {
  const isNoDefect = data.length === 1 && data[0].name === 'No defects';
  const COLORS = isNoDefect ? ['url(#colorOk)'] : ['url(#pie1)', 'url(#pie2)', 'url(#pie3)', 'url(#pie4)'];
  
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={75}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
             contentStyle={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
             itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}
          />
          <defs>
            <linearGradient id="colorOk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#06b6d4"/><stop offset="100%" stopColor="#3b82f6"/></linearGradient>
            <linearGradient id="pie1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f87171"/><stop offset="100%" stopColor="#dc2626"/></linearGradient>
            <linearGradient id="pie2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#ea580c"/></linearGradient>
            <linearGradient id="pie3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fcd34d"/><stop offset="100%" stopColor="#d97706"/></linearGradient>
            <linearGradient id="pie4" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#4f46e5"/></linearGradient>
          </defs>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
