/// <reference lib="webworker" />
import { eld } from 'eld/small';
import { installLanguageWorker } from './language-worker-runtime.ts';
installLanguageWorker('eld-small', eld);
