import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getIncidents, invalidateCache } from '@/lib/mock';
import { Incident, Severity, Vector, Protocol } from '@/lib/types';
import { SeverityBadge } from '@/components/SeverityBadge';
import { VectorTag } from '@/components/VectorTag';
import { AssetChip } from '@/components/AssetChip';
import { IncidentDrawer } from '@/components/IncidentDrawer';
import { Search, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low'];
const VECTORS: Vector[] = [
  'unauthorized_write',
  'lateral_movement_it_ot',
  'mqtt_anomaly',
  'firmware_change',
  'setpoint_tamper',
  'command_injection',
];

export default function Incidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverities, setSelectedSeverities] = useState<Severity[]>([]);
  const [selectedVectors, setSelectedVectors] = useState<Vector[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadIncidents();
  }, [searchQuery, selectedSeverities, selectedVectors]);

  const loadIncidents = async () => {
    setLoading(true);
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    const data = await getIncidents({
      q: searchQuery || undefined,
      severity: selectedSeverities.length > 0 ? selectedSeverities : undefined,
      vector: selectedVectors.length > 0 ? selectedVectors : undefined,
      _cache: timestamp.toString(), // Bypass cache
    });
    // Sort by lastSeen descending (newest first)
    data.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
    setIncidents(data);
    setLoading(false);
  };

  const toggleSeverity = (severity: Severity) => {
    setSelectedSeverities((prev) =>
      prev.includes(severity) ? prev.filter((s) => s !== severity) : [...prev, severity]
    );
  };

  const toggleVector = (vector: Vector) => {
    setSelectedVectors((prev) => (prev.includes(vector) ? prev.filter((v) => v !== vector) : [...prev, vector]));
  };

  const handleRowClick = (incident: Incident) => {
    setSelectedIncident(incident);
    setDrawerOpen(true);
  };

  const handleRefreshFeed = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('http://localhost:3001/api/ingest/refresh', {
        method: 'POST',
      });
      if (response.ok) {
        console.log('✅ Feed refreshed, invalidating cache...');
        // Clear cache to force fresh data load
        invalidateCache();
        // Reload incidents after refresh
        await loadIncidents();
      }
    } catch (error) {
      console.error('Failed to refresh feed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Incidents</h2>
          <div className="flex gap-2">
            <Button onClick={handleRefreshFeed} disabled={refreshing} variant="default" size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing Feed...' : 'Refresh Feed'}
            </Button>
            <Button onClick={loadIncidents} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Reloading...' : 'Reload'}
            </Button>
            <Badge variant="secondary">{incidents.length} results</Badge>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search incidents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Severity</p>
              <div className="flex flex-wrap gap-2">
                {SEVERITIES.map((severity) => (
                  <Button
                    key={severity}
                    variant={selectedSeverities.includes(severity) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleSeverity(severity)}
                  >
                    {severity}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Attack Vector</p>
              <div className="flex flex-wrap gap-2">
                {VECTORS.map((vector) => (
                  <Button
                    key={vector}
                    variant={selectedVectors.includes(vector) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleVector(vector)}
                  >
                    {vector.replace(/_/g, ' ')}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Incidents Table */}
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : incidents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No incidents found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {incidents.map((incident, index) => (
                  <div
                    key={`incident-${incident.id}-${index}`}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(incident)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <SeverityBadge severity={incident.severity} />
                      <VectorTag vector={incident.vector} />
                      <AssetChip
                        name={incident.asset?.name || 'Unknown Asset'}
                        role={incident.asset?.role || 'unknown'}
                        zone={incident.asset?.zone || 'unknown'}
                        className="flex-1"
                      />
                      {incident.protocol && (
                        <Badge variant="outline" className="font-mono">
                          {incident.protocol}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground ml-4">
                      <p>First: {new Date(incident.firstSeen).toLocaleString()}</p>
                      <p>Count: {incident.count}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <IncidentDrawer incident={selectedIncident} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </Layout>
  );
}
