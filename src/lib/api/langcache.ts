import { config } from '../config';

export interface LangCacheResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    timestamp: string;
    cacheHit: boolean;
    ttl?: number;
  };
}

export interface CacheEntry {
  key: string;
  value: unknown;
  ttl?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export class LangCacheAPI {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = config.apis.langcache.baseUrl;
    this.apiKey = config.apis.langcache.apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<LangCacheResponse<T>> {
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
          cacheHit: response.headers.get('X-Cache-Hit') === 'true',
          ttl: parseInt(response.headers.get('X-Cache-TTL') || '0', 10),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async set(key: string, value: unknown, ttl?: number, tags?: string[]): Promise<LangCacheResponse<void>> {
    return this.request('/cache/set', {
      method: 'POST',
      body: JSON.stringify({
        key,
        value,
        ttl,
        tags,
      }),
    });
  }

  async get<T = unknown>(key: string): Promise<LangCacheResponse<T>> {
    return this.request<T>(`/cache/get/${encodeURIComponent(key)}`);
  }

  async delete(key: string): Promise<LangCacheResponse<void>> {
    return this.request(`/cache/delete/${encodeURIComponent(key)}`, {
      method: 'DELETE',
    });
  }

  async invalidateByTag(tag: string): Promise<LangCacheResponse<void>> {
    return this.request(`/cache/invalidate/tag/${encodeURIComponent(tag)}`, {
      method: 'DELETE',
    });
  }

  async getMultiple<T = unknown>(keys: string[]): Promise<LangCacheResponse<Record<string, T>>> {
    return this.request<Record<string, T>>('/cache/get-multiple', {
      method: 'POST',
      body: JSON.stringify({ keys }),
    });
  }

  async setMultiple(entries: CacheEntry[]): Promise<LangCacheResponse<void>> {
    return this.request('/cache/set-multiple', {
      method: 'POST',
      body: JSON.stringify({ entries }),
    });
  }

  async getStats(): Promise<LangCacheResponse<{
    totalEntries: number;
    totalSize: number;
    hitRate: number;
    uptime: number;
  }>> {
    return this.request('/cache/stats');
  }

  async clear(): Promise<LangCacheResponse<void>> {
    return this.request('/cache/clear', {
      method: 'DELETE',
    });
  }

  // High-level caching methods for the Cyber Warrior Suite
  async cacheIncidentAnalytics(incidentId: string, analytics: unknown, ttl = 3600): Promise<boolean> {
    if (!config.features.enableLangCache || !this.apiKey) {
      return false;
    }

    const response = await this.set(
      `incident:${incidentId}:analytics`,
      analytics,
      ttl,
      ['incidents', 'analytics']
    );

    return response.success;
  }

  async getIncidentAnalytics(incidentId: string): Promise<unknown | null> {
    if (!config.features.enableLangCache || !this.apiKey) {
      return null;
    }

    const response = await this.get(`incident:${incidentId}:analytics`);
    return response.success ? response.data || null : null;
  }

  async cacheAssetTelemetry(assetId: string, telemetry: unknown, ttl = 300): Promise<boolean> {
    if (!config.features.enableLangCache || !this.apiKey) {
      return false;
    }

    const response = await this.set(
      `asset:${assetId}:telemetry`,
      telemetry,
      ttl,
      ['assets', 'telemetry']
    );

    return response.success;
  }

  async getAssetTelemetry(assetId: string): Promise<unknown | null> {
    if (!config.features.enableLangCache || !this.apiKey) {
      return null;
    }

    const response = await this.get(`asset:${assetId}:telemetry`);
    return response.success ? response.data || null : null;
  }

  async invalidateIncidentCache(incidentId: string): Promise<boolean> {
    if (!config.features.enableLangCache || !this.apiKey) {
      return false;
    }

    // Invalidate all cache entries for this incident
    await this.invalidateByTag(`incident:${incidentId}`);

    return true;
  }

  async invalidateAssetCache(assetId: string): Promise<boolean> {
    if (!config.features.enableLangCache || !this.apiKey) {
      return false;
    }

    // Invalidate all cache entries for this asset
    await this.invalidateByTag(`asset:${assetId}`);

    return true;
  }
}

// Export singleton instance
export const langCacheAPI = new LangCacheAPI();
