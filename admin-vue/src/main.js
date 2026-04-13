import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import '@/styles/base.css';
import '@/styles/global.css';
import '@/styles/official-site-tailwind.css';
import App from './App.vue';
import router from './router';

const app = createApp(App);
app.use(router);
app.use(ElementPlus);
app.mount('#app');
