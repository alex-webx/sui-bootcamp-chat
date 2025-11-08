import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [{ 
      path: '', 
      component: () => import('pages/IndexPage.vue')
    }]
  },
  {
    path: '/whatsapp',
    component: () => import('pages/Whatsapp/Index.vue'),
    children: [{
      name: 'chat-room',
      path: '/chat/:user',
      component: () => import('pages/Whatsapp/ChatRoom.vue')
    }]
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
