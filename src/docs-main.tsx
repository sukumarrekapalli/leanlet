import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Docs from '../app/docs-page';
import '../app/globals.css';
import '../app/docs.css';

createRoot(document.getElementById('root')!).render(<StrictMode><Docs /></StrictMode>);
