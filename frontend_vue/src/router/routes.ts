import type { RouteRecordRaw } from 'vue-router';
import { useWalletStore } from '../stores/walletStore';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: { name: 'chat' }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('pages/Login/Index.vue')
  },
  {
    path: '/create-profile',
    name: 'create-profile',
    component: () => import('pages/CreateProfile/Index.vue'),
    meta: { requiresWallet: true }
  },
  {
    path: '/chat',
    name: 'chat',
    component: () => import('pages/Chat/Index.vue'),
    meta: { requiresWallet: true, requiresProfile: true }
  },
  {
    path: '/config',
    name: 'config',
    component: () => import('../ChangeEnvironment.vue')
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    // component: () => import('pages/ErrorNotFound.vue'),
    redirect: '/'
  },
];

export default routes;
