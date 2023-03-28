import { Hook, HookPrefetch } from './resources/HookTypes';
import { ServicePrefetch } from './resources/CdsService';
import Client from 'fhirclient/lib/Client';
import { FhirResource } from 'fhir/r4';
function jsonPath(json: any, path: string) {
    // Use a regular expression to find array accessors in the form of "[i]"
    const arrayRegex = /\[(\d+)\]/g;

    // Use the regex to find all the array accessors in the path
    let match;
    while ((match = arrayRegex.exec(path)) !== null) {
        // Get the index of the array element to access
        const index = match[1];

        // Use the index to replace the array accessor in the path with the corresponding property accessor
        path = path.replace(match[0], `.${index}`);
    }

    // Split the path into its individual components
    const pathComponents = path.split('.');

    // Use reduce to iterate over the path components and get the corresponding value from the JSON object
    return pathComponents.reduce((obj, key) => {
        // If the key doesn't exist, return undefined
        if (!obj || !Object.prototype.hasOwnProperty.call(obj, key)) return undefined;

        // Otherwise, return the value at the key
        return obj[key];
    }, json);
}
function replaceTokens(str: string, json: Hook): string {
    // Use a regular expression to find tokens in the form of "{{token}}"
    const tokenRegex = /{{([\w.]+)}}/g;

    // Use the regex to find all the tokens in the string
    let match;
    while ((match = tokenRegex.exec(str)) !== null) {
        // Get the token from the match
        const token = match[1];

        // Use the token to get the corresponding value from the JSON object
        const value = jsonPath(json, token);

        // Replace the token in the original string with the value
        str = str.replace(match[0], value);
    }

    // Return the modified string
    return str;
}
function resolveToken(token: string, client: Client, hook: Hook) {
    const fulfilledToken = replaceTokens(token, hook);
    return client.request(fulfilledToken).then((e) => {
        return e
    })
}
function hydrate(client: Client, template: ServicePrefetch, hook: Hook) {
    // Generally the EHR should define the prefetch requests it will/won't 
    // fulfill, but in this case we can just attempt to fill everything
    // we can.
    let prefetch: HookPrefetch = {}
    if(hook.prefetch){
        prefetch = hook.prefetch;
    }
    const promises = Object.keys(template).map(key => {
        if (!Object.prototype.hasOwnProperty.call(prefetch, key)) {
            // prefetch was not fulfilled
            return resolveToken(template[key], client, hook).then((data: FhirResource) => {
                Object.assign(prefetch, { [key]: data });
            });
        } else {
            return undefined
        }
    });

    return Promise.all(promises).then(() => prefetch);
}
export { hydrate };
