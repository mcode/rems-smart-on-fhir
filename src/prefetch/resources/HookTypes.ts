import { Bundle, FhirResource } from 'fhir/r4';

export enum SupportedHooks {
  ORDER_SIGN = 'order-sign'
}

export interface FhirAuthorization {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
  subject: string;
}

export interface HookContext {
  [key: string]: string | Bundle | undefined;
}

export interface HookPrefetch {
  [key: string]: FhirResource | object | undefined;
}
export interface Hook {
  hook: SupportedHooks;
  hookInstance: string;
  fhirServer?: URL;
  fhirAuthorization?: FhirAuthorization;
  context: HookContext;
  prefetch?: HookPrefetch;
}

// https://cds-hooks.org/hooks/order-sign/#context
export interface OrderSignContext extends HookContext {
  userId: string;
  patientId: string;
  encounterId?: string;
  draftOrders: Bundle;
}
// https://cds-hooks.hl7.org/1.0/#calling-a-cds-service
export interface OrderSignHook extends Hook {
  hook: SupportedHooks.ORDER_SIGN;
  context: OrderSignContext;
}
