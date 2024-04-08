import cql, { Results } from 'cql-execution';
import cqlfhir, { PatientSource } from 'cql-exec-fhir';
import buildPopulatedResourceBundle from './buildPopulatedResourceBundle';
import Client from 'fhirclient/lib/Client';
import { ExecutionInputs, LogType, OrderResource } from '../SmartApp';
import { Bundle, Library } from 'fhir/r4';
export interface ExecutionOutput {
  libraryName: string;
  bundle: Bundle;
  elmResults: any; // TODO: Get a real type for this
}
function executeElm(
  smart: Client,
  fhirVersion: string,
  request: OrderResource | null | undefined,
  executionInputs: ExecutionInputs,
  consoleLog: (a: string, b: LogType, c?: string | null) => void
) {
  return new Promise<ExecutionOutput>(function (resolve, reject) {
    console.log('about to executeElm()');
    const patientSource = getPatientSource(fhirVersion);
    const neededResourcesFromLibrary = retrieveNeededResources(
      executionInputs.mainLibraryMaps?.get(executionInputs.elm.library.identifier.id)
    );
    //compareElmAndLibraryOutput(executionInputs, neededResourcesFromLibrary);
    consoleLog('need to fetch resources', 'infoClass');
    console.log('We need to fetch these resources:', neededResourcesFromLibrary);
    if (request && patientSource) {
      buildPopulatedResourceBundle(
        smart,
        neededResourcesFromLibrary,
        fhirVersion,
        request,
        consoleLog
      )
        .then(function (resourceBundle) {
          console.log('Fetched resources are in this bundle:', resourceBundle);
          patientSource.loadBundles([resourceBundle]);
          const elmResults = executeElmAgainstPatientSource(executionInputs, patientSource);
          elmResults.then(output => {
            const results: ExecutionOutput = {
              libraryName: executionInputs.elm.library.identifier.id,
              bundle: resourceBundle,
              elmResults: output
            };
            resolve(results);
          });
        })
        .catch(function (err) {
          reject(err);
        });
    }
  });
}

// Method for debug
// function compareElmAndLibraryOutput(executionInputs: ExecutionInputs, neededResourcesFromLibrary: string[]) {
//     const neededResourcesFromElm = extractFhirResourcesThatNeedFetching(executionInputs.elm);
//     console.log("--- executeElm library: ", executionInputs.elm.library.identifier.id);
//     console.log("---- Resources retrieved from Elm:", neededResourcesFromElm);
//     console.log("---- Resources retrieved from Library neededResourceFromLibrary", neededResourcesFromLibrary);
//     findDifference(neededResourcesFromElm, neededResourcesFromLibrary);
// }

// Utility method to find out the difference between two arrays
// function findDifference(array1: any[], array2: any[]) {
//   const temp = [];
//   for (let i = 0; i < array1.length; i++) {
//     if (!array2.includes(array1[i])) {
//       temp.push(array1[i]);
//     }
//   }

//   for (let i = 0; i < array2.length; i++) {
//     if (!array1.includes(array2[i])) {
//       temp.push(array2[i]);
//     }
//   }
//   console.log('--- NeededResources Difference: ', temp);
// }

function executeElmAgainstPatientSource(
  executionInputs: ExecutionInputs,
  patientSource: PatientSource
): Promise<any> {
  let repository = undefined;
  if (executionInputs.elmDependencies) {
    repository = new cql.Repository(executionInputs.elmDependencies);
  }

  let lib = undefined;
  if (repository) {
    lib = new cql.Library(executionInputs.elm, repository);
  } else {
    lib = new cql.Library(executionInputs.elm);
  }

  const codeService = new cql.CodeService(executionInputs.valueSetDB);
  const executor = new cql.Executor(lib, codeService, executionInputs.parameters);
  return executor.exec(patientSource).then((results: Results) => {
    return results.patientResults[Object.keys(results.patientResults)[0]];
  });
}

function getPatientSource(fhirVersion: string) {
  if (fhirVersion == 'dstu2') return cqlfhir.PatientSource.FHIRv102();
  if (fhirVersion == 'stu3') return cqlfhir.PatientSource.FHIRv300();
  if (fhirVersion == 'r4') return cqlfhir.PatientSource.FHIRv400();
}

// A list of FHIR resources can not be queried based on patient
// TODO - reconsider how to handle them when implementing codeFilter
const toRemoveList = ['Organization'];

function retrieveNeededResources(libraryResource: Library | undefined) {
  if (!libraryResource) {
    return [];
  } else if (libraryResource.dataRequirement == null) return [];

  const requirementTypes = libraryResource.dataRequirement.map(d => d.type);
  const neededResources = new Set<string>();
  requirementTypes.forEach(type => neededResources.add(type));

  // RegEx for the dataRequirements only to load the value set
  // E.g. "type" = "ObservationValueSet"
  // the ValueSet is used either in CQl or Questionnaire as a set of codes
  // but not used to filter out the patient's FHIR resources based on the valueset
  const regexValueSet = /ValueSet\b/;
  return Array.from(neededResources).filter(
    item => !toRemoveList.includes(item) && !regexValueSet.test(item)
  );
}

export default executeElm;
