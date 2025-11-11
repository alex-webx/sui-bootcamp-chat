import type { RouteRecordRaw } from 'vue-router';
import { useWalletStore } from '../stores/walletStore';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: { name: 'chat' }
    //component: () => import('pages/IndexPage.vue')
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('pages/Login/Index.vue')
  },
  {
    path: '/create-profile',
    name: 'create-profile',
    component: () => import('pages/CreateProfile/Index.vue')
  },
  {
    path: '/chat',
    name: 'chat',
    component: () => import('pages/Chat/Index.vue'),
    meta: { requiresWallet: true, requiresProfile: true }
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
