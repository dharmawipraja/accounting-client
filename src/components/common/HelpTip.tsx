import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/** A small "what's this?" affordance: an accessible icon that reveals a short
 *  plain-language explanation of a domain term on hover/focus. Self-provides its
 *  TooltipProvider so it works anywhere (including in isolation). */
export function HelpTip({ label, text }: { label: string; text: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className="inline-flex rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <HelpCircle className="size-3.5" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-pretty">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
