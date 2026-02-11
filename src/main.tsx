import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from '@/context/AuthContext';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  registerSW({
    onNeedRefresh() {
      if (confirm('גרסה חדשה זמינה! לרענן את האפליקציה?')) {
        window.location.reload();
      }
    },
    onOfflineReady() {
      console.log('האפליקציה מוכנה לעבודה אופליין');
    },
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
