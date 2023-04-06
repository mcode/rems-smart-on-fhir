import { SupportedHooks } from './HookTypes';

export interface CdsService {
  id: string;
  title?: string;
  description: string;
  hook: SupportedHooks;
  prefetch?: ServicePrefetch;
}

export interface ServicePrefetch {
  [key: string]: string;
}
