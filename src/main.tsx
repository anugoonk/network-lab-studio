import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { flushWorkspace } from './store';
import './styles.css';

// flush the debounced autosave when the page is closed or reloaded
window.addEventListener('beforeunload', flushWorkspace);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
