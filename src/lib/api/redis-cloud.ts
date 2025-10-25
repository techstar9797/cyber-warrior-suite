import { config } from '../config';

export interface RedisCloudResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface Database {
  databaseId: string;
  name: string;
  status: 'active' | 'pending' | 'error';
  memoryLimitInGb: number;
  memoryUsedInGb: number;
  connections: number;
  throughput: {
    operationsPerSecond: number;
    networkIn: number;
    networkOut: number;
  };
  endpoint: {
    host: string;
    port: number;
  };
  modules: string[];
}

export interface Metrics {
  timestamp: string;
  cpu: number;
  memory: {
    used: number;
    total: number;
    peak: number;
  };
  connections: number;
  throughput: {
    read: number;
    write: number;
  };
  latency: {
    average: number;
    p95: number;
    p99: number;
  };
}

export class RedisCloudAPI {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = config.apis.redis.baseUrl;
    this.apiKey = config.apis.redis.apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<RedisCloudResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();

      return {
        success: true,
        data,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: response.headers.get('X-Request-ID') || undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getDatabases(): Promise<RedisCloudResponse<Database[]>> {
    return this.request<Database[]>('/databases');
  }

  async getDatabase(databaseId: string): Promise<RedisCloudResponse<Database>> {
    return this.request<Database>(`/databases/${databaseId}`);
  }

  async getDatabaseMetrics(databaseId: string, hours = 24): Promise<RedisCloudResponse<Metrics[]>> {
    return this.request<Metrics[]>(`/databases/${databaseId}/metrics?hours=${hours}`);
  }

  async getDatabaseStats(databaseId: string): Promise<RedisCloudResponse<{
    totalKeys: number;
    memoryUsage: number;
    connections: number;
    throughput: {
      read: number;
      write: number;
    };
    latency: number;
  }>> {
    return this.request(`/databases/${databaseId}/stats`);
  }

  async createDatabase(request: {
    name: string;
    memoryLimitInGb: number;
    modules?: string[];
    region?: string;
  }): Promise<RedisCloudResponse<Database>> {
    return this.request<Database>('/databases', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async updateDatabase(databaseId: string, updates: {
    name?: string;
    memoryLimitInGb?: number;
  }): Promise<RedisCloudResponse<Database>> {
    return this.request<Database>(`/databases/${databaseId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteDatabase(databaseId: string): Promise<RedisCloudResponse<void>> {
    return this.request<void>(`/databases/${databaseId}`, {
      method: 'DELETE',
    });
  }

  async getAccountUsage(): Promise<RedisCloudResponse<{
    databases: number;
    totalMemoryInGb: number;
    totalConnections: number;
  }>> {
    return this.request('/account/usage');
  }

  async getRegions(): Promise<RedisCloudResponse<Array<{
    regionId: string;
    name: string;
    country: string;
    city: string;
    available: boolean;
  }>>> {
    return this.request('/regions');
  }

  // High-level methods for the Cyber Warrior Suite
  async getOptimalDatabaseForIncidents(): Promise<Database | null> {
    if (!config.features.enableRedisCloud || !this.apiKey) {
      return null;
    }

    try {
      const response = await this.getDatabases();
      if (!response.success || !response.data) {
        return null;
      }

      // Find the best database for incident data (prefer RedisJSON + Search)
      const suitableDbs = response.data.filter(db =>
        db.modules.includes('RedisJSON') &&
        db.modules.includes('RediSearch') &&
        db.status === 'active'
      );

      // Return the one with most available memory
      return suitableDbs.sort((a, b) =>
        (b.memoryLimitInGb - b.memoryUsedInGb) - (a.memoryLimitInGb - a.memoryUsedInGb)
      )[0] || null;
    } catch (error) {
      console.error('Error getting optimal database:', error);
      return null;
    }
  }

  async getIncidentDatabaseMetrics(): Promise<Metrics[] | null> {
    if (!config.features.enableRedisCloud || !this.apiKey) {
      return null;
    }

    try {
      const database = await this.getOptimalDatabaseForIncidents();
      if (!database) {
        return null;
      }

      const response = await this.getDatabaseMetrics(database.databaseId, 24);
      return response.success ? response.data || null : null;
    } catch (error) {
      console.error('Error getting incident database metrics:', error);
      return null;
    }
  }

  async checkDatabaseHealth(): Promise<{
    healthy: boolean;
    database?: Database;
    error?: string;
  }> {
    if (!config.features.enableRedisCloud || !this.apiKey) {
      return { healthy: false, error: 'Redis Cloud API not configured' };
    }

    try {
      const response = await this.getDatabases();
      if (!response.success) {
        return { healthy: false, error: response.error };
      }

      const databases = response.data || [];
      const activeDbs = databases.filter(db => db.status === 'active');

      if (activeDbs.length === 0) {
        return { healthy: false, error: 'No active databases found' };
      }

      return {
        healthy: true,
        database: activeDbs[0],
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const redisCloudAPI = new RedisCloudAPI();
