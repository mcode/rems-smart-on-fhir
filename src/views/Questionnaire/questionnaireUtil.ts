import { Extension } from "fhir/r4";
interface MyObject {
    [key: string]: any;
  }
// to get FHIR properties of the form answer{whatever}
export function findValueByPrefix(object: MyObject, prefix: string) {
    for (var property in object) {
        if (object.hasOwnProperty(property) && 
            property.toString().startsWith(prefix)) {
            return object[property];
        }
    }
}
