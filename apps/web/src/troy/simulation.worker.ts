import { simulate } from './engine';
import type { Config } from './types';
self.onmessage = (event: MessageEvent<Config>) => {
  try { self.postMessage({ result: simulate(event.data) }); }
  catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'Simulation failed.' }); }
};
