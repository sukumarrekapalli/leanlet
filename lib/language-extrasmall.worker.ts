/// <reference lib="webworker" />
import { eld } from 'eld/extrasmall';
import { installLanguageWorker } from './language-worker-runtime.ts';
installLanguageWorker('eld-extrasmall', eld);
