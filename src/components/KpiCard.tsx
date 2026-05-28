import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  accentColor?: 'primary' | 'running' | 'idle' | 'down';
}

const accentMap = {
  primary: 'border-l-primary',
  running: 'border-l-status-running',
  idle: 'border-l-status-idle',
  down: 'border-l-status-down',
};

export function KpiCard({ title, value, subtitle, icon: Icon, trend, trendValue, accentColor = 'primary' }: KpiCardProps) {
  return (
    <div className={cn("card-industrial border-l-4", accentMap[accentColor])}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold font-mono-display tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend && trendValue && (
            <p className={cn("text-xs font-medium", trend === 'up' ? 'text-status-running' : trend === 'down' ? 'text-status-down' : 'text-muted-foreground')}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </p>
          )}
        </div>
        <div className="p-2 rounded-lg bg-secondary">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}
