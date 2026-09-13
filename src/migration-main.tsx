import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import MigrationGuide from '../app/migration-page';
import '../app/globals.css';
import '../app/docs.css';

createRoot(document.getElementById('root')!).render(<StrictMode><MigrationGuide /></StrictMode>);
