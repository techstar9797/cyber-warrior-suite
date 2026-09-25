import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { KpiCard } from '@/components/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getDashboardKpis, getIncidents, DashboardKpis, invalidateCache } from '@/lib/mock';
import { Incident } from '@/lib/types';
import { AlertCircle, Activity, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import { SeverityBadge } from '@/components/SeverityBadge';
import { AssetChip } from '@/components/AssetChip';
import { IncidentDrawer } from '@/components/IncidentDrawer';

export default function Overview() {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, [refreshKey]);

  useEffect(() => {
    const id = setInterval(() => {
      invalidateCache();
      setRefreshKey((key) => key + 1);
    }, 10000);
    return () => clearInterval(id);
  }, []);

  const loadDashboardData = async () => {
    const timestamp = Date.now();
    const [kpisData, incidents] = await Promise.all([
      getDashboardKpis(),
      getIncidents({ pageSize: 10, _cache: timestamp.toString() }),
    ]);
    setKpis(kpisData);
    setRecentIncidents(incidents);
  };

  const handleIncidentClick = (incident: Incident) => {
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
        // Reload dashboard data with fresh data
        await loadDashboardData();
        // Force refresh trigger
        setRefreshKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Failed to refresh feed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (!kpis) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const protocolData = Object.entries(kpis.protocolMix)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value,
    }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    color: 'hsl(var(--foreground))',
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header with Refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold">Overview</h2>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-live-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live
            </span>
          </div>
          <Button onClick={handleRefreshFeed} disabled={refreshing} variant="default" size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Feed'}
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="Open Incidents" value={kpis.open} icon={AlertCircle} trend="Requires attention" delay={0} />
          <KpiCard title="Critical Alerts" value={kpis.critical} icon={Activity} trend="High priority" delay={80} />
          <KpiCard title="MTTR" value={`${kpis.mttrMinutes}m`} icon={Clock} trend="Mean Time to Resolve" delay={160} />
          <KpiCard
            title="24h Incidents"
            value={kpis.incidentsPerHour.reduce((sum, h) => sum + h.count, 0)}
            icon={TrendingUp}
            trend="Last 24 hours"
            delay={240}
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-2 animate-rise" style={{ animationDelay: '280ms' }}>
            <CardHeader>
              <CardTitle>Incidents (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={kpis.incidentsPerHour}>
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={2} animationDuration={900} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="animate-rise" style={{ animationDelay: '360ms' }}>
            <CardHeader>
              <CardTitle>Protocol Mix</CardTitle>
            </CardHeader>
            <CardContent>
              {protocolData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-16 text-center">No protocol data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                    <PieChart margin={{ top: 12, right: 28, bottom: 8, left: 28 }}>
                    <Pie
                      data={protocolData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="46%"
                      outerRadius={72}
                      animationDuration={900}
                      labelLine
                      label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
                    >
                      {protocolData.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [value, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Attack Vectors */}
        <Card className="animate-rise" style={{ animationDelay: '440ms' }}>
          <CardHeader>
            <CardTitle>Top Attack Vectors</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                layout="vertical"
                data={kpis.topVectors.map((item) => ({
                  ...item,
                  name: item.vector.replace(/_/g, ' '),
                }))}
                margin={{ top: 8, right: 48, left: 8, bottom: 8 }}
              >
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} unit="%" />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  width={150}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, _name: string, item: { payload?: { count?: number } }) => [
                    `${value}% (${item.payload?.count ?? 0})`,
                    'Share',
                  ]}
                />
                <Bar dataKey="percent" fill="#38bdf8" radius={[0, 8, 8, 0]} animationDuration={900} barSize={18}>
                  <LabelList
                    dataKey="percent"
                    position="right"
                    formatter={(value: number) => `${value}%`}
                    fill="hsl(var(--foreground))"
                    fontSize={12}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Latest Activity */}
        <Card className="animate-rise" style={{ animationDelay: '520ms' }}>
          <CardHeader>
            <CardTitle>Latest OT Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentIncidents.map((incident, index) => (
                <div
                  key={incident.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 hover:-translate-y-0.5 cursor-pointer transition-all duration-200 animate-rise"
                  style={{ animationDelay: `${560 + index * 40}ms` }}
                  onClick={() => handleIncidentClick(incident)}
                >
                  <div className="flex items-center gap-4">
                    <SeverityBadge severity={incident.severity} />
                    <div>
                      <AssetChip name={incident.asset.name} role={incident.asset.role} zone={incident.asset.zone} />
                      <p className="text-sm text-muted-foreground mt-1">{incident.vector.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{new Date(incident.lastSeen).toLocaleTimeString()}</p>
                    <p className="text-xs">Count: {incident.count}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <IncidentDrawer incident={selectedIncident} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </Layout>
  );
}
