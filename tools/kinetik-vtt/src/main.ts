import './themes/base.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { applyTheme, theme } from './lib/theme.svelte';

applyTheme(theme.current);
mount(App, { target: document.getElementById('app')! });

// Offline-Fähigkeit nur in der veröffentlichten App (im Entwicklungsserver stört ein Service Worker).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => { /* ohne Offline-Cache weiterarbeiten */ });
  });
}
