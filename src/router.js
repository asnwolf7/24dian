import { createRouter, createWebHistory } from 'vue-router';
import Home from './pages/Home.vue';
import Practice from './pages/Practice.vue';
import Contest from './pages/Contest.vue';
import Mistakes from './pages/Mistakes.vue';

// 路由表抽离出来，便于测试复用
export const routes = [
  { path: '/', component: Home },
  { path: '/practice', component: Practice },
  { path: '/contest', component: Contest },
  { path: '/mistakes', component: Mistakes },
];

export function createAppRouter() {
  return createRouter({
    history: createWebHistory(),
    routes,
  });
}
