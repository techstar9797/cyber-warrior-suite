import { readFileSync } from 'fs';
import { join } from 'path';
import { getRedis, closeRedis } from '../lib/redis';

async function main() {
  console.log('🌱 Starting Redis seed...');
  
  const redis = await getRedis();

  // Load mock data
  const incidents = JSON.parse(readFileSync(join(process.cwd(), 'public/data/mock-incidents.json'), 'utf8'));
  const assets = JSON.parse(readFileSync(join(process.cwd(), 'public/data/mock-assets.json'), 'utf8'));
  const rules = JSON.parse(readFileSync(join(process.cwd(), 'public/data/mock-rules.json'), 'utf8'));

  // Seed incidents
  for (const incident of incidents) {
    await redis.json.set(`sec:incident:${incident.id}`, '$', incident);
  }
  console.log(`✅ Seeded ${incidents.length} incidents`);

  // Seed assets
  for (const asset of assets) {
    await redis.json.set(`sec:asset:${asset.id}`, '$', asset);
  }
  console.log(`✅ Seeded ${assets.length} assets`);

  // Seed rules
  await redis.json.set('sec:rules', '$', rules);
  console.log(`✅ Seeded ${rules.length} rules`);

  await closeRedis();
  console.log('✅ Seed complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
