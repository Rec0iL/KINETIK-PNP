import './themes/base.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { applyTheme, theme } from './lib/theme.svelte';

applyTheme(theme.current);
mount(App, { target: document.getElementById('app')! });
