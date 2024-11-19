import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initializeApp } from './init';

const container = document.getElementById('root');
const root = createRoot(container);

// Initialize app
initializeApp().catch(console.error);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
