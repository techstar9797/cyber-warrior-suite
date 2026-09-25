import { useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTopology } from '@/lib/mock';
import { TopologyNode, TopologyEdge } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

const NODE_W = 100;
const NODE_H = 42;

const KIND_STYLE = {
  zone: {
    label: 'Zone',
    from: '#22d3ee',
    to: '#2563eb',
    glow: '#22d3ee',
    chip: 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/40',
  },
  boundary: {
    label: 'Boundary',
    from: '#fb7185',
    to: '#f59e0b',
    glow: '#fb7185',
    chip: 'bg-rose-500/15 text-rose-300 border border-rose-400/40',
  },
  asset: {
    label: 'Asset',
    from: '#34d399',
    to: '#0d9488',
    glow: '#34d399',
    chip: 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/40',
  },
} as const;

type NodeKind = keyof typeof KIND_STYLE;

function kindStyle(kind: string) {
  return KIND_STYLE[(kind as NodeKind)] ?? {
    label: kind,
    from: '#94a3b8',
    to: '#475569',
    glow: '#94a3b8',
    chip: 'bg-slate-500/15 text-slate-300 border border-slate-400/40',
  };
}

export default function Topology() {
  const [topology, setTopology] = useState<{ nodes: TopologyNode[]; edges: TopologyEdge[] } | null>(null);
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    getTopology().then(setTopology);
  }, []);

  const viewBox = useMemo(() => {
    if (!topology?.nodes.length) return '0 0 1000 320';
    const minX = Math.min(...topology.nodes.map((node) => node.x || 0)) - 36;
    const minY = Math.min(...topology.nodes.map((node) => node.y || 0)) - 36;
    const maxX = Math.max(...topology.nodes.map((node) => (node.x || 0) + NODE_W)) + 36;
    const maxY = Math.max(...topology.nodes.map((node) => (node.y || 0) + NODE_H)) + 48;
    return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  }, [topology]);

  if (!topology) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-64 bg-muted rounded-lg" />
          <div className="h-[520px] bg-muted rounded-lg" />
        </div>
      </Layout>
    );
  }

  const activeId = hoveredId || selectedNode?.id;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold">Network Topology</h2>
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-live-ring absolute inline-flex h-full w-full rounded-full bg-cyan-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
              </span>
              Live map
            </span>
          </div>
          <div className="flex gap-2">
            {(Object.keys(KIND_STYLE) as NodeKind[]).map((kind) => (
              <Badge key={kind} className={KIND_STYLE[kind].chip}>
                {KIND_STYLE[kind].label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 animate-rise overflow-hidden">
            <CardHeader>
              <CardTitle>Logical Network Map</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative h-[540px] rounded-xl overflow-hidden border border-white/5 bg-[#05070b]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_80%_70%,rgba(52,211,153,0.12),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(251,113,133,0.1),transparent_30%)]" />
                <svg className="relative h-full w-full" viewBox={viewBox}>
                  <defs>
                    <pattern id="topo-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                      <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
                    </pattern>
                    {(Object.keys(KIND_STYLE) as NodeKind[]).map((kind) => (
                      <linearGradient key={kind} id={`topo-${kind}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={KIND_STYLE[kind].from} />
                        <stop offset="100%" stopColor={KIND_STYLE[kind].to} />
                      </linearGradient>
                    ))}
                    <filter id="topo-glow" x="-40%" y="-40%" width="180%" height="180%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="topo-soft" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.45" />
                    </filter>
                  </defs>

                  <rect x="-200" y="-200" width="2000" height="1200" fill="url(#topo-grid)" />

                  {topology.edges.map((edge, idx) => {
                    const fromNode = topology.nodes.find((node) => node.id === edge.from);
                    const toNode = topology.nodes.find((node) => node.id === edge.to);
                    if (!fromNode || !toNode) return null;

                    const x1 = (fromNode.x || 0) + NODE_W / 2;
                    const y1 = (fromNode.y || 0) + NODE_H / 2;
                    const x2 = (toNode.x || 0) + NODE_W / 2;
                    const y2 = (toNode.y || 0) + NODE_H / 2;
                    const style = kindStyle(fromNode.kind);
                    const related = !activeId || activeId === fromNode.id || activeId === toNode.id;
                    const path = `M ${x1} ${y1} L ${x2} ${y2}`;

                    return (
                      <g key={`edge-${idx}`} opacity={related ? 1 : 0.18} className="transition-opacity duration-300">
                        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={style.glow} strokeWidth="6" strokeOpacity="0.18" />
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={style.from}
                          strokeWidth="2"
                          strokeDasharray="7 9"
                          strokeLinecap="round"
                        >
                          <animate
                            attributeName="stroke-dashoffset"
                            from="0"
                            to="-32"
                            dur={`${1.6 + (idx % 4) * 0.25}s`}
                            repeatCount="indefinite"
                          />
                        </line>
                        <circle r="3.2" fill={style.from} filter="url(#topo-glow)">
                          <animateMotion dur={`${2.2 + (idx % 5) * 0.35}s`} repeatCount="indefinite" path={path} />
                        </circle>
                        {edge.label && (
                          <g>
                            <rect
                              x={(x1 + x2) / 2 - edge.label.length * 3.1 - 6}
                              y={(y1 + y2) / 2 - 16}
                              width={edge.label.length * 6.2 + 12}
                              height="14"
                              rx="7"
                              fill="#0b1220"
                              stroke={style.from}
                              strokeOpacity="0.7"
                            />
                            <text
                              x={(x1 + x2) / 2}
                              y={(y1 + y2) / 2 - 6}
                              fill="#e2e8f0"
                              fontSize="9"
                              textAnchor="middle"
                            >
                              {edge.label}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {topology.nodes.map((node, index) => {
                    const style = kindStyle(node.kind);
                    const selected = selectedNode?.id === node.id;
                    const hovered = hoveredId === node.id;
                    const dimmed = Boolean(activeId) && activeId !== node.id && !topology.edges.some(
                      (edge) =>
                        (edge.from === activeId && edge.to === node.id) ||
                        (edge.to === activeId && edge.from === node.id)
                    );

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x || 0} ${node.y || 0})`}
                        className="cursor-pointer"
                        opacity={dimmed ? 0.35 : 1}
                        onClick={() => setSelectedNode(node)}
                        onMouseEnter={() => setHoveredId(node.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        <g className="topo-pop" style={{ animationDelay: `${index * 45}ms` }}>
                          {(selected || hovered) && (
                            <rect
                              x="-6"
                              y="-6"
                              width={NODE_W + 12}
                              height={NODE_H + 12}
                              rx="14"
                              fill="none"
                              stroke={style.glow}
                              strokeWidth="1.5"
                              opacity="0.8"
                            >
                              <animate attributeName="opacity" values="0.35;0.95;0.35" dur="1.6s" repeatCount="indefinite" />
                            </rect>
                          )}
                          <rect
                            width={NODE_W}
                            height={NODE_H}
                            rx="12"
                            fill={`url(#topo-${node.kind in KIND_STYLE ? node.kind : 'asset'})`}
                            filter={selected || hovered ? 'url(#topo-glow)' : 'url(#topo-soft)'}
                          />
                          <text
                            x={NODE_W / 2}
                            y="26"
                            fill="white"
                            fontSize={node.label.length > 14 ? 10 : 12}
                            textAnchor="middle"
                            fontWeight="600"
                          >
                            {node.label.length > 16 ? `${node.label.slice(0, 15)}…` : node.label}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-rise" style={{ animationDelay: '120ms' }}>
            <CardHeader>
              <CardTitle>Node Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedNode ? (
                <div key={selectedNode.id} className="space-y-4 animate-rise">
                  <div>
                    <p className="text-sm text-muted-foreground">ID</p>
                    <p className="font-medium">{selectedNode.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Label</p>
                    <p className="font-medium">{selectedNode.label}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <Badge className={kindStyle(selectedNode.kind).chip}>{selectedNode.kind}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Connections</p>
                    <div className="space-y-2 mt-2">
                      {topology.edges
                        .filter((edge) => edge.from === selectedNode.id || edge.to === selectedNode.id)
                        .map((edge, idx) => {
                          const outbound = edge.from === selectedNode.id;
                          const otherId = outbound ? edge.to : edge.from;
                          const other = topology.nodes.find((node) => node.id === otherId);
                          return (
                            <button
                              key={`${edge.from}-${edge.to}-${idx}`}
                              type="button"
                              className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm transition-colors hover:bg-white/10"
                              onClick={() => other && setSelectedNode(other)}
                            >
                              <span>
                                {outbound ? '→' : '←'} {other?.label || otherId}
                              </span>
                              {edge.label && <span className="text-xs text-cyan-300">{edge.label}</span>}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="animate-pulse">Click a node to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="animate-rise" style={{ animationDelay: '180ms' }}>
          <CardHeader>
            <CardTitle>Topology Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
                <h4 className="font-semibold text-cyan-300">Zones</h4>
                <p className="text-sm text-muted-foreground">Logical network segments grouping related assets</p>
              </div>
              <div className="space-y-2 rounded-xl border border-rose-400/20 bg-rose-500/5 p-4">
                <h4 className="font-semibold text-rose-300">Boundaries</h4>
                <p className="text-sm text-muted-foreground">IT/OT demarcation points with security controls</p>
              </div>
              <div className="space-y-2 rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                <h4 className="font-semibold text-emerald-300">Assets</h4>
                <p className="text-sm text-muted-foreground">Individual devices (PLCs, RTUs, HMIs, etc.)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
