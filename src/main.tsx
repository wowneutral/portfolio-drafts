import { createRoot } from 'react-dom/client';
import './index.css';
import { ALL } from './registry';
import App from './App';

// ?v=7 opens version 7 directly (the link to share). Version 1 lives outside the app.
const v = Number(new URLSearchParams(location.search).get('v'));
const target = v ? ALL.find((x) => x.n === v) : undefined;
if (target?.href) location.replace(target.href);
else {
  if (target) {
    const route = '/' + target.slug;
    if (import.meta.env.VITE_HASH) history.replaceState(null, '', location.pathname + '#' + route);
    else history.replaceState(null, '', route);
  }
  createRoot(document.getElementById('root')!).render(<App />);
}
