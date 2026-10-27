import { createMicroFrontend } from '@fleet/app-runtime';
import { App } from './App';

export const { bootstrap, mount, unmount } = createMicroFrontend({
  title: 'Shell',
  mountPoint: 'shell',
  App,
});
