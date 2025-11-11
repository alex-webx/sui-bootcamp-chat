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

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(function ({ store }) {
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
    const walletStore = useWalletStore(store);
    const userStore = useUserStore();
    await walletStore.detectWallets();
    await walletStore.autoConnect();
    await userStore.fetchCurrentUserProfile();

    if (to.name === 'login' && walletStore.isConnected) {
      next({ name: 'chat' });
    } else if (to.meta.requiresWallet && !walletStore.isConnected) {
      next({ name: 'login' });
    } else if (to.name === 'create-profile' && userStore.profile?.id) {
      next({ name: 'chat' });
    } else if (to.meta.requiresProfile && !userStore.profile?.id) {
      next({ name: 'create-profile' });
    } else {
      next();
    }
  });

  return Router;
});
