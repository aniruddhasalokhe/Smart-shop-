import { cn } from "@/lib/utils";
export type MachineStatus = 'running' | 'idle' | 'breakdown' | 'maintenance';
export type OperatorStatus = 'active' | 'break' | 'absent';
export type JobStatus = 'in-progress' | 'completed' | 'pending' | 'stopped';

const machineStatusConfig: Record<MachineStatus, { label: string; className: string; dotClass: string }> = {
  running: { label: 'Running', className: 'bg-status-running/15 text-status-running border-status-running/30', dotClass: 'bg-status-running' },
  idle: { label: 'Idle', className: 'bg-status-idle/15 text-status-idle border-status-idle/30', dotClass: 'bg-status-idle' },
  breakdown: { label: 'Breakdown', className: 'bg-status-down/15 text-status-down border-status-down/30', dotClass: 'bg-status-down' },
  maintenance: { label: 'Maintenance', className: 'bg-status-maintenance/15 text-status-maintenance border-status-maintenance/30', dotClass: 'bg-status-maintenance' },
};

const operatorStatusConfig: Record<OperatorStatus, { label: string; className: string; dotClass: string }> = {
  active: { label: 'Active', className: 'bg-status-running/15 text-status-running border-status-running/30', dotClass: 'bg-status-running' },
  break: { label: 'Break', className: 'bg-status-idle/15 text-status-idle border-status-idle/30', dotClass: 'bg-status-idle' },
  absent: { label: 'Absent', className: 'bg-status-down/15 text-status-down border-status-down/30', dotClass: 'bg-status-down' },
};

const jobStatusConfig: Record<JobStatus, { label: string; className: string; dotClass: string }> = {
  'in-progress': { label: 'In Progress', className: 'bg-status-running/15 text-status-running border-status-running/30', dotClass: 'bg-status-running' },
  completed: { label: 'Completed', className: 'bg-status-maintenance/15 text-status-maintenance border-status-maintenance/30', dotClass: 'bg-status-maintenance' },
  pending: { label: 'Pending', className: 'bg-status-idle/15 text-status-idle border-status-idle/30', dotClass: 'bg-status-idle' },
  stopped: { label: 'Stopped', className: 'bg-status-down/15 text-status-down border-status-down/30', dotClass: 'bg-status-down' },
};

interface StatusBadgeProps {
  status: MachineStatus | OperatorStatus | JobStatus;
  type: 'machine' | 'operator' | 'job';
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, type, size = 'md' }: StatusBadgeProps) {
  const config = type === 'machine'
    ? machineStatusConfig[status as MachineStatus]
    : type === 'operator'
    ? operatorStatusConfig[status as OperatorStatus]
    : jobStatusConfig[status as JobStatus];

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border font-medium",
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      config.className
    )}>
      <span className={cn("w-2 h-2 rounded-full animate-pulse-glow", config.dotClass)} />
      {config.label}
    </span>
  );
}
