/// <reference lib="webworker" />
import { eld } from 'eld/large';
import { installLanguageWorker } from './language-worker-runtime.ts';
installLanguageWorker('eld-large', eld);
