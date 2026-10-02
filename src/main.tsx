import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Polyfill for crypto.randomUUID in insecure contexts (HTTP)
if (typeof window !== 'undefined' && !window.crypto.randomUUID) {
  
  window.crypto.randomUUID = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }) as `${string}-${string}-${string}-${string}-${string}`;
  };
}

createRoot(document.getElementById("root")!).render(<App />);
