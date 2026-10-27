import { createMicroFrontend } from '@fleet/app-runtime';
import { App } from './App';

export const { bootstrap, mount, unmount } = createMicroFrontend({
  title: 'Assets',
  mountPoint: 'app-content',
  App,
});
