import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Search() {
  const [query, setQuery] = useState('');

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-3xl font-bold">Unified Search</h2>

        <Card>
          <CardHeader>
            <CardTitle>Search across incidents and assets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search for incidents, assets, IP addresses, zones..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 text-lg h-12"
              />
            </div>

            <div className="flex gap-2">
              <Badge variant="outline">incidents</Badge>
              <Badge variant="outline">assets</Badge>
              <Badge variant="outline">protocols</Badge>
              <Badge variant="outline">zones</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Enter a search query to find relevant incidents and assets</p>
            <p className="text-sm mt-2">Try searching for asset names, IP addresses, zones, or attack vectors</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
