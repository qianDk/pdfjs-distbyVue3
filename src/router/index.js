import { createRouter, createWebHashHistory } from 'vue-router';
import Main from '../main.vue'

const routes = [
    {
        path: '/',
        name: 'main',
        component: Main
    },
    // {
    //     path: '/stocks',
    //     name: 'Stocks',
    //     component: Stocks
    // },
    // {
    //     path: '/demo',
    //     name: 'Demo',
    //     component: TVChartContainer
    // }
];

const router = createRouter({
    history: createWebHashHistory(),
    routes
});

export default router;
