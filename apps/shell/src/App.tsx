import { FAILURE_MODES, getFailureMode, setFailureMode, type FailureMode } from '@fleet/api';
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Toaster,
  cn,
  toast,
} from '@fleet/ui';
import { FlaskConicalIcon, MonitorIcon, MoonIcon, SunIcon, TruckIcon } from 'lucide-react';
import { useState, type MouseEvent } from 'react';
import { ROUTES } from '../../../tooling/micro-frontends';
import { useTheme, type ThemePreference } from './theme';
import { usePathname } from './use-pathname';

const FAILURE_MODE_LABELS: Record<FailureMode, string> = {
  off: 'API: normal',
  mutations: 'API: fail writes',
  all: 'API: fail everything',
};

const THEME_OPTIONS: { value: ThemePreference; label: string; Icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
  { value: 'system', label: 'System', Icon: MonitorIcon },
];

function navigate(event: MouseEvent<HTMLAnchorElement>) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
  event.preventDefault();
  // single-spa patches pushState, so this alone triggers the reroute.
  window.history.pushState(null, '', event.currentTarget.href);
}

export function App() {
  const pathname = usePathname();
  const theme = useTheme();
  const [failureMode, setFailureModeState] = useState(getFailureMode);

  const changeFailureMode = (value: string) => {
    const mode = FAILURE_MODES.find((candidate) => candidate === value) ?? 'off';
    setFailureMode(mode);
    setFailureModeState(mode);
    if (mode !== 'off')
      toast.warning(`${FAILURE_MODE_LABELS[mode]}: the mock server will return 503`);
  };

  const ThemeIcon = theme.resolved === 'dark' ? MoonIcon : SunIcon;

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <a
            href="/assets"
            onClick={navigate}
            className="flex items-center gap-2 whitespace-nowrap font-semibold"
          >
            <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <TruckIcon className="size-4" aria-hidden />
            </span>
            Fleet Ops
          </a>

          <nav aria-label="Main" className="order-last flex w-full gap-1 sm:order-none sm:w-auto">
            {ROUTES.map((route) => {
              const isActive = pathname.startsWith(route.path);
              return (
                <a
                  key={route.path}
                  href={route.path}
                  onClick={navigate}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                    isActive && 'bg-accent text-accent-foreground',
                  )}
                >
                  {route.label}
                </a>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Select value={failureMode} onValueChange={changeFailureMode}>
              <SelectTrigger
                aria-label="Simulate API failures"
                className={cn(
                  'h-8',
                  failureMode !== 'off' && 'border-destructive text-destructive',
                )}
              >
                <FlaskConicalIcon aria-hidden />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {FAILURE_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {FAILURE_MODE_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="size-8" aria-label="Change theme">
                  <ThemeIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Theme</DropdownMenuLabel>
                {THEME_OPTIONS.map(({ value, label, Icon }) => (
                  <DropdownMenuCheckboxItem
                    key={value}
                    checked={theme.preference === value}
                    onCheckedChange={() => theme.setPreference(value)}
                  >
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <Toaster theme={theme.resolved} position="bottom-right" closeButton richColors />
    </>
  );
}
