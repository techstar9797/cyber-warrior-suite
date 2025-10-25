import { readFileSync } from 'fs';
import { join } from 'path';
import { getRedisClient, redis, closeRedisConnection } from '../../src/lib/redis';
import { Incident, Asset, RuleDef, TopologyNode, TopologyEdge } from '../../src/lib/types';

async function loadMockData() {
  try {
    // Load JSON files
    const incidentsPath = join(process.cwd(), 'public/data/mock-incidents.json');
    const assetsPath = join(process.cwd(), 'public/data/mock-assets.json');
    const rulesPath = join(process.cwd(), 'public/data/mock-rules.json');
    const topologyPath = join(process.cwd(), 'public/data/mock-topology.json');

    const incidents: Incident[] = JSON.parse(readFileSync(incidentsPath, 'utf8'));
    const assets: Asset[] = JSON.parse(readFileSync(assetsPath, 'utf8'));
    const rules: RuleDef[] = JSON.parse(readFileSync(rulesPath, 'utf8'));
    const topology: { nodes: TopologyNode[]; edges: TopologyEdge[] } = JSON.parse(readFileSync(topologyPath, 'utf8'));

    return { incidents, assets, rules, topology };
  } catch (error) {
    console.error('Error loading mock data:', error);
    throw error;
  }
}

async function createIncidentsIndex() {
  const indexSchema = [
    // TAG fields (exact match, low cardinality)
    '$.severity', 'AS', 'severity', 'TAG',
    '$.vector', 'AS', 'vector', 'TAG',
    '$.protocol', 'AS', 'protocol', 'TAG',
    '$.status', 'AS', 'status', 'TAG',
    '$.source', 'AS', 'source', 'TAG',
    '$.asset.role', 'AS', 'asset_role', 'TAG',
    '$.asset.zone', 'AS', 'asset_zone', 'TAG',

    // TEXT fields (full-text search)
    '$.asset.id', 'AS', 'asset_id', 'TEXT',
    '$.asset.name', 'AS', 'asset_name', 'TEXT',
    '$.asset.ip', 'AS', 'asset_ip', 'TEXT',

    // NUMERIC fields (range queries, sorting)
    '$.firstSeen', 'AS', 'firstSeen', 'NUMERIC',
    '$.lastSeen', 'AS', 'lastSeen', 'NUMERIC',
    '$.count', 'AS', 'count', 'NUMERIC',

    // Full details for retrieval
    '$', 'AS', 'details', 'TEXT'
  ];

  try {
    await redis.search.dropIndex('idx:incidents', true);
  } catch (error) {
    // Index doesn't exist, that's fine
  }

  await redis.search.createIndex('idx:incidents', indexSchema);
  console.log('Created RediSearch index: idx:incidents');
}

async function createAssetsIndex() {
  const indexSchema = [
    // TAG fields
    '$.role', 'AS', 'role', 'TAG',
    '$.zone', 'AS', 'zone', 'TAG',
    '$.protocols[*]', 'AS', 'protocols', 'TAG',
    '$.vendor', 'AS', 'vendor', 'TAG',
    '$.model', 'AS', 'model', 'TAG',
    '$.criticality', 'AS', 'criticality', 'TAG',

    // TEXT fields
    '$.id', 'AS', 'id', 'TEXT',
    '$.name', 'AS', 'name', 'TEXT',
    '$.ip', 'AS', 'ip', 'TEXT',
    '$.firmware', 'AS', 'firmware', 'TEXT',

    // NUMERIC fields
    '$.telemetry.tempC', 'AS', 'tempC', 'NUMERIC',
    '$.telemetry.pressureKPa', 'AS', 'pressureKPa', 'NUMERIC',
    '$.telemetry.vibrationMMs', 'AS', 'vibrationMMs', 'NUMERIC',
  ];

  try {
    await redis.search.dropIndex('idx:assets', true);
  } catch (error) {
    // Index doesn't exist, that's fine
  }

  await redis.search.createIndex('idx:assets', indexSchema);
  console.log('Created RediSearch index: idx:assets');
}

async function seedIncidents(incidents: Incident[]) {
  console.log(`Seeding ${incidents.length} incidents...`);

  for (const incident of incidents) {
    const key = `sec:incident:${incident.id}`;

    // Store as JSON
    await redis.json.set(key, '$', incident);

    console.log(`✓ Seeded incident: ${incident.id}`);
  }
}

async function seedAssets(assets: Asset[]) {
  console.log(`Seeding ${assets.length} assets...`);

  for (const asset of assets) {
    const key = `sec:asset:${asset.id}`;

    // Store as JSON
    await redis.json.set(key, '$', asset);

    console.log(`✓ Seeded asset: ${asset.id}`);
  }
}

async function seedRules(rules: RuleDef[]) {
  console.log(`Seeding ${rules.length} rules...`);

  const key = 'sec:rules';
  await redis.json.set(key, '$', rules);

  console.log('✓ Seeded rules');
}

async function seedTopology(topology: { nodes: TopologyNode[]; edges: TopologyEdge[] }) {
  console.log(`Seeding topology with ${topology.nodes.length} nodes and ${topology.edges.length} edges...`);

  const key = 'sec:topology';
  await redis.json.set(key, '$', topology);

  console.log('✓ Seeded topology');
}

async function main() {
  try {
    console.log('🚀 Starting Redis seed process...');

    // Load mock data
    const { incidents, assets, rules, topology } = await loadMockData();

    // Create search indexes
    await createIncidentsIndex();
    await createAssetsIndex();

    // Seed data
    await seedIncidents(incidents);
    await seedAssets(assets);
    await seedRules(rules);
    await seedTopology(topology);

    console.log('✅ Redis seed completed successfully!');
    console.log('\n📊 Data Summary:');
    console.log(`   - Incidents: ${incidents.length}`);
    console.log(`   - Assets: ${assets.length}`);
    console.log(`   - Rules: ${rules.length}`);
    console.log(`   - Topology nodes: ${topology.nodes.length}`);
    console.log(`   - Topology edges: ${topology.edges.length}`);

    console.log('\n🔍 Available search indexes:');
    console.log('   - idx:incidents (search incidents by severity, vector, protocol, etc.)');
    console.log('   - idx:assets (search assets by role, zone, protocols, etc.)');

    console.log('\n📋 Sample queries:');
    console.log('   - FT.SEARCH idx:incidents "@severity:{critical}"');
    console.log('   - FT.SEARCH idx:incidents "@vector:{unauthorized_write}"');
    console.log('   - FT.SEARCH idx:assets "@role:{PLC}"');

  } catch (error) {
    console.error('❌ Redis seed failed:', error);
    process.exit(1);
  } finally {
    // Close Redis connection
    await closeRedisConnection();
  }
}

// Run the seed script
if (require.main === module) {
  main();
}
