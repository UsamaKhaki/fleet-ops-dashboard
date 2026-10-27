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
  type LifeCycles,
} from 'single-spa';
import { MICRO_FRONTENDS, ROUTES } from '../../../tooling/micro-frontends';

// A variable specifier keeps Vite from resolving it; the browser resolves it through the import map.
function loadMicroFrontend(specifier: string): Promise<LifeCycles> {
  return import(/* @vite-ignore */ specifier) as Promise<LifeCycles>;
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
    return `The ${app?.dir ?? name} module failed to load. In dev, check that its server is running${app ? ` on port ${app.port}` : ''}, then reload.`;
  }
  return status === MOUNTED ? null : 'Loading…';
}

function renderRouteStatus() {
  if (!routeStatus) return;
  const message = describeRoute();
  routeStatus.hidden = message === null;
  routeStatus.textContent = message;
}

addErrorHandler((error) => {
  console.error(`[root-config] ${error.appOrParcelName} failed`, error);
  renderRouteStatus();
});
window.addEventListener('single-spa:before-routing-event', renderRouteStatus);
window.addEventListener('single-spa:routing-event', renderRouteStatus);

if (window.location.pathname === '/') {
  window.history.replaceState(null, '', ROUTES[0].path);
}

start({ urlRerouteOnly: true });
