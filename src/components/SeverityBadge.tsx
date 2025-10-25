import { Badge } from '@/components/ui/badge';
import { Severity } from '@/lib/types';

interface SeverityBadgeProps {
  severity: Severity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const variants: Record<Severity, { className: string; emoji: string }> = {
    critical: { className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', emoji: '🔴' },
    high: { className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', emoji: '🟠' },
    medium: { className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', emoji: '🟡' },
    low: { className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', emoji: '⚪' },
  };

  const { className, emoji } = variants[severity];

  return (
    <Badge className={className}>
      <span className="mr-1">{emoji}</span>
      {severity.toUpperCase()}
    </Badge>
  );
}
