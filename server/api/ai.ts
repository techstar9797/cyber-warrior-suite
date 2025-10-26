import { Router } from 'express';
import { getRedisAIService, generateSimpleEmbedding } from '../lib/redis-ai';
import { getRedis } from '../lib/redis';

const router = Router();

// POST /api/ai/similar-incidents - Find similar incidents using vector search
router.post('/similar-incidents', async (req, res) => {
  try {
    const { incidentId, threshold = 0.8, limit = 5 } = req.body;
    
    if (!incidentId) {
      return res.status(400).json({ error: 'incidentId is required' });
    }

    const redis = await getRedis();
    const incident = await redis.json.get(`sec:incident:${incidentId}`);
    
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Generate embedding for the incident
    const incidentText = `${incident.vector} ${incident.severity} ${incident.asset?.name || ''}`;
    const embedding = generateSimpleEmbedding(incidentText);

    const aiService = await getRedisAIService();
    
    // Store embedding if not exists
    await aiService.storeIncidentEmbedding(incidentId, embedding, {
      severity: incident.severity,
      vector: incident.vector,
      asset_name: incident.asset?.name
    });

    // Find similar incidents
    const similarIncidents = await aiService.findSimilarIncidents(embedding, threshold, limit);

    res.json({
      query_incident: incidentId,
      similar_incidents: similarIncidents,
      embedding_dimension: embedding.length,
      threshold,
      total_found: similarIncidents.length
    });
  } catch (error) {
    console.error('Similar incidents error:', error);
    res.status(500).json({ error: 'Failed to find similar incidents' });
  }
});

// POST /api/ai/agent-memory - Store agent decision in memory
router.post('/agent-memory', async (req, res) => {
  try {
    const { agentId, decision, context, incidentId } = req.body;
    
    if (!agentId || !decision) {
      return res.status(400).json({ error: 'agentId and decision are required' });
    }

    const aiService = await getRedisAIService();
    
    // Generate embedding for the decision context
    const contextText = `${decision} ${JSON.stringify(context)}`;
    const embedding = generateSimpleEmbedding(contextText);

    await aiService.storeAgentMemory(agentId, decision, {
      ...context,
      incident_id: incidentId,
      timestamp: new Date().toISOString()
    }, embedding);

    res.json({
      success: true,
      agent_id: agentId,
      decision,
      memory_stored: true
    });
  } catch (error) {
    console.error('Agent memory error:', error);
    res.status(500).json({ error: 'Failed to store agent memory' });
  }
});

// GET /api/ai/agent-memory/:agentId - Retrieve agent memory
router.get('/agent-memory/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { limit = 10 } = req.query;

    const aiService = await getRedisAIService();
    const memories = await aiService.getAgentMemory(agentId, Number(limit));

    res.json({
      agent_id: agentId,
      memories,
      total_memories: memories.length
    });
  } catch (error) {
    console.error('Agent memory retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve agent memory' });
  }
});

// POST /api/ai/incident-features - Store ML features for incident
router.post('/incident-features', async (req, res) => {
  try {
    const { incidentId, features } = req.body;
    
    if (!incidentId || !features) {
      return res.status(400).json({ error: 'incidentId and features are required' });
    }

    const aiService = await getRedisAIService();
    await aiService.storeIncidentFeatures(incidentId, features);

    res.json({
      success: true,
      incident_id: incidentId,
      features_stored: Object.keys(features).length
    });
  } catch (error) {
    console.error('Incident features error:', error);
    res.status(500).json({ error: 'Failed to store incident features' });
  }
});

// GET /api/ai/incident-features - Get features for multiple incidents
router.get('/incident-features', async (req, res) => {
  try {
    const { incidentIds } = req.query;
    
    if (!incidentIds) {
      return res.status(400).json({ error: 'incidentIds query parameter is required' });
    }

    const ids = Array.isArray(incidentIds) ? incidentIds : [incidentIds];
    const aiService = await getRedisAIService();
    const features = await aiService.getIncidentFeatures(ids as string[]);

    res.json({
      features,
      total_incidents: Object.keys(features).length
    });
  } catch (error) {
    console.error('Incident features retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve incident features' });
  }
});

// GET /api/ai/status - Check Redis AI service status
router.get('/status', async (req, res) => {
  try {
    const aiService = await getRedisAIService();
    const redis = await getRedis();
    
    // Check if indexes exist
    const indexes = await redis.ft.list();
    
    res.json({
      status: 'active',
      redis_ai_service: 'initialized',
      indexes: indexes,
      capabilities: [
        'vector_similarity_search',
        'agent_long_term_memory',
        'incident_feature_store',
        'embedding_generation'
      ]
    });
  } catch (error) {
    console.error('Redis AI status error:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Failed to check Redis AI status'
    });
  }
});

export default router;
