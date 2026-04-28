import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'positive' | 'negative' | 'neutral' | 'bullish' | 'bearish';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        {
          'bg-zinc-800 text-zinc-300': variant === 'default',
          'bg-emerald-500/20 text-emerald-400': variant === 'positive' || variant === 'bullish',
          'bg-red-500/20 text-red-400': variant === 'negative' || variant === 'bearish',
          'bg-zinc-700/50 text-zinc-400': variant === 'neutral',
        },
        className
      )}
    >
      {children}
    </span>
  );
}
