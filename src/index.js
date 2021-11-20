import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js';
import store from './store.js';


const app = createApp(App);
app
    .use(store)
    .use(router)
app.mount('#app');