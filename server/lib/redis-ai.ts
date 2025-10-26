/**
 * Redis AI Integration for Cyber Warrior Suite
 * Based on redis-ai-resources patterns
 * 
 * Features:
 * - Vector search for incident similarity
 * - RAG for threat intelligence
 * - Agent long-term memory
 * - Feature store for ML models
 */

import { RedisClientType } from 'redis';
import { getRedis } from './redis';

interface VectorEmbedding {
  id: string;
  vector: number[];
  metadata: Record<string, any>;
}

interface SimilarIncident {
  id: string;
  similarity: number;
  incident: any;
}

export class RedisAIService {
  private redis: RedisClientType;

  constructor(redis: RedisClientType) {
    this.redis = redis;
  }

  /**
   * Store incident embedding for similarity search
   * Based on vector-similarity-search recipes
   */
  async storeIncidentEmbedding(incidentId: string, embedding: number[], metadata: any): Promise<void> {
    const key = `incident:embedding:${incidentId}`;
    
    await this.redis.json.set(key, '$', {
      id: incidentId,
      vector: embedding,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        vector_dim: embedding.length
      }
    });

    // Add to vector index for similarity search
    await this.redis.ft.add('idx:incident_vectors', key, {
      incident_id: incidentId,
      severity: metadata.severity,
      vector_type: 'incident_embedding'
    });
  }

  /**
   * Find similar incidents using vector search
   * Based on Redis Vector Search API patterns
   */
  async findSimilarIncidents(
    queryEmbedding: number[], 
    threshold: number = 0.8,
    limit: number = 5
  ): Promise<SimilarIncident[]> {
    try {
      // Convert embedding to Redis vector format
      const vectorStr = queryEmbedding.join(',');
      
      const results = await this.redis.ft.search(
        'idx:incident_vectors',
        `@vector:[VECTOR_SIMILARITY $query_vector $threshold]`,
        {
          PARAMS: { 
            query_vector: vectorStr, 
            threshold: threshold.toString() 
          },
          LIMIT: { from: 0, size: limit },
          RETURN: ['incident_id', 'severity', 'vector_type']
        }
      );

      const similarIncidents: SimilarIncident[] = [];
      
      for (const doc of results.documents || []) {
        const incidentId = doc.value.incident_id as string;
        const similarity = doc.score || 0;
        
        // Get full incident data
        const incident = await this.redis.json.get(`sec:incident:${incidentId}`);
        
        if (incident) {
          similarIncidents.push({
            id: incidentId,
            similarity,
            incident: incident as any
          });
        }
      }

      return similarIncidents;
    } catch (error) {
      console.error('Vector search error:', error);
      return [];
    }
  }

  /**
   * Store agent decision in long-term memory
   * Based on agent-long-term-memory recipe
   */
  async storeAgentMemory(
    agentId: string, 
    decision: string, 
    context: any, 
    embedding?: number[]
  ): Promise<void> {
    const memoryKey = `agent:memory:${agentId}:${Date.now()}`;
    
    const memory = {
      agent_id: agentId,
      decision,
      context,
      embedding: embedding || [],
      timestamp: new Date().toISOString(),
      memory_type: 'decision'
    };

    await this.redis.json.set(memoryKey, '$', memory);
    
    // Add to agent memory index
    await this.redis.ft.add('idx:agent_memory', memoryKey, {
      agent_id: agentId,
      decision,
      memory_type: 'decision'
    });
  }

  /**
   * Retrieve agent memory for context
   * Based on agent-short-term-memory patterns
   */
  async getAgentMemory(agentId: string, limit: number = 10): Promise<any[]> {
    try {
      const results = await this.redis.ft.search(
        'idx:agent_memory',
        `@agent_id:${agentId}`,
        {
          LIMIT: { from: 0, size: limit },
          SORTBY: { BY: 'timestamp', DIRECTION: 'DESC' }
        }
      );

      const memories = [];
      for (const doc of results.documents || []) {
        const memory = await this.redis.json.get(doc.id);
        if (memory) {
          memories.push(memory);
        }
      }

      return memories;
    } catch (error) {
      console.error('Agent memory retrieval error:', error);
      return [];
    }
  }

  /**
   * Store ML features for incident analysis
   * Based on feature-store recipes
   */
  async storeIncidentFeatures(incidentId: string, features: Record<string, number>): Promise<void> {
    const featureKey = `features:incident:${incidentId}`;
    
    await this.redis.json.set(featureKey, '$', {
      incident_id: incidentId,
      features,
      timestamp: new Date().toISOString(),
      feature_version: '1.0'
    });

    // Add to feature index
    await this.redis.ft.add('idx:incident_features', featureKey, {
      incident_id: incidentId,
      feature_count: Object.keys(features).length
    });
  }

  /**
   * Get features for ML model training
   */
  async getIncidentFeatures(incidentIds: string[]): Promise<Record<string, any>> {
    const features: Record<string, any> = {};
    
    for (const incidentId of incidentIds) {
      const featureData = await this.redis.json.get(`features:incident:${incidentId}`);
      if (featureData) {
        features[incidentId] = featureData;
      }
    }
    
    return features;
  }

  /**
   * Initialize Redis AI indexes
   * Based on Redis Vector Search setup patterns
   */
  async initializeIndexes(): Promise<void> {
    try {
      // Create incident vector index
      await this.redis.ft.create('idx:incident_vectors', {
        incident_id: { type: 'TEXT' },
        severity: { type: 'TEXT' },
        vector_type: { type: 'TEXT' }
      }, {
        ON: 'JSON',
        PREFIX: 'incident:embedding:'
      });

      // Create agent memory index
      await this.redis.ft.create('idx:agent_memory', {
        agent_id: { type: 'TEXT' },
        decision: { type: 'TEXT' },
        memory_type: { type: 'TEXT' },
        timestamp: { type: 'NUMERIC', SORTABLE: true }
      }, {
        ON: 'JSON',
        PREFIX: 'agent:memory:'
      });

      // Create feature store index
      await this.redis.ft.create('idx:incident_features', {
        incident_id: { type: 'TEXT' },
        feature_count: { type: 'NUMERIC' }
      }, {
        ON: 'JSON',
        PREFIX: 'features:incident:'
      });

      console.log('✅ Redis AI indexes initialized');
    } catch (error) {
      if (error.message?.includes('already exists')) {
        console.log('✅ Redis AI indexes already exist');
      } else {
        console.error('❌ Failed to initialize Redis AI indexes:', error);
      }
    }
  }
}

// Singleton instance
let redisAIService: RedisAIService | null = null;

export async function getRedisAIService(): Promise<RedisAIService> {
  if (!redisAIService) {
    const redis = await getRedis();
    redisAIService = new RedisAIService(redis);
    await redisAIService.initializeIndexes();
  }
  return redisAIService;
}

// Utility function to generate simple embeddings (for demo)
export function generateSimpleEmbedding(text: string): number[] {
  // Simple hash-based embedding for demo
  // In production, use OpenAI, Cohere, or local embedding models
  const hash = text.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  // Generate 128-dimensional vector
  const embedding = new Array(128).fill(0);
  for (let i = 0; i < 128; i++) {
    embedding[i] = Math.sin(hash + i) * 0.1;
  }
  
  return embedding;
}
