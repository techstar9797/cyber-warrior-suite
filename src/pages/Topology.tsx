import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTopology } from '@/lib/mock';
import { TopologyNode, TopologyEdge } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export default function Topology() {
  const [topology, setTopology] = useState<{ nodes: TopologyNode[]; edges: TopologyEdge[] } | null>(null);
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);

  useEffect(() => {
    getTopology().then(setTopology);
  }, []);

  if (!topology) {
    return (
      <Layout>
        <div className="animate-pulse">
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </Layout>
    );
  }

  const getNodeColor = (kind: string) => {
    switch (kind) {
      case 'zone':
        return 'bg-blue-500';
      case 'boundary':
        return 'bg-red-500';
      case 'asset':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Network Topology</h2>
          <div className="flex gap-2">
            <Badge className="bg-blue-500">Zone</Badge>
            <Badge className="bg-red-500">Boundary</Badge>
            <Badge className="bg-green-500">Asset</Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Topology Visualization */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Logical Network Map</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative h-[500px] bg-muted/20 rounded-lg overflow-auto">
                <svg className="w-full h-full">
                  {/* Draw edges */}
                  {topology.edges.map((edge, idx) => {
                    const fromNode = topology.nodes.find((n) => n.id === edge.from);
                    const toNode = topology.nodes.find((n) => n.id === edge.to);
                    if (!fromNode || !toNode) return null;

                    const x1 = (fromNode.x || 0) + 50;
                    const y1 = (fromNode.y || 0) + 20;
                    const x2 = (toNode.x || 0) + 50;
                    const y2 = (toNode.y || 0) + 20;

                    return (
                      <g key={`edge-${idx}`}>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="hsl(var(--border))"
                          strokeWidth="2"
                          strokeDasharray={fromNode.kind === 'boundary' ? '5,5' : undefined}
                        />
                        {edge.label && (
                          <text
                            x={(x1 + x2) / 2}
                            y={(y1 + y2) / 2}
                            fill="hsl(var(--muted-foreground))"
                            fontSize="10"
                            textAnchor="middle"
                          >
                            {edge.label}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* Draw nodes */}
                  {topology.nodes.map((node) => (
                    <g
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className="cursor-pointer"
                      style={{ transform: `translate(${node.x || 0}px, ${node.y || 0}px)` }}
                    >
                      <rect
                        width="100"
                        height="40"
                        rx="8"
                        className={`${getNodeColor(node.kind)} ${
                          selectedNode?.id === node.id ? 'opacity-100' : 'opacity-70'
                        } hover:opacity-100 transition-opacity`}
                      />
                      <text x="50" y="25" fill="white" fontSize="12" textAnchor="middle" fontWeight="bold">
                        {node.label}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </CardContent>
          </Card>

          {/* Node Details */}
          <Card>
            <CardHeader>
              <CardTitle>Node Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedNode ? (
                <div className="space-y-4">
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
                    <Badge className={getNodeColor(selectedNode.kind)}>{selectedNode.kind}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Connections</p>
                    <div className="space-y-1 mt-2">
                      {topology.edges
                        .filter((e) => e.from === selectedNode.id || e.to === selectedNode.id)
                        .map((edge, idx) => (
                          <div key={idx} className="text-sm">
                            {edge.from === selectedNode.id ? '→' : '←'}{' '}
                            {edge.from === selectedNode.id ? edge.to : edge.from}
                            {edge.label && <span className="text-muted-foreground ml-2">({edge.label})</span>}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Click a node to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Legend */}
        <Card>
          <CardHeader>
            <CardTitle>Topology Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <h4 className="font-semibold">Zones</h4>
                <p className="text-sm text-muted-foreground">Logical network segments grouping related assets</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Boundaries</h4>
                <p className="text-sm text-muted-foreground">IT/OT demarcation points with security controls</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Assets</h4>
                <p className="text-sm text-muted-foreground">Individual devices (PLCs, RTUs, HMIs, etc.)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
