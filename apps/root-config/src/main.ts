import '@fleet/ui/styles.css';
import {
  LOAD_ERROR,
  MOUNTED,
  SKIP_BECAUSE_BROKEN,
  addErrorHandler,
  checkActivityFunctions,
  getAppStatus,
  registerApplication,
  start,
  triggerAppChange,
  type LifeCycles,
} from 'single-spa';
import { MICRO_FRONTENDS, ROUTES } from '../../../tooling/micro-frontends';

const failedLoads = new Map<string, number>();

/**
 * Loads a micro-frontend through the import map. Browsers remember a failed dynamic import
 * for the life of the page, so a retry asks for the resolved URL with an attempt counter.
 */
async function loadMicroFrontend(specifier: string): Promise<LifeCycles> {
  const attempt = failedLoads.get(specifier) ?? 0;
  const target = attempt === 0 ? specifier : `${import.meta.resolve(specifier)}?attempt=${attempt}`;
  try {
    // A variable specifier keeps Vite from resolving it at build time.
    return (await import(/* @vite-ignore */ target)) as LifeCycles;
  } catch (error) {
    failedLoads.set(specifier, attempt + 1);
    throw error;
  }
}

registerApplication({
  name: '@fleet/shell',
  app: () => loadMicroFrontend('@fleet/shell'),
  activeWhen: () => true,
});

for (const route of ROUTES) {
  registerApplication({
    name: route.app,
    app: () => loadMicroFrontend(route.app),
    activeWhen: route.path,
  });
}

const routeStatus = document.getElementById('route-status');

function activeRouteApp(): string | undefined {
  return checkActivityFunctions(window.location).find((name) => name !== '@fleet/shell');
}

function describeRoute(): string | null {
  const name = activeRouteApp();
  if (!name) return 'Page not found. Pick a section from the menu.';

  const status = getAppStatus(name);
  if (status === LOAD_ERROR || status === SKIP_BECAUSE_BROKEN) {
    const app = MICRO_FRONTENDS.find((entry) => entry.name === name);
    const where = app ? ` on port ${app.port}` : '';
    if (devRetry.pending) return `Waiting for the ${app?.dir ?? name} dev server${where}…`;
    return `The ${app?.dir ?? name} module failed to load. In dev, check that its server is running${where}, then reload.`;
  }
  return status === MOUNTED ? null : 'Loading…';
}

function renderRouteStatus() {
  if (!routeStatus) return;
  const message = describeRoute();
  routeStatus.hidden = message === null;
  routeStatus.textContent = message;
}

// In dev the micro-frontends build for a few seconds after the page server is up, so a
// first load often races them. single-spa retries a LOAD_ERROR app on the next reroute.
const DEV_RETRY_LIMIT = 15;
const devRetry = { attempts: 0, pending: false };

function retryFailedLoadsInDev() {
  if (!import.meta.env.DEV || devRetry.pending || devRetry.attempts >= DEV_RETRY_LIMIT) return;
  devRetry.pending = true;
  devRetry.attempts += 1;
  setTimeout(() => {
    devRetry.pending = false;
    void triggerAppChange();
  }, 2000);
}

addErrorHandler((error) => {
  if (getAppStatus(error.appOrParcelName) === LOAD_ERROR) retryFailedLoadsInDev();
  else console.error(`[root-config] ${error.appOrParcelName} failed`, error);
  renderRouteStatus();
});
window.addEventListener('single-spa:before-routing-event', renderRouteStatus);
window.addEventListener('single-spa:routing-event', renderRouteStatus);

if (window.location.pathname === '/') {
  window.history.replaceState(null, '', ROUTES[0].path);
}

start({ urlRerouteOnly: true });
