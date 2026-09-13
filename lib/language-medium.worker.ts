/// <reference lib="webworker" />
import { eld } from 'eld/medium';
import { installLanguageWorker } from './language-worker-runtime.ts';
installLanguageWorker('eld-medium', eld);
