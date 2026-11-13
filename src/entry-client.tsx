import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';
import { normalizePath } from './routes';
import './index.css';

const container = document.getElementById('root')!;
// La page 404 est pré-rendue sous /404.html : on la reconnaît à son marqueur.
const path = container.dataset.notFound === 'true' ? null : normalizePath(window.location.pathname);
const app = (
  <StrictMode>
    <App path={path} />
  </StrictMode>
);

if (container.hasChildNodes()) hydrateRoot(container, app);
else createRoot(container).render(app);
