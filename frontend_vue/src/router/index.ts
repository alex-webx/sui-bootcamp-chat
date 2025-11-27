import { defineRouter } from '#q-app/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';
import { useWalletStore } from '../stores/walletStore';
import { useUserStore } from '../stores/userStore';
import { useAppStore } from '../stores/appStore';

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(async ({ store }) => {
  // const createHistory = process.env.SERVER
  //   ? createMemoryHistory
  //   : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory);
  const createHistory = createWebHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  Router.beforeEach(async (to, from, next) => {
    console.log(`[router.beforeEach:${String(from.name || '-')}:${String(to.name)}]`);

    const appStore = useAppStore(store);
    const walletStore = useWalletStore(store);
    const userStore = useUserStore(store);

    try {

      const isConfigRoute = to.name === 'config';
      if (!isConfigRoute) {
        const deployOk = await appStore.checkDeploy();
        if (!deployOk) {
          console.log(`[router] deployNOK`);
          next({ name: 'config' });
          return;
        }
      }

      await walletStore.autoConnect();
      await userStore.fetchCurrentUserProfile();

      const { requiresWallet, requiresProfile } = to.meta;
      const isConnected = walletStore.isConnected;
      const hasProfile = userStore.profile?.owner === walletStore.address;

      if (requiresWallet && !isConnected && to.name !== 'login') {
        next({ name: 'login' });
        return;
      }

      if (to.name !== 'create-profile' && requiresProfile && !hasProfile && isConnected) {
        next({ name: 'create-profile' });
        return;
      }

      if ((to.name === 'login' || to.name === 'create-profile') && isConnected && hasProfile) {
        next({ name: 'chat' });
        return;
      }

      if (to.name === 'login' && isConnected && !hasProfile) {
        next({ name: 'create-profile' });
        return;
      }

      if (to.name === 'chat') {
        try {
          const hasPK = !!await userStore.ensurePrivateKey();
          if (!hasPK) {
            await appStore.resetState();
            next({ name: 'login' });
          }
        } catch {
          next({ name: 'login' });
          return;
        }
      }

      next();
      return;
    } catch (ex) {
      console.log(`[router] catch`, ex);
      appStore.resetState();
      next({ name: 'config' });
      return;
    }
  });

  return Router;
});
