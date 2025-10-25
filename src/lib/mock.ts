import { Asset, Incident, RuleDef, TopologyNode, TopologyEdge, Severity, Vector, Protocol, OtRole } from './types';
import { redis } from './redis';

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

  try {
    // Get all incident keys
    const client = redis as { keys: (pattern: string) => Promise<string[]> };
    const keys = await client.keys('sec:incident:*');

    if (keys.length === 0) {
      // Fallback to JSON if Redis is not available
      console.warn('No incidents found in Redis, falling back to JSON');
      const response = await fetch('/data/mock-incidents.json');
      cachedIncidents = await response.json();
      return cachedIncidents!;
    }

    // Load all incidents from Redis
    const incidents: Incident[] = [];
    for (const key of keys) {
      const incident = await redis.json.get(key, '$') as Incident;
      if (incident) {
        incidents.push(incident);
      }
    }

    cachedIncidents = incidents;
    return incidents;
  } catch (error) {
    console.error('Error loading incidents from Redis:', error);
    // Fallback to JSON
    const response = await fetch('/data/mock-incidents.json');
    cachedIncidents = await response.json();
    return cachedIncidents!;
  }
}

async function loadAssets(): Promise<Asset[]> {
  if (cachedAssets) return cachedAssets;

  try {
    // Get all asset keys
    const client = redis as { keys: (pattern: string) => Promise<string[]> };
    const keys = await client.keys('sec:asset:*');

    if (keys.length === 0) {
      // Fallback to JSON if Redis is not available
      console.warn('No assets found in Redis, falling back to JSON');
      const response = await fetch('/data/mock-assets.json');
      cachedAssets = await response.json();
      return cachedAssets!;
    }

    // Load all assets from Redis
    const assets: Asset[] = [];
    for (const key of keys) {
      const asset = await redis.json.get(key, '$') as Asset;
      if (asset) {
        assets.push(asset);
      }
    }

    cachedAssets = assets;
    return assets;
  } catch (error) {
    console.error('Error loading assets from Redis:', error);
    // Fallback to JSON
    const response = await fetch('/data/mock-assets.json');
    cachedAssets = await response.json();
    return cachedAssets!;
  }
}

async function loadTopology(): Promise<{ nodes: TopologyNode[]; edges: TopologyEdge[] }> {
  if (cachedTopology) return cachedTopology;

  try {
    // Try Redis first
    const topology = await redis.json.get('sec:topology', '$');
    if (topology) {
      cachedTopology = topology;
      return topology;
    }
  } catch (error) {
    console.warn('Error loading topology from Redis:', error);
  }

  // Fallback to JSON
  const response = await fetch('/data/mock-topology.json');
  cachedTopology = await response.json();
  return cachedTopology!;
}

async function loadRules(): Promise<RuleDef[]> {
  if (cachedRules) return cachedRules;

  try {
    // Try Redis first
    const rules = await redis.json.get('sec:rules', '$');
    if (rules) {
      cachedRules = rules;
      return rules;
    }
  } catch (error) {
    console.warn('Error loading rules from Redis:', error);
  }

  // Fallback to JSON
  const response = await fetch('/data/mock-rules.json');
  cachedRules = await response.json();
  return cachedRules!;
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
  try {
    // Build Redis search query
    const queryParts: string[] = [];
    const filterConditions: string[] = [];

    // Text search
    if (params.q) {
      const query = params.q.toLowerCase();
      queryParts.push(`(@asset_name:*${query}*)|(@vector:*${query}*)|(@asset_zone:*${query}*)`);
    }

    // Tag filters
    if (params.severity?.length) {
      const severityTags = params.severity.map(s => s).join('|');
      filterConditions.push(`@severity:(${severityTags})`);
    }

    if (params.vector?.length) {
      const vectorTags = params.vector.map(v => v).join('|');
      filterConditions.push(`@vector:(${vectorTags})`);
    }

    if (params.protocol?.length) {
      const protocolTags = params.protocol.map(p => p).join('|');
      filterConditions.push(`@protocol:(${protocolTags})`);
    }

    if (params.zone?.length) {
      const zoneTags = params.zone.map(z => z).join('|');
      filterConditions.push(`@asset_zone:(${zoneTags})`);
    }

    if (params.role?.length) {
      const roleTags = params.role.map(r => r).join('|');
      filterConditions.push(`@asset_role:(${roleTags})`);
    }

    // Date range filters
    if (params.from) {
      filterConditions.push(`@firstSeen:[${new Date(params.from).getTime()} +inf]`);
    }

    if (params.to) {
      filterConditions.push(`@lastSeen:[-inf ${new Date(params.to).getTime()}]`);
    }

    // Combine all query parts
    const allQueryParts = [...queryParts, ...filterConditions];
    const query = allQueryParts.length > 0 ? allQueryParts.join(' ') : '*';

    // Pagination
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const offset = (page - 1) * pageSize;

    // Search in Redis
    const searchResult = await redis.search.search('idx:incidents', query, {
      limit: { offset, count: pageSize },
      sortBy: { field: 'firstSeen', order: 'DESC' }
    });

    // Parse results
    const incidents: Incident[] = [];
    if (searchResult && searchResult.results) {
      for (const result of searchResult.results) {
        try {
          const incidentData = await redis.json.get(result.id, '$') as Incident;
          if (incidentData) {
            incidents.push(incidentData);
          }
        } catch (error) {
          console.error(`Error loading incident ${result.id}:`, error);
        }
      }
    }

    return incidents;
  } catch (error) {
    console.error('Error searching incidents in Redis:', error);
    // Fallback to in-memory filtering
    let incidents = await loadIncidents();

    // Apply filters (simplified fallback)
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
}

export async function getIncident(id: string): Promise<Incident | null> {
  try {
    // Try Redis first
    const incident = await redis.json.get(`sec:incident:${id}`, '$') as Incident;
    if (incident) {
      return incident;
    }
  } catch (error) {
    console.warn(`Error loading incident ${id} from Redis:`, error);
  }

  // Fallback to in-memory search
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
  try {
    // Build Redis search query
    const queryParts: string[] = [];
    const filterConditions: string[] = [];

    // Text search
    if (params.q) {
      const query = params.q.toLowerCase();
      queryParts.push(`(@name:*${query}*)|(@ip:*${query}*)|(@zone:*${query}*)`);
    }

    // Tag filters
    if (params.role?.length) {
      const roleTags = params.role.map(r => r).join('|');
      filterConditions.push(`@role:(${roleTags})`);
    }

    if (params.zone?.length) {
      const zoneTags = params.zone.map(z => z).join('|');
      filterConditions.push(`@zone:(${zoneTags})`);
    }

    if (params.protocol?.length) {
      const protocolTags = params.protocol.map(p => p).join('|');
      filterConditions.push(`@protocols:(${protocolTags})`);
    }

    // Combine all query parts
    const allQueryParts = [...queryParts, ...filterConditions];
    const query = allQueryParts.length > 0 ? allQueryParts.join(' ') : '*';

    // Search in Redis
    const searchResult = await redis.search.search('idx:assets', query, {
      limit: { offset: 0, count: 1000 } // Get all matching assets
    });

    // Parse results
    const assets: Asset[] = [];
    if (searchResult && searchResult.results) {
      for (const result of searchResult.results) {
        try {
          const assetData = await redis.json.get(result.id, '$') as Asset;
          if (assetData) {
            assets.push(assetData);
          }
        } catch (error) {
          console.error(`Error loading asset ${result.id}:`, error);
        }
      }
    }

    return assets;
  } catch (error) {
    console.error('Error searching assets in Redis:', error);
    // Fallback to in-memory filtering
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
}

export async function getTopology(): Promise<{ nodes: TopologyNode[]; edges: TopologyEdge[] }> {
  return await loadTopology();
}

export async function getRules(): Promise<RuleDef[]> {
  return await loadRules();
}

export async function putRules(rules: RuleDef[]): Promise<void> {
  try {
    // Try to save to Redis first
    await redis.json.set('sec:rules', '$', rules);
    cachedRules = rules; // Update cache
    console.log('Rules updated in Redis:', rules.length);
  } catch (error) {
    console.error('Error saving rules to Redis:', error);
    // Fallback to in-memory
    cachedRules = rules;
    console.log('Rules updated (in-memory fallback):', rules);
  }
}
