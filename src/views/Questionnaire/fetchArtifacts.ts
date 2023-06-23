import { checkOrderType, isRequestReference } from "./questionnaireUtil";
import Client from "fhirclient/lib/Client";
import { Elm, LogType } from "./SmartApp";
import { Bundle, BundleEntry, DeviceRequest, Extension, FhirResource, Library, MedicationDispense, MedicationRequest, Parameters, Questionnaire, QuestionnaireItem, QuestionnaireResponse, ServiceRequest, ValueSet } from "fhir/r4";
export interface ReturnValue {
    questionnaire: Questionnaire | null,
    order: DeviceRequest | ServiceRequest | MedicationRequest | MedicationDispense | null,
    mainLibraryElms: Elm[],
    dependentElms: Elm[],
    valueSets: ValueSet[],
    mainLibraryMaps: Map<String, Library> | null,
    isAdaptiveFormWithoutExtension: boolean | undefined
}

interface RelaunchContext {
    questionnaire: string | null,
    order?: string | null,
    coverage?: string | null,
    response: QuestionnaireResponse | null,
  }
function fetchArtifactsOperation(order: string, coverage: string, questionnaire: string, smart: Client, consoleLog: (a: string, b: LogType, c?: string | null) => void, containedQuestionnaire?: Questionnaire) {
  // fetch from operation
  // parse return parameters similar to function below
  return new Promise<ReturnValue>(function(resolve, reject) {

    const elmLibraryMaps = new Map<string, Library>();
    const retVal: ReturnValue = {
      questionnaire: null,
      order: null,
      mainLibraryElms: [],
      dependentElms: [],
      valueSets: [],
      mainLibraryMaps: null,
      isAdaptiveFormWithoutExtension: false
    };

    // handles errors from api calls
    function handleFetchErrors(response: Response) {
      if (!response.ok) {
        let msg = "Failure when fetching resource";
        let details = `${msg}: ${response.url}: the server responded with a status of ${response.status} (${response.statusText})`;
        consoleLog(msg, "errorClass", details);
        reject(msg);
      }
      return response;
    }

    function completeOperation(orderResource: FhirResource) {
      const parameters: Parameters = {
        "resourceType": "Parameters"
      }
      parameters.parameter = []
      retVal.order = checkOrderType(orderResource);
      parameters.parameter.push({"name": "order", "resource": orderResource})
      smart.request(coverage).then((coverage) => {
        parameters.parameter?.push({"name": "coverage", "resource": coverage});
        const requestOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/fhir+json' },
          body: JSON.stringify(parameters)
        };
        fetch(`${questionnaire}/$questionnaire-package`, requestOptions)
          .then(handleFetchErrors)
          .then((e)=> {return e.json()}).then((result: Parameters) => {
            // TODO: Handle multiple questionnaires
            const bundle = result.parameter?.[0].resource;
            if(bundle && bundle.resourceType == "Bundle" && bundle.entry){
                const bundleEntries = bundle.entry
                let questionnaire: Questionnaire | undefined;
                if (containedQuestionnaire) {
                    retVal.questionnaire = containedQuestionnaire;
                    questionnaire = containedQuestionnaire;
                } else {            
                    questionnaire = bundleEntries.find((e) => e.resource?.resourceType === "Questionnaire")?.resource as Questionnaire;
                    if(questionnaire){ // annoying but type needs to be checked again to satisfy ts
                        retVal.questionnaire = questionnaire;
                    }
                }
                retVal.isAdaptiveFormWithoutExtension = questionnaire.extension && questionnaire.extension.length > 0;
                findQuestionnaireEmbeddedCql(questionnaire.item);
                searchBundle(questionnaire, bundleEntries);
                console.log(retVal);
                resolve(retVal);
            }
          })
      })
    }

    function searchBundle(questionnaire: Questionnaire, bundle: BundleEntry<FhirResource>[]) {
      if (questionnaire.extension !== undefined) {
        // grab all main elm urls
        // R4 resources use cqf library. 
        var mainElmReferences = questionnaire.extension.filter(ext => ext.url == "http://hl7.org/fhir/StructureDefinition/cqf-library")
          .map(lib => lib.valueCanonical);
        bundle.forEach((entry) => {
          const resource = entry.resource;
          if(resource && resource.resourceType === "Library" && resource.content) {
            const base64elmData = resource.content.filter(c => c.contentType == "application/elm+json")[0].data;
            // parse the json string
            if(base64elmData){
                let elm = JSON.parse(Buffer.from(base64elmData, 'base64').toString());
                if (mainElmReferences.find((mainElmReference) => {
                  return resource.url === mainElmReference
                })){
                  // set the elm where it needs to be
                  retVal.mainLibraryElms.push(elm);
                  elmLibraryMaps.set(elm.library.identifier.id, resource) // minor change here
                  retVal.mainLibraryMaps = elmLibraryMaps;
                } else {
                  retVal.dependentElms.push(elm);
                }
            }
          } else if(resource && resource.resourceType === "ValueSet") {
            retVal.valueSets.push(resource);
          }
        })
        // mainElmReferences.forEach((mainElmReference) => {
        //   console.log(mainElmReference);
        //   var libraryResource = bundle.find((e)=>{return e.resource.url === mainElmReference})?.resource;
        //   if(libraryResource) {
        //     const base64elmData = libraryResource.content.filter(c => c.contentType == "application/elm+json")[0].data;
        //     Buffer.from(base64elmData, 'base64');

        //     // parse the json string
        //     let elm = JSON.parse(elmString);

        //     // set the elm where it needs to be
        //     retVal.mainLibraryElms.push(elm);
        //     elmLibraryMaps[elm.library.identifier.id] = libraryResource;
        //     retVal.mainLibraryMaps = elmLibraryMaps;
        //   }

        // });
      }
    }
    // recursively searches questionnaire for 
    // embedded cql and puts it in the main 
    // elm library list
    function findQuestionnaireEmbeddedCql(inputItems: QuestionnaireItem[] | undefined) {
      if(!inputItems) {
        return;
      }
      inputItems.forEach(item => {
        const itemExtensions = item.extension;
        if(item.extension) {
          let findEmbeddedCql = item.extension.find(ext => 
            ext.url === "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression" 
            && ext.valueExpression && ext.valueExpression.language === "application/elm+json");
    
          if(findEmbeddedCql && findEmbeddedCql.valueExpression && findEmbeddedCql.valueExpression.expression) {
            const itemLibrary = JSON.parse(findEmbeddedCql.valueExpression.expression);
            itemLibrary.library.identifier= {
              id: "LibraryLinkId" + item.linkId,
              version: "0.0.1"
            };
            elmLibraryMaps.set(itemLibrary.library.identifier.id, itemLibrary)
            // elmLibraryMaps[itemLibrary.library.identifier.id] = itemLibrary;
            retVal.mainLibraryMaps = elmLibraryMaps;
            retVal.mainLibraryElms.push(itemLibrary);
          }
        } 
        
        if(item.item !== undefined && item.item.length > 0) {
          findQuestionnaireEmbeddedCql(item.item);
        }
      });
    }

    if(isRequestReference(order)) {
      smart.request(order).then((orderResource) => {
        completeOperation(orderResource);
      })
    } else {
      const orderResource = JSON.parse(order.replace(/\\/g,""));
      completeOperation(orderResource)
    }

  })
}

function fetchFromQuestionnaireResponse(response: string, smart: Client) {
  const relaunchContext: RelaunchContext = {
    questionnaire: null,
    order: null,
    coverage: null,
    response: null,
  }

  return new Promise<RelaunchContext>(function(resolve, reject) {
    smart.request(response).then((res) => {
      console.log(res);
      relaunchContext.questionnaire = res.questionnaire;
      relaunchContext.response = res;
      if(res.extension) {
        const extensions = res.extension.filter((ext: Extension) => ext.url === "http://hl7.org/fhir/us/davinci-dtr/StructureDefinition/context")
        extensions.forEach((ext: Extension) => {
          if(ext.valueReference?.type === "Coverage") {
            relaunchContext.coverage = ext.valueReference.reference;
          } else {
            relaunchContext.order = ext.valueReference?.reference;
          }
        })
      }
      resolve(relaunchContext);
    })
  })

}

function searchByOrder(order: string, smart: Client) {
  let requestId: string;
  if(isRequestReference(order)){
    requestId = order;
  } else {
    const orderResource = JSON.parse(order.replace(/\\/g,""));
    requestId = `${orderResource.resourceType}/${orderResource.id}`
  }
  return new Promise<BundleEntry[]>(function(resolve, reject) {
    smart.request(`QuestionnaireResponse?context=${requestId}`).then((res: Bundle) => {
      if(res.entry) {
        resolve(res.entry)
      }
    })
  })
}

export {
  fetchArtifactsOperation,
  fetchFromQuestionnaireResponse,
  searchByOrder
};