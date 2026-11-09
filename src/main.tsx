import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { saveStored } from './core/persist';
import { useStore } from './store';
import './styles.css';

// flush the debounced autosave when the page is closed or reloaded
window.addEventListener('beforeunload', () => {
  const s = useStore.getState();
  saveStored({ lab: s.lab, savedSig: s.savedSig });
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
