import { Switch } from '@base-ui/react/switch';

interface SourceToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function SourceToggle({
  enabled,
  onChange,
  disabled = false,
}: SourceToggleProps) {
  return (
    <Switch.Root
      checked={enabled}
      onCheckedChange={onChange}
      disabled={disabled}
      className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-input transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-checked:bg-primary"
    >
      <Switch.Thumb className="pointer-events-none block h-4 w-4 translate-x-0 rounded-full bg-background shadow-sm transition-transform data-checked:translate-x-4" />
    </Switch.Root>
  );
}
