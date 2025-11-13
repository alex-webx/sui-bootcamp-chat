import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: { name: 'login' }
    // component: () => import('pages/IndexPage.vue'),
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

  {
    path: '/playground',
    name: 'playground',
    component: () => import('../Playground.vue')
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/IndexPage.vue'),
  },
];

export default routes;
