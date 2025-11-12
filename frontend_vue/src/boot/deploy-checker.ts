import { defineBoot } from '#q-app/wrappers';
import { useAppStore } from '../stores/appStore';

export default defineBoot(async ({ app, router, urlPath, store, redirect }) => {
  const appStore = useAppStore(store);

  const isConfigRoute = router.resolve(urlPath).name === 'config';
  const deployOk = await appStore.checkDeploy();

  if (!isConfigRoute && !deployOk) {
    redirect({ name: 'config' });
  }
});
