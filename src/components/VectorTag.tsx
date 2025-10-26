import { Badge } from '@/components/ui/badge';
import { Vector } from '@/lib/types';

interface VectorTagProps {
  vector: Vector | undefined;
}

export function VectorTag({ vector }: VectorTagProps) {
  // Handle undefined or invalid vector values
  const validVector = vector || 'unknown';
  const label = validVector.replace(/_/g, ' ');
  
  return (
    <Badge variant="outline" className="font-mono text-xs">
      {label}
    </Badge>
  );
}
