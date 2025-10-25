export type OtRole = 'PLC' | 'RTU' | 'HMI' | 'Gateway' | 'Historian' | 'Sensor' | 'IPC';
export type Protocol = 'ModbusTCP' | 'OPCUA' | 'Profinet' | 'DNP3' | 'MQTT' | 'S7' | 'BACnet';
export type Source = 'sensor' | 'netflow' | 'syslog' | 'controller';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type Vector =
  | 'command_injection'
  | 'unauthorized_write'
  | 'lateral_movement_it_ot'
  | 'firmware_change'
  | 'setpoint_tamper'
  | 'p2p_scan'
  | 'cleartext_protocol'
  | 'mqtt_anomaly'
  | 'time_sync_tamper'
  | 'rogue_engineer_ws'
  | 'estop_blocked'
  | 'unsafe_mode_change';

export interface Asset {
  id: string;
  name: string;
  role: OtRole;
  vendor?: string;
  model?: string;
  ip: string;
  zone: string;
  protocols: Protocol[];
  firmware?: string;
  criticality: 'low' | 'medium' | 'high';
  lastSeen: string;
  telemetry?: {
    tempC?: number;
    pressureKPa?: number;
    vibrationMMs?: number;
  };
}

export interface Incident {
  id: string;
  severity: Severity;
  vector: Vector;
  source: Source;
  asset: {
    id: string;
    name: string;
    role: OtRole;
    ip: string;
    zone: string;
  };
  protocol?: Protocol;
  firstSeen: string;
  lastSeen: string;
  count: number;
  status: 'open' | 'ack' | 'closed';
  details: Record<string, unknown>;
}

export interface RuleDef {
  name: string;
  if: Record<string, unknown>;
  actions: string[];
  severity?: Severity;
}

export interface TopologyNode {
  id: string;
  label: string;
  kind: 'zone' | 'asset' | 'boundary';
  x?: number;
  y?: number;
}

export interface TopologyEdge {
  from: string;
  to: string;
  label?: string;
}
