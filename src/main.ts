import { createApp } from 'vue';
import App from './App.vue';
import { initializeStores, pinia } from './store';
import { migrateLegacyStorageKeys } from './store/plugins/legacyStorageKeys';
import { applyTheme, useThemeStore } from './store/themeStore';
import itemIconGrid from './assets/item-icon-grid.json';
// Ashen's typefaces, bundled so the installed PWA doesn't depend on a font CDN.
import '@fontsource/cinzel/500.css';
import '@fontsource/cinzel/600.css';
import '@fontsource/alegreya/500.css';
import '@fontsource/alegreya/600.css';
import '@fontsource/alegreya/700.css';
import '@fontsource/alegreya-sans/500.css';
import '@fontsource/alegreya-sans/700.css';
import './style.css';
import './assets/scss/main.scss';
import './assets/scss/themes/index.scss';

migrateLegacyStorageKeys();
// The grid the item icons were built at picks their sizes (see main.scss).
document.documentElement.dataset.itemGrid = String(itemIconGrid.grid);

const app = createApp(App);

app.use(pinia);
const themeStore = useThemeStore();
applyTheme(themeStore.theme);
themeStore.followSystem();
initializeStores();

app.mount('#app');
