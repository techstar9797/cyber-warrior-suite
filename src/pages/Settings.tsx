import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getRules, putRules } from '@/lib/mock';
import { RuleDef } from '@/lib/types';
import { MessageSquare, Table, CheckCircle, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Settings() {
  const [rules, setRules] = useState<RuleDef[]>([]);
  const [rulesJson, setRulesJson] = useState('');
  const [saving, setSaving] = useState(false);
  const [slackStatus, setSlackStatus] = useState<any>(null);

  useEffect(() => {
    getRules().then((data) => {
      setRules(data);
      setRulesJson(JSON.stringify(data, null, 2));
    });
    
    // Check Slack connection status
    fetch('http://localhost:3001/api/slack/status')
      .then(res => res.json())
      .then(data => setSlackStatus(data))
      .catch(() => setSlackStatus({ connected: false }));
  }, []);

  const handleSaveRules = async () => {
    setSaving(true);
    try {
      const parsed = JSON.parse(rulesJson);
      await putRules(parsed);
      setRules(parsed);
      toast({
        title: 'Rules saved',
        description: 'Detection rules have been updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Invalid JSON format',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const isSlackConnected = slackStatus?.connected || false;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-3xl font-bold">Settings</h2>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>Connect external services to enhance your security operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Slack */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      <CardTitle>Slack</CardTitle>
                    </div>
                    {isSlackConnected ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="w-3 h-3 mr-1" />
                        Not connected
                      </Badge>
                    )}
                  </div>
                  <CardDescription>Send incident notifications to Slack channels</CardDescription>
                </CardHeader>
                <CardContent>
                  {isSlackConnected ? (
                    <div className="space-y-2">
                      <p className="text-sm">
                        <strong>Workspace:</strong> {slackStatus.workspace || 'CyberWarrior IIoT'}
                      </p>
                      <p className="text-sm">
                        <strong>Channel:</strong> #ot-soc
                      </p>
                      <p className="text-sm">
                        <strong>User:</strong> {slackStatus.user || 'sachin.news'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Status:</strong> {slackStatus.error ? `Error: ${slackStatus.error}` : 'Connected'}
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <a href="https://app.slack.com/client/T09PGV93SRE/C09NSLFG2GL" target="_blank" rel="noopener noreferrer">
                          Open Slack Channel
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button variant="outline" disabled>
                        Configure Slack
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        {slackStatus?.error ? `Error: ${slackStatus.error}` : 'Set SLACK_ACCESS_TOKEN environment variable to enable'}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Google Sheets */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Table className="w-5 h-5" />
                      <CardTitle>Google Sheets</CardTitle>
                    </div>
                    <Badge variant="secondary">Coming soon</Badge>
                  </div>
                  <CardDescription>Export incidents to Google Sheets for reporting</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" disabled>
                    Configure Sheets
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">Available in Phase 2</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Rules Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Detection Rules</CardTitle>
            <CardDescription>
              Configure rules that trigger alerts based on OT/ICS events. Currently loaded: {rules.length} rules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Rules Preview */}
            <div>
              <h4 className="font-semibold mb-2">Active Rules</h4>
              <div className="space-y-2">
                {rules.map((rule, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      <div className="flex gap-2 mt-1">
                        {rule.actions.map((action, aidx) => (
                          <Badge key={aidx} variant="outline" className="text-xs">
                            {action}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {rule.severity && (
                      <Badge
                        className={
                          rule.severity === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : rule.severity === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {rule.severity}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* JSON Editor */}
            <div>
              <h4 className="font-semibold mb-2">Rules JSON Editor</h4>
              <textarea
                value={rulesJson}
                onChange={(e) => setRulesJson(e.target.value)}
                className="w-full h-96 p-4 font-mono text-sm bg-muted rounded-lg border"
                spellCheck={false}
              />
              <Button onClick={handleSaveRules} disabled={saving} className="mt-2">
                {saving ? 'Saving...' : 'Save Rules'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
