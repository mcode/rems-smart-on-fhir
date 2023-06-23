import Client from "fhirclient/lib/Client";
import { LogType, OrderResource } from "../SmartApp";
import { Bundle, FhirResource } from "fhir/r4";
interface Queries {
    [key:string]: string
}
function doSearch(smart: Client, type: string, fhirVersion: string, request: OrderResource, callback: (n: FhirResource[] | null, e?: Error) => void) {
  const q: Queries = {};
  let usePatient = true;
  // setup the query for Practitioner and Coverage
  // TODO - handle other resource not associated with Patient? 
  switch (type) {
    case "PractitionerRole":
    case "Practitioner":
      let performer;
      if (request.resourceType === "DeviceRequest") {
        performer = request.performer && request.performer.reference;
      } else if (request.resourceType === "ServiceRequest") {
        performer = request.performer?.[0] && request.performer[0].reference;
      } else if (request.resourceType === "MedicationRequest") {
        performer = request.requester && request.requester.reference;
      } else if (request.resourceType === "MedicationDispense") {
        performer = request.performer?.[0] && request.performer[0].actor.reference;
      }

      q._id = performer ? performer : "";
      if (type === "PractitionerRole") {
        smart.request(`PractitionerRole?practitioner=${performer}`, {resolveReferences: ["location", "organization"], flat: true, graph:false}).then((result) => {
          console.log(result);
          let finalResult = []
          if(result && result.data){
            finalResult.push(result.data[0])
            if(result.references) {
              Object.keys(result.references).forEach((e)=>{
                finalResult.push(result.references[e])
              })
              }
            callback(finalResult);
            }
        })
      } else if(performer) {
        if( performer.includes("PractitionerRole")){
          q._id = ""; // Not implemented 
        } else if( performer.includes("Practitioner")) {
          q._id = performer.split("/")[1];
        }
        smart.request(performer,{resolveReferences:"practitioner",flat:true}).then((result)=>{
            if(result && result.practitioner) {
                request.performer = {"reference": "Practitioner/" + result.practitioner.id};
              callback([result.practitioner]);
            }

        });
      }

      usePatient = false;
      console.log(q._id);
      break;
    case "Coverage":
      switch (fhirVersion.toUpperCase()) {
        case "STU3":
          if (request.extension) {
            if (request.extension.length > 0) {
              q._id =
                (request.extension[0] &&
                request.extension[0].valueReference &&
                request.extension[0].valueReference.reference) || "";
              console.log(q._id);
            } else {
              console.log("No extension/coverage found!");
            }
          }
          break;
        case "R4":
          if ((request.resourceType === "DeviceRequest" || request.resourceType === "MedicationRequest" || request.resourceType === "ServiceRequest") && request.insurance) {
            if (request.insurance.length > 0) {
              q._id = request.insurance[0] && request.insurance[0].reference || "";
              console.log(q._id);
            } else {
              console.log("No insurance/coverage found!");
            }
          }
          break;
        default:
          // unknown version
          break;
      }
      break;
    case "MedicationStatement":
      smart.request(`${type}?patient=${smart.patient.id}`, {resolveReferences: 'medicationReference', flat: true, graph: false}).then((result) =>{
        let finalResult: FhirResource[] = []
        // TODO: This system should be untangled, reference resolution and resource gathering shouldn't be done separately 
        if(result && result.data){
          if(result.references) {
            Object.keys(result.references).forEach((e)=>{
              finalResult.push(result.references[e])
            })
          }
          callback(finalResult);
        }
      })
      break;
  }

  // If this is for Epic, there are some specific modifications needed for the queries to work properly
  if (
    process.env.REACT_APP_EPIC_SUPPORTED_QUERIES &&
    process.env.REACT_APP_EPIC_SUPPORTED_QUERIES.toLowerCase() === "true"
  ) {
    switch (type) {
      case "Observation":
        // Epic requires you to specify a category or code search parameter, so search on all categories
        q.category = [
          "social-history",
          "vital-signs",
          "imaging",
          "laboratory",
          "procedure",
          "survey",
          "exam",
          "therapy"
        ].join(",");
        break;
      case "MedicationOrder":
        // Epic returns only active meds by default, so we need to specifically ask for other types
        q.status = [
          "active",
          "completed",
          "stopped",
          "on-hold",
          "draft",
          "entered-in-error"
        ].join(",");
        break;
      case "MedicationStatement":
        // Epic returns only active meds by default, so we need to specifically ask for other types
        q.status = ["active", "completed", "intended", "entered-in-error"].join(
          ","
        );
        break;
      default:
      //nothing
    }
  }
  const query = new URLSearchParams();
  Object.keys(q).forEach((parameter)=>{
      query.set(parameter, q[parameter]);
  });

  if( usePatient ) {
    smart.request(`${type}?patient=${smart.patient.id}&${query}`)
    .then(processSuccess(smart, [], callback), processError(smart, callback));
  } else if(q._id){
    smart.request(`${type}?${query}`)
    .then(processSuccess(smart, [], callback), processError(smart, callback));   
  }

}

function processSuccess(smart: Client, resources: FhirResource[], callback: (n: FhirResource[] | null, e?: Error) => void) {
  return (response: FhirResource) => {
    if (response && response.resourceType === "Bundle") {
      if (response.entry) {
        response.entry.forEach(function(e) {
            if(e.resource){
              resources.push(e.resource);
            }
        });
      }
      if (
        response.link &&
        response.link.some(l => l.relation === "next" && l.url != null)
      ) {
        // There is a next page, so recursively process that before we do the callback
        const requestUrl = response.link.find((e)=>{e.relation==="next";})
        if(requestUrl){
            smart.request(requestUrl)
                .then(processSuccess(smart, resources, callback), processError(smart, callback));
        }
      } else {
        callback(resources);
      }
    } else {
      callback(null, new Error("Failed to parse response"));
    }
  };
}

function processError(smart: Client, callback: (n: FhirResource[] | null, e?: Error) => void) {
  return (error: Error) => {
    callback(null, error);
  };
}

function buildPopulatedResourceBundle(
  smart: Client,
  neededResources: string[],
  fhirVersion: string,
  request: OrderResource,
  consoleLog: (a: string, b: LogType, c?: string | null) => void
) {
  return new Promise<Bundle>(function(resolve, reject) {
    console.log("waiting for patient");
    consoleLog("waiting for patient", "infoClass");
    if(smart.patient.id){
        consoleLog(smart.patient.id, "infoClass");
    }
    smart.patient.read().then(
      pt => {
        console.log("got pt", pt);
        consoleLog("got pt:" + pt, "infoClass");
        const entryResources: FhirResource[] = [pt];
        const readResources = (neededResources: string[], callback: () => void) => {
          const r = neededResources.pop();
          if (r == null) {
            callback();
          } else if (r === "Patient") {
            readResources(neededResources, callback);
          } else {
            doSearch(smart, r, fhirVersion, request, (results, error) => {
              if (results) {
                entryResources.push(...results);
              }
              if (error) {
                if(error.message.includes("OperationOutcome")) {
                    let splitError = error.message.split("{");
                    splitError[0] = "";
                    const newError = splitError.join("{");
                    consoleLog("Error fetching resource", "errorClass", JSON.parse(newError));
                }else{
                    consoleLog("Error fetching resource", "errorClass", error.message);
                }
              }
              readResources(neededResources, callback);
            });
          }
        };

        // at least grab patient
        if(!neededResources) {
          neededResources = [];
          neededResources.push("Patient");
        }
        readResources(neededResources.slice(), () => {
          const bundle: Bundle = {
            resourceType: "Bundle",
            type: "collection",
            entry: entryResources.map(r => ({ resource: r }))
          };
          resolve(bundle);
        });
      },
      error => {
        consoleLog("error: " + error, "errorClass", `failed to fetch patient ${smart.patient.id}`);
        console.log(error);
        reject(error);
      }
    );
  });
}

export default buildPopulatedResourceBundle;