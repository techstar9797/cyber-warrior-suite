import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAssets } from '@/lib/mock';
import { Asset, OtRole } from '@/lib/types';
import { Search, Cpu, Radio, Monitor, Server, Database, Gauge, PcCase } from 'lucide-react';

const ROLES: OtRole[] = ['PLC', 'RTU', 'HMI', 'Gateway', 'Historian', 'Sensor', 'IPC'];

const roleIcons: Record<OtRole, any> = {
  PLC: Cpu,
  RTU: Radio,
  HMI: Monitor,
  Gateway: Server,
  Historian: Database,
  Sensor: Gauge,
  IPC: PcCase,
};

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<OtRole[]>([]);

  useEffect(() => {
    loadAssets();
  }, [searchQuery, selectedRoles]);

  const loadAssets = async () => {
    setLoading(true);
    const data = await getAssets({
      q: searchQuery || undefined,
      role: selectedRoles.length > 0 ? selectedRoles : undefined,
    });
    setAssets(data);
    setLoading(false);
  };

  const toggleRole = (role: OtRole) => {
    setSelectedRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default:
        return '';
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Asset Inventory</h2>
          <Badge variant="secondary">{assets.length} assets</Badge>
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
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Role</p>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((role) => {
                  const Icon = roleIcons[role];
                  return (
                    <Button
                      key={role}
                      variant={selectedRoles.includes(role) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleRole(role)}
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {role}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assets Grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              <p>No assets found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assets.map((asset) => {
              const Icon = roleIcons[asset.role];
              return (
                <Card key={asset.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{asset.name}</CardTitle>
                          <p className="text-xs text-muted-foreground">{asset.role}</p>
                        </div>
                      </div>
                      <Badge className={getCriticalityColor(asset.criticality)}>{asset.criticality}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Vendor:</span>
                        <span className="font-medium">{asset.vendor || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Model:</span>
                        <span className="font-medium">{asset.model || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IP:</span>
                        <span className="font-mono text-xs">{asset.ip}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Zone:</span>
                        <span className="font-medium text-xs">{asset.zone}</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Protocols</p>
                      <div className="flex flex-wrap gap-1">
                        {asset.protocols.map((protocol) => (
                          <Badge key={protocol} variant="outline" className="text-xs">
                            {protocol}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {asset.telemetry && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-1">Telemetry</p>
                        <div className="flex gap-2 text-xs">
                          {asset.telemetry.tempC && <span>Temp: {asset.telemetry.tempC}°C</span>}
                          {asset.telemetry.pressureKPa && <span>Pressure: {asset.telemetry.pressureKPa}kPa</span>}
                          {asset.telemetry.vibrationMMs && <span>Vib: {asset.telemetry.vibrationMMs}mm/s</span>}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t text-xs text-muted-foreground">
                      Last seen: {new Date(asset.lastSeen).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
