import { OtRole } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Cpu, Radio, Monitor, Server, Database, Gauge, PcCase, Globe, Shield, Wifi } from 'lucide-react';

interface AssetChipProps {
  name: string;
  role: OtRole;
  zone: string;
  className?: string;
}

const roleIcons: Record<string, any> = {
  PLC: Cpu,
  RTU: Radio,
  HMI: Monitor,
  Gateway: Server,
  Historian: Database,
  Sensor: Gauge,
  IPC: PcCase,
  ip: Globe,
  indicator: Shield,
  IoT: Wifi,
};

export function AssetChip({ name, role, zone, className }: AssetChipProps) {
  const Icon = roleIcons[role] || PcCase; // Fallback to PcCase if role not found
  
  return (
    <div className={`inline-flex items-center gap-2 ${className || ''}`}>
      <Badge variant="secondary" className="gap-1">
        <Icon className="w-3 h-3" />
        {role}
      </Badge>
      <span className="font-medium">{name}</span>
      <span className="text-xs text-muted-foreground">({zone})</span>
    </div>
  );
}
