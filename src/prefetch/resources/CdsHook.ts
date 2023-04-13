import { Hook, HookContext, SupportedHooks } from './HookTypes';
import { v4 } from 'uuid';
export default abstract class CdsHook {
  hookType: SupportedHooks;
  hookInstance: string;
  constructor(hookType: SupportedHooks) {
    this.hookType = hookType;
    this.hookInstance = v4();
  }
  abstract generate(): Hook;
  abstract generateContext(): HookContext;
}
