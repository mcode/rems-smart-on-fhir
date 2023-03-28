import { Bundle } from 'fhir/r4';
import CdsHook from './CdsHook';
import {Hook, OrderSignContext, OrderSignHook, SupportedHooks} from './HookTypes'
export default class OrderSign extends CdsHook {
    patientId: string;
    userId: string;
    draftOrders: any;

    constructor(patientId: string, userId: string, draftOrders: Bundle) {
        super(SupportedHooks.ORDER_SIGN);
        this.patientId = patientId;
        this.userId = userId;
        this.draftOrders = draftOrders
    }

    generate(): OrderSignHook {
        return {
            hook: this.hookType,
            hookInstance: this.hookInstance,
            context: this.generateContext(),
            prefetch: {}
        }
    }
    generateContext(): OrderSignContext {
        return {
            userId: this.userId,
            patientId: this.patientId,
            draftOrders: this.draftOrders
            
        }
    }
    
}