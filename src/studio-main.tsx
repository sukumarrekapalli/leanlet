import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import SafeShareStudio from '../app/studio-page';
import '../app/globals.css';
import '../app/studio.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SafeShareStudio />
  </StrictMode>,
);
