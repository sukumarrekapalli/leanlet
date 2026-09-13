import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ApiReference from '../app/api-page';
import '../app/globals.css';
import '../app/docs.css';

createRoot(document.getElementById('root')!).render(<StrictMode><ApiReference /></StrictMode>);
