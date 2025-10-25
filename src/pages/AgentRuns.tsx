import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AgentRun } from '@/lib/types';
import { Bot, CheckCircle, Clock, XCircle, Activity } from 'lucide-react';

export default function AgentRuns() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgentRuns();
    // Refresh every 5 seconds to show new runs
    const interval = setInterval(loadAgentRuns, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadAgentRuns() {
    try {
      // Call backend API to get agent runs
      const response = await fetch('http://localhost:3001/api/agent-runs');
      if (response.ok) {
        const data = await response.json();
        setRuns(data);
      }
    } catch (error) {
      console.warn('Agent runs API not available:', error);
    } finally {
      setLoading(false);
    }
  }

  function getOutcomeBadge(outcome: string) {
    switch (outcome) {
      case 'mitigated':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Mitigated
          </Badge>
        );
      case 'escalated':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Activity className="w-3 h-3 mr-1" />
            Escalated
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  }

  function getAgentIcon(agentId: string) {
    const icons: Record<string, string> = {
      'Detector': '🔍',
      'Planner': '📋',
      'Executor': '⚡',
      'agent-detector-ot': '🔍',
      'agent-detector-netflow': '🌐',
      'agent-detector-ids': '🛡️',
      'agent-detector-suricata': '🛡️',
      'agent-detector-threatfeed': '🔗',
      'agent-detector-threatintel': '🔗',
      'agent-detector-iot23': '📡',
    };
    return icons[agentId] || '🤖';
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Agent Runs</h2>
          <Badge variant="outline" className="font-mono">
            Live
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Agent Activity Timeline</CardTitle>
            <CardDescription>
              Track which agents performed which actions for each incident
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : runs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No agent runs yet</p>
                <p className="text-sm mt-2">Start the ingestor to see agent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {runs.map((run) => (
                  <Card key={run.id} className="border-l-4 border-l-primary">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bot className="w-5 h-5" />
                          <CardTitle className="text-lg">Run {run.id}</CardTitle>
                        </div>
                        {getOutcomeBadge(run.outcome)}
                      </div>
                      <CardDescription>
                        Incident: {run.incidentId} • Started: {new Date(run.startedAt).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Agents involved */}
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold mb-2">Agents Involved</h4>
                        <div className="flex gap-2 flex-wrap">
                          {run.agents.map((agent, idx) => (
                            <Badge key={idx} variant="outline" className="gap-1">
                              <span>{getAgentIcon(agent)}</span>
                              {agent}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Timeline of steps */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold">Timeline</h4>
                        {run.steps.map((step, idx) => (
                          <div key={step.id} className="relative pl-8 border-l-2 border-muted">
                            <div className="absolute -left-3 top-0">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                                {getAgentIcon(step.agentId)}
                              </div>
                            </div>
                            <div className="pb-4">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{step.agentId}</span>
                                <Badge variant="outline" className="text-xs">
                                  {step.type}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(step.ts).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{step.summary}</p>
                              
                              {/* Tool calls */}
                              {step.toolCalls && step.toolCalls.length > 0 && (
                                <div className="ml-4 space-y-1">
                                  {step.toolCalls.map((toolCall) => (
                                    <div key={toolCall.id} className="text-xs bg-muted/50 rounded px-2 py-1">
                                      <span className="font-mono">{toolCall.tool}</span>
                                      <span className="text-muted-foreground">.</span>
                                      <span className="font-mono">{toolCall.action}</span>
                                      <span className="text-muted-foreground ml-2">
                                        ({toolCall.argsPreview})
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className={`ml-2 text-xs ${
                                          toolCall.status === 'success'
                                            ? 'bg-green-100 text-green-800'
                                            : toolCall.status === 'error'
                                            ? 'bg-red-100 text-red-800'
                                            : ''
                                        }`}
                                      >
                                        {toolCall.status}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
