import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js';
import store from './store.js';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/antd.css';

const app = createApp(App);
app
    .use(store).use(Antd)
    .use(router)
app.mount('#app');