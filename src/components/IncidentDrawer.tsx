import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Incident } from '@/lib/types';
import { SeverityBadge } from './SeverityBadge';
import { VectorTag } from './VectorTag';
import { AssetChip } from './AssetChip';
import { postIncidentToSlack } from '@/lib/composio';
import { toast } from '@/hooks/use-toast';
import { MessageSquare } from 'lucide-react';
import { useState } from 'react';

interface IncidentDrawerProps {
  incident: Incident | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IncidentDrawer({ incident, open, onOpenChange }: IncidentDrawerProps) {
  const [notifying, setNotifying] = useState(false);

  if (!incident) return null;

  const handleNotifySlack = async () => {
    setNotifying(true);
    try {
      const result = await postIncidentToSlack(incident);
      if (result.ok) {
        toast({
          title: 'Slack notification sent',
          description: `Incident ${incident.id} has been posted to #ot-soc`,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send Slack notification',
        variant: 'destructive',
      });
    } finally {
      setNotifying(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <SeverityBadge severity={incident.severity} />
            Incident {incident.id}
          </SheetTitle>
          <SheetDescription>
            <VectorTag vector={incident.vector} />
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="flex gap-2">
            <Button onClick={handleNotifySlack} disabled={notifying} size="sm">
              <MessageSquare className="w-4 h-4 mr-2" />
              {notifying ? 'Notifying...' : 'Notify in Slack'}
            </Button>
          </div>

          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="evidence">Evidence</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Asset</h4>
                <AssetChip
                  name={incident.asset.name}
                  role={incident.asset.role}
                  zone={incident.asset.zone}
                />
                <p className="text-sm text-muted-foreground">IP: {incident.asset.ip}</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Protocol</h4>
                <p className="text-sm">{incident.protocol || 'N/A'}</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Source</h4>
                <p className="text-sm">{incident.source}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">First Seen</h4>
                  <p className="text-sm">{new Date(incident.firstSeen).toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Last Seen</h4>
                  <p className="text-sm">{new Date(incident.lastSeen).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Occurrences</h4>
                <p className="text-sm">{incident.count}</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Status</h4>
                <p className="text-sm capitalize">{incident.status}</p>
              </div>
            </TabsContent>

            <TabsContent value="evidence" className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Raw Details</h4>
                <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
                  {JSON.stringify(incident.details, null, 2)}
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Event Timeline</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                    <div>
                      <p className="font-medium">{new Date(incident.firstSeen).toLocaleString()}</p>
                      <p className="text-muted-foreground">First detection</p>
                    </div>
                  </div>
                  {incident.count > 1 && (
                    <div className="flex items-start gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5" />
                      <div>
                        <p className="font-medium">Multiple occurrences</p>
                        <p className="text-muted-foreground">{incident.count} events detected</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />
                    <div>
                      <p className="font-medium">{new Date(incident.lastSeen).toLocaleString()}</p>
                      <p className="text-muted-foreground">Most recent event</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
