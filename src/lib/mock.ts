import { Asset, Incident, RuleDef, TopologyNode, TopologyEdge, Severity, Vector, Protocol, OtRole } from './types';

export interface DashboardKpis {
  open: number;
  critical: number;
  mttrMinutes: number;
  incidentsPerHour: { hour: string; count: number }[];
  protocolMix: Record<Protocol, number>;
  topVectors: { vector: string; count: number }[];
}

let cachedIncidents: Incident[] | null = null;
let cachedAssets: Asset[] | null = null;
let cachedRules: RuleDef[] | null = null;
let cachedTopology: { nodes: TopologyNode[]; edges: TopologyEdge[] } | null = null;

async function loadIncidents(): Promise<Incident[]> {
  if (cachedIncidents) return cachedIncidents;

  // Skip Redis in browser - use JSON fallback directly
  try {
    const response = await fetch('/data/mock-incidents.json');
    cachedIncidents = await response.json();
    return cachedIncidents!;
  } catch (error) {
    console.error('Error loading incidents:', error);
    return [];
  }
}

async function loadAssets(): Promise<Asset[]> {
  if (cachedAssets) return cachedAssets;

  // Skip Redis in browser - use JSON fallback directly
  try {
    const response = await fetch('/data/mock-assets.json');
    cachedAssets = await response.json();
    return cachedAssets!;
  } catch (error) {
    console.error('Error loading assets:', error);
    return [];
  }
}

async function loadTopology(): Promise<{ nodes: TopologyNode[]; edges: TopologyEdge[] }> {
  if (cachedTopology) return cachedTopology;

  // Skip Redis in browser - use JSON fallback directly
  try {
    const response = await fetch('/data/mock-topology.json');
    cachedTopology = await response.json();
    return cachedTopology!;
  } catch (error) {
    console.error('Error loading topology:', error);
    return { nodes: [], edges: [] };
  }
}

async function loadRules(): Promise<RuleDef[]> {
  if (cachedRules) return cachedRules;

  // Skip Redis in browser - use JSON fallback directly
  try {
    const response = await fetch('/data/mock-rules.json');
    cachedRules = await response.json();
    return cachedRules!;
  } catch (error) {
    console.error('Error loading rules:', error);
    return [];
  }
}

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const incidents = await loadIncidents();
  const open = incidents.filter((i) => i.status === 'open').length;
  const critical = incidents.filter((i) => i.severity === 'critical').length;

  // Mock MTTR
  const mttrMinutes = 45;

  // Generate 24h incident counts
  const incidentsPerHour = Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    count: Math.floor(Math.random() * 8) + 1,
  }));

  // Protocol mix
  const protocolCounts: Partial<Record<Protocol, number>> = {};
  incidents.forEach((inc) => {
    if (inc.protocol) {
      protocolCounts[inc.protocol] = (protocolCounts[inc.protocol] || 0) + 1;
    }
  });

  // Top vectors
  const vectorCounts: Record<string, number> = {};
  incidents.forEach((inc) => {
    vectorCounts[inc.vector] = (vectorCounts[inc.vector] || 0) + 1;
  });
  const topVectors = Object.entries(vectorCounts)
    .map(([vector, count]) => ({ vector, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    open,
    critical,
    mttrMinutes,
    incidentsPerHour,
    protocolMix: protocolCounts as Record<Protocol, number>,
    topVectors,
  };
}

export interface GetIncidentsParams {
  q?: string;
  severity?: Severity[];
  vector?: Vector[];
  protocol?: Protocol[];
  zone?: string[];
  role?: OtRole[];
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function getIncidents(params: GetIncidentsParams = {}): Promise<Incident[]> {
  // Use in-memory filtering in browser
  let incidents = await loadIncidents();

  // Apply filters
  if (params.q) {
    const query = params.q.toLowerCase();
    incidents = incidents.filter(
      (inc) =>
        inc.asset.name.toLowerCase().includes(query) ||
        inc.vector.toLowerCase().includes(query) ||
        inc.asset.zone.toLowerCase().includes(query)
    );
  }

  if (params.severity?.length) {
    incidents = incidents.filter((inc) => params.severity!.includes(inc.severity));
  }

  if (params.vector?.length) {
    incidents = incidents.filter((inc) => params.vector!.includes(inc.vector));
  }

  if (params.protocol?.length) {
    incidents = incidents.filter((inc) => inc.protocol && params.protocol!.includes(inc.protocol));
  }

  if (params.zone?.length) {
    incidents = incidents.filter((inc) => params.zone!.includes(inc.asset.zone));
  }

  if (params.role?.length) {
    incidents = incidents.filter((inc) => params.role!.includes(inc.asset.role));
  }

  if (params.from) {
    const fromDate = new Date(params.from);
    incidents = incidents.filter((inc) => new Date(inc.firstSeen) >= fromDate);
  }

  if (params.to) {
    const toDate = new Date(params.to);
    incidents = incidents.filter((inc) => new Date(inc.lastSeen) <= toDate);
  }

  const page = params.page || 1;
  const pageSize = params.pageSize || 50;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return incidents.slice(start, end);
}

export async function getIncident(id: string): Promise<Incident | null> {
  // Use in-memory search in browser
  const incidents = await loadIncidents();
  return incidents.find((inc) => inc.id === id) || null;
}

export interface GetAssetsParams {
  q?: string;
  role?: OtRole[];
  zone?: string[];
  protocol?: Protocol[];
}

export async function getAssets(params: GetAssetsParams = {}): Promise<Asset[]> {
  // Use in-memory filtering in browser
  let assets = await loadAssets();

  if (params.q) {
    const query = params.q.toLowerCase();
    assets = assets.filter(
      (asset) =>
        asset.name.toLowerCase().includes(query) ||
        asset.ip.includes(query) ||
        asset.zone.toLowerCase().includes(query)
    );
  }

  if (params.role?.length) {
    assets = assets.filter((asset) => params.role!.includes(asset.role));
  }

  if (params.zone?.length) {
    assets = assets.filter((asset) => params.zone!.includes(asset.zone));
  }

  if (params.protocol?.length) {
    assets = assets.filter((asset) => asset.protocols.some((p) => params.protocol!.includes(p)));
  }

  return assets;
}

export async function getTopology(): Promise<{ nodes: TopologyNode[]; edges: TopologyEdge[] }> {
  return await loadTopology();
}

export async function getRules(): Promise<RuleDef[]> {
  return await loadRules();
}

export async function putRules(rules: RuleDef[]): Promise<void> {
  // Save to in-memory cache in browser
  cachedRules = rules;
  console.log('Rules updated (in-memory):', rules.length);
}
