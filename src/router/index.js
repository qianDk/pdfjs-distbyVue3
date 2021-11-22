import { createRouter, createWebHashHistory } from 'vue-router';
import Main from '../main.vue'

const routes = [
    {
        path: '/',
        name: 'main',
        component: Main
    },
];

const router = createRouter({
    history: createWebHashHistory(),
    routes
});

export default router;
