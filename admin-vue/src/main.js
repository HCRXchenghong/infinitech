import { createApp } from 'vue';
import '@/styles/base.css';
import '@/styles/global.css';
import '@/styles/official-site-tailwind.css';
import App from './App.vue';
import router from './router';

const app = createApp(App);
app.use(router);
app.mount('#app');
