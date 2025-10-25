import { Badge } from '@/components/ui/badge';
import { Vector } from '@/lib/types';

interface VectorTagProps {
  vector: Vector;
}

export function VectorTag({ vector }: VectorTagProps) {
  const label = vector.replace(/_/g, ' ');
  
  return (
    <Badge variant="outline" className="font-mono text-xs">
      {label}
    </Badge>
  );
}
