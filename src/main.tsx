import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { shareFragmentOf } from './core/share';
import { flushWorkspace, useStore } from './store';
import './styles.css';

// flush the debounced autosave when the page is closed or reloaded. The browser's "leave site?" prompt is shown
// only when autosave is NOT working and there are edits that were never exported — otherwise the work is safe.
window.addEventListener('beforeunload', (e) => {
  flushWorkspace();
  const s = useStore.getState();
  if (!s.autosaveOk && s.isDirty()) {
    e.preventDefault();
    e.returnValue = '';
  }
});
// find out right away (not at the first edit) whether the browser lets us store anything
flushWorkspace();

// a share link (`#lab=…`) opens as a new Lab; the fragment is removed so a reload does not add it again
const sharedFragment = shareFragmentOf(window.location.hash);
if (sharedFragment) {
  history.replaceState(null, '', window.location.pathname + window.location.search);
  void useStore.getState().openShared(sharedFragment);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
