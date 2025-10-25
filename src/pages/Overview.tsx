import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { KpiCard } from '@/components/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardKpis, getIncidents, DashboardKpis } from '@/lib/mock';
import { Incident } from '@/lib/types';
import { AlertCircle, Activity, Clock, TrendingUp } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { SeverityBadge } from '@/components/SeverityBadge';
import { AssetChip } from '@/components/AssetChip';
import { IncidentDrawer } from '@/components/IncidentDrawer';

export default function Overview() {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    Promise.all([getDashboardKpis(), getIncidents({ pageSize: 10 })]).then(([kpisData, incidents]) => {
      setKpis(kpisData);
      setRecentIncidents(incidents);
    });
  }, []);

  const handleIncidentClick = (incident: Incident) => {
    setSelectedIncident(incident);
    setDrawerOpen(true);
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

  const protocolData = Object.entries(kpis.protocolMix).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="Open Incidents" value={kpis.open} icon={AlertCircle} trend="Requires attention" />
          <KpiCard title="Critical Alerts" value={kpis.critical} icon={Activity} trend="High priority" />
          <KpiCard title="MTTR" value={`${kpis.mttrMinutes}m`} icon={Clock} trend="Mean Time to Resolve" />
          <KpiCard
            title="24h Incidents"
            value={kpis.incidentsPerHour.reduce((sum, h) => sum + h.count, 0)}
            icon={TrendingUp}
            trend="Last 24 hours"
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Incidents (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={kpis.incidentsPerHour}>
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Protocol Mix</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={protocolData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                    {protocolData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Attack Vectors */}
        <Card>
          <CardHeader>
            <CardTitle>Top Attack Vectors</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={kpis.topVectors}>
                <XAxis dataKey="vector" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Latest Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Latest OT Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
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
