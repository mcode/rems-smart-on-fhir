import {
  Bundle,
  Coding,
  DeviceRequest,
  Extension,
  Library,
  MedicationDispense,
  MedicationRequest,
  Questionnaire,
  QuestionnaireResponse,
  ServiceRequest
} from 'fhir/r4';
import { useEffect, useState } from 'react';
import { QuestionnaireForm } from './QuestionnaireForm';
import fetchFhirVersion, { AppContext } from './questionnaireUtil';
import cqlfhir from 'cql-exec-fhir';
import Client from 'fhirclient/lib/Client';
import {
  ReturnValue,
  fetchArtifactsOperation,
  fetchFromQuestionnaireResponse,
  searchByOrder
} from './fetchArtifacts';
import executeElm from './elm/executeElm';
import PatientSelect from './components/PatientSelect/PatientSelect';
import RemsInterface from './components/RemsInterface/RemsInterface';
import { createRoot } from 'react-dom/client';

interface SmartAppProps {
  standalone: boolean;
  patientId: string;
  smartClient: Client;
  appContext?: AppContext;
  tabIndex: number;
}
export type OrderResource = DeviceRequest | MedicationRequest | ServiceRequest | MedicationDispense;
export type LogType = 'infoClass' | 'errorClass' | 'warningClass';
interface LogEntry {
  content: string;
  details?: string | null;
  type: LogType;
}
export interface PrepopulationResults {
  [key: string]: {
    [key: string]: any;
  };
}
interface IncludeStatement {
  path: string;
  version: string;
}
// TODO: this should be a more complete ELM type, this is just a husk to satisfy typescript
export interface Elm {
  [key: string]: any;
  library: {
    [key: string]: any;
    identifier: {
      id: string;
      version: string;
    };
    includes: {
      [key: string]: any;
      def: IncludeStatement[];
    };
    valueSets: {
      def: [
        {
          id: string;
        }
      ];
    };
  };
}
interface ParameterObject {
  device_request?: FHIRObject;
  medication_request?: FHIRObject;
  service_request?: FHIRObject;
  medication_dispense?: FHIRObject;
}

export interface ExecutionInputs {
  elm: Elm;
  // look at main library elms to determine dependent elms to include
  elmDependencies?: (Elm | undefined)[];
  valueSetDB: any;
  parameters: ParameterObject;
  mainLibraryMaps: Map<string, Library> | null;
}

export function SmartApp(props: SmartAppProps) {
  const attested: string[] = [];
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [response, setResponse] = useState<QuestionnaireResponse | null>(null);
  const [isAdaptiveFormWithoutExtension, setIsAdaptiveFormWithoutExtension] =
    useState<boolean>(false);
  const [isFetchingArtifacts, setIsFetchingArtifacts] = useState<boolean>(false);
  const [cqlPrepopulationResults, setCqlPrepopulationResults] =
    useState<PrepopulationResults | null>(null);
  const [errors, setErrors] = useState<LogEntry[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showOverlay, setShowOverlay] = useState<boolean>(false);
  const appContext: AppContext | undefined = props.appContext;
  const [specialtyRxBundle, setSpecialtyRxBundle] = useState<Bundle | null>(null);
  const [remsAdminResponse, setRemsAdminResponse] = useState<any | null>(null);
  const [orderResource, setOrderResource] = useState<OrderResource | undefined>();
  const [bundle, setBundle] = useState<Bundle>();
  const [priorAuthClaim, setPriorAuthClaim] = useState<Bundle>();
  const [filterChecked, setFilterChecked] = useState<boolean>(true);
  const [formFilled, setFormFilled] = useState<boolean>(false);
  const [reloadQuestionnaire, setReloadQuestionnaire] = useState<boolean>(false);
  const [adFormCompleted, setAdFormCompleted] = useState<boolean>(false);
  const [adFormResponseFromServer, setAdFormResponseFromServer] = useState<QuestionnaireResponse>();
  const [formElement, setFormElement] = useState<HTMLElement>();
  const smart = props.smartClient;
  let FHIR_VERSION = 'r4';
  const toggleOverlay = () => {
    setShowOverlay(!showOverlay);
  };
  useEffect(() => {
    if (!props.standalone) {
      ehrLaunch(false);
    }
    if (priorAuthClaim) {
      console.log(priorAuthClaim); // TODO: I don't think we need this, it could be removed.
    }
  }, []);
  useEffect(() => {
    // TODO: this could be redone like in original DTR to have a big fancy display for errors but I don't think it's necessary or useful.
    // The previous version was persistent at the top of the page.  An alert gets the job done just fine.
    errors.forEach(e => {
      alert(e.details);
    });
  }, [errors]);
  // PatientId argument might not be needed
  const standaloneLaunch = (patientId: string, response: QuestionnaireResponse) => {
    fetchFhirVersion(props.smartClient.state.serverUrl).then(fhirVersion => {
      FHIR_VERSION = fhirVersion;
      const questionnaireUrl = response.questionnaire;
      if (questionnaireUrl) {
        fetch(questionnaireUrl)
          .then(r => r.json())
          .then(questionnaire => {
            setQuestionnaire(questionnaire);
            setResponse(response);
            setIsFetchingArtifacts(false);
          });
      }
    });
  };
  const ehrLaunch = (isContainedQuestionnaire: boolean, questionnaire?: Questionnaire | null) => {
    console.log('ehr launching');
    console.log(appContext);
    if (appContext) {
      const acOrder = appContext?.order;
      const acCoverage = appContext?.coverage;
      const acQuestionnaire = appContext?.questionnaire;
      const acResponse = appContext?.response;
      if (isContainedQuestionnaire && questionnaire && acOrder && acCoverage && acQuestionnaire) {
        // TODO: This is a workaround for getting adaptive forms to work
        // in its current form, adaptive forms do not operate with the
        // package operation
        const reloadQuestionnaire = questionnaire !== undefined;
        setIsFetchingArtifacts(true);
        setReloadQuestionnaire(reloadQuestionnaire);
        fetchResourcesAndExecuteCql(acOrder, acCoverage, acQuestionnaire, questionnaire);
      } else if (acOrder && acCoverage && !acQuestionnaire && !acResponse) {
        searchByOrder(acOrder, smart).then(res => {
          // TODO: Don't know how to deal with multiple QRs
          // Let user pick with a UI?  Force orders to
          // uniquely identify QRs?
          // for now just pick the first one
          if (res[0].resource) {
            const qResponse = res[0].resource as QuestionnaireResponse;
            const responseQuestionnaire = qResponse.questionnaire;
            setResponse(qResponse);
            if (responseQuestionnaire) {
              fetchResourcesAndExecuteCql(acOrder, acCoverage, responseQuestionnaire);
            }
          }
        });
      } else if (acResponse) {
        // start relaunch
        // TODO: could potentially pass order to this function and avoid
        // needing to search the QR context extension for it
        // which would also support QRs without the extension.
        fetchFromQuestionnaireResponse(acResponse, smart).then(relaunchContext => {
          setResponse(relaunchContext.response);
          if (relaunchContext.order && relaunchContext.coverage && relaunchContext.questionnaire) {
            fetchResourcesAndExecuteCql(
              relaunchContext.order,
              relaunchContext.coverage,
              relaunchContext.questionnaire
            );
          }
        });
      } else if (acQuestionnaire && acOrder && acCoverage) {
        consoleLog('fetching artifacts', 'infoClass');
        setIsFetchingArtifacts(true);
        const reloadQuestionnaire = questionnaire !== undefined;
        setReloadQuestionnaire(reloadQuestionnaire);
        fetchResourcesAndExecuteCql(acOrder, acCoverage, acQuestionnaire);
      } else {
        alert('invalid app context');
      }
    }
  };
  const filter = (defaultFilter: boolean) => {
    if (formElement) {
      const items = Array.from(formElement.getElementsByClassName('ng-not-empty'));
      const sections = Array.from(formElement.getElementsByClassName('section'));
      const empty = Array.from(formElement.getElementsByClassName('ng-empty'));

      let checked: boolean, filterCheckbox: HTMLInputElement;
      if (!defaultFilter) {
        filterCheckbox = document.getElementById(
          questionnaire ? `filterCheckbox-${questionnaire.id}` : 'filterCheckbox'
        ) as HTMLInputElement;
        checked = filterCheckbox ? filterCheckbox.checked : false;
      } else {
        checked = true;
      }

      items.map(element => {
        // filter all not-empty items
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          // check if the item is one of the gtable, if yes, need to make sure all the
          const inputRowElement = element.closest('.lf-table-item') as HTMLElement;
          if (inputRowElement) {
            if (inputRowElement.classList.contains('lf-layout-horizontal')) {
              // check if all questions in the row are answered before filtering
              const totalQs = inputRowElement.querySelectorAll('td').length;
              const filledQs = inputRowElement.querySelectorAll(
                '.ng-not-empty:not([disabled]):not(.tooltipContent)'
              ).length;
              if (totalQs === filledQs) {
                inputRowElement.hidden = checked;
              }
            } else if (inputRowElement.parentElement?.querySelector('ul')) {
              // case for multi-answer questions
              // TODO: what's the filter case for these?  Filter if they have any answers?
              if (inputRowElement.parentElement.querySelector('ul')?.querySelector('li')) {
                // has elements in its list
                inputRowElement.hidden = checked;
              }
            } else {
              //check if all the children input have been filled
              const childrenInputs = Array.from(inputRowElement.getElementsByTagName('INPUT'));
              let allFilled = true;
              for (const untypedInput of childrenInputs) {
                const input = untypedInput as HTMLInputElement;
                if (input && !input.value) {
                  allFilled = false;
                  break;
                }
              }
              if (allFilled) {
                inputRowElement.hidden = checked;
              }
            }
          }
        }
      });

      sections.map(element => {
        if (!element.querySelector('.ng-empty')) {
          const nonEmpty = Array.from(element.querySelectorAll('.ng-not-empty'));
          let actuallyNotEmpty = true;
          // check multi-choice questions to make sure
          // they actually have an answer before we
          // filter out the entire section
          nonEmpty.forEach(e => {
            const ul = e.parentElement?.querySelector('ul');
            if (ul && !ul.querySelector('li')) {
              // the multi-choice question doesn't have an answer
              // it's actually empty
              actuallyNotEmpty = false;
            }
          });
          // filter out sections without any empty items
          if (
            actuallyNotEmpty &&
            element.parentElement &&
            !element.parentElement.querySelector('.ng-empty')
          ) {
            element.parentElement.hidden = checked;
          }
        } else {
          // deals with case where the only empty question
          // is a disabled question and a tooltip.
          // though the disabled question is hidden, the empty
          // section remains because of it.
          if (
            element.querySelector('.ng-empty:not([disabled]):not(.tooltipContent)') === null &&
            element.parentElement
          ) {
            element.parentElement.hidden = checked;
          } else {
            // check for multi-choice questions
            // get all empty questions
            const emptyq = element.querySelectorAll('.ng-empty');
            let doFilter = true;
            emptyq.forEach(e => {
              const ul = e.parentElement?.querySelector('ul');
              if (ul && !ul.querySelector('li')) {
                // the multi-choice question doesn't have an answer
                doFilter = false;
              } else if (!ul) {
                // this question is empty and isn't multi-choice
                doFilter = false;
              }
            });
            if (doFilter && element.parentElement) {
              element.parentElement.hidden = checked;
            }
          }
        }
      });

      empty.map(untypedElement => {
        const element = untypedElement as HTMLInputElement;
        if (element.type === 'checkbox') {
          // we make an exception for checkboxes we've touched
          // a checked checkbox that we've unchecked can be filtered out, despite
          // having the "empty" class.
          const d = Array.from(element.classList);
          if (d.includes('ng-touched')) {
            const closestElement = element.closest('.lf-table-item') as HTMLElement;
            closestElement.hidden = checked;
          }
        }
        // we don't want to show disabled items in the filtered view
        if (element.disabled) {
          const closestElement = element.closest('.lf-table-item') as HTMLElement;
          closestElement.hidden = checked;
        }
      });

      setFilterChecked(checked);
      setFormFilled(document.querySelector('input.ng-empty:not([disabled])') == null);
    }
  };
  const fetchResourcesAndExecuteCql = (
    order: string,
    coverage: string,
    questionnaire: string,
    containedQuestionnaire?: Questionnaire
  ) => {
    fetchFhirVersion(smart.state.serverUrl).then(fhirVersion => {
      FHIR_VERSION = fhirVersion;

      fetchArtifactsOperation(
        order,
        coverage,
        questionnaire,
        smart,
        consoleLog,
        containedQuestionnaire
      )
        .then(artifacts => {
          console.log('fetched needed artifacts:', artifacts);
          const orderResourceArtifact = artifacts.order;
          const fhirWrapper = getFhirWrapper(fhirVersion);
          setQuestionnaire(artifacts.questionnaire);
          if (orderResourceArtifact) {
            setOrderResource(orderResourceArtifact);
          }
          if (artifacts.questionnaire) {
            const includedLen = artifacts.questionnaire.extension?.filter(
              (e: Extension) => e.url === 'http://hl7.org/fhir/StructureDefinition/cqf-library'
            ).length;
            const includedCqf = includedLen ? includedLen > 0 : false;
            setIsAdaptiveFormWithoutExtension(
              artifacts.questionnaire.meta &&
                artifacts.questionnaire.meta.profile &&
                artifacts.questionnaire.meta.profile.includes(
                  'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-adapt'
                ) &&
                (artifacts.questionnaire.extension === undefined || !includedCqf)
                ? true
                : false
            );
          }
          // execute for each main library
          return Promise.all(
            artifacts.mainLibraryElms.map(mainLibraryElm => {
              let parameterObj: ParameterObject = {};
              if (orderResourceArtifact) {
                if (orderResourceArtifact.resourceType === 'DeviceRequest') {
                  parameterObj = {
                    device_request: fhirWrapper.wrap(orderResourceArtifact)
                  };
                } else if (orderResourceArtifact.resourceType === 'ServiceRequest') {
                  parameterObj = {
                    service_request: fhirWrapper.wrap(orderResourceArtifact)
                  };
                } else if (orderResourceArtifact.resourceType === 'MedicationRequest') {
                  parameterObj = {
                    medication_request: fhirWrapper.wrap(orderResourceArtifact)
                  };
                } else if (orderResourceArtifact.resourceType === 'MedicationDispense') {
                  parameterObj = {
                    medication_dispense: fhirWrapper.wrap(orderResourceArtifact)
                  };
                }
              }

              const executionInputs: ExecutionInputs = {
                elm: mainLibraryElm,
                // look at main library elms to determine dependent elms to include
                elmDependencies: mainLibraryElm.library.includes
                  ? mainLibraryElm.library.includes.def.map(includeStatement => {
                      const foundLibrary = artifacts.dependentElms.find(elm => {
                        return (
                          elm.library.identifier.id == includeStatement.path &&
                          elm.library.identifier.version == includeStatement.version
                        );
                      });
                      if (foundLibrary != null) {
                        return foundLibrary;
                      } else {
                        consoleLog(
                          `Could not find library ${includeStatement.path}. Check if it is referenced in FHIR Library (${mainLibraryElm.library.identifier.id}) properly.`,
                          'errorClass'
                        );
                      }
                    })
                  : undefined,
                valueSetDB: {},
                parameters: parameterObj,
                mainLibraryMaps: artifacts.mainLibraryMaps
              };

              // add the required value sets to the valueSetDB
              fillValueSetDB(executionInputs, artifacts);

              consoleLog('executing elm', 'infoClass');
              console.log('executing elm');
              return executeElm(
                smart,
                FHIR_VERSION,
                orderResourceArtifact,
                executionInputs,
                consoleLog
              );
            })
          );
        })

        .then(cqlResults => {
          consoleLog('executed cql, result:' + JSON.stringify(cqlResults), 'infoClass');
          console.log('executed cql, result:');

          // Collect all library results into a single bundle
          const allLibrariesResults: PrepopulationResults = {};
          let fullBundle: Bundle | undefined = undefined;
          cqlResults.forEach(libraryResult => {
            // add results to hash indexed by library name
            allLibrariesResults[libraryResult.libraryName] = libraryResult.elmResults;

            if (!fullBundle) {
              fullBundle = libraryResult.bundle;
              // copy entire first bundle");
            } else {
              // add next bundle");
              libraryResult.bundle.entry?.forEach(libraryEntry => {
                // search for the entry to see if it is already in the bundle
                let found = false;
                fullBundle?.entry?.forEach(fullBundleEntry => {
                  if (
                    fullBundleEntry.resource?.id === libraryEntry.resource?.id &&
                    fullBundleEntry.resource?.resourceType === libraryEntry.resource?.resourceType
                  ) {
                    // skip it
                    found = true;
                  }
                });

                // add the entry into the full bundle
                if (!found) {
                  fullBundle?.entry?.push(libraryEntry);
                }
              });
            }
          });
          console.log(allLibrariesResults);
          setBundle(fullBundle);
          setCqlPrepopulationResults(allLibrariesResults);
          setIsFetchingArtifacts(false);
        });
    });
  };
  // fill the valueSetDB in executionInputs with the required valuesets from their artifact source
  const fillValueSetDB = (executionInputs: ExecutionInputs, artifacts: ReturnValue) => {
    if (!executionInputs.elmDependencies) {
      return;
    }
    // create list of all ELMs that will be used
    const allElms = executionInputs.elmDependencies.slice();
    allElms.push(executionInputs.elm);

    // iterate over all elms
    allElms.forEach(elm => {
      // leave if this elm has no value set references
      if (elm?.library.valueSets == null) return;

      // iterate over valueSet definitions
      elm.library.valueSets.def.forEach(valueSetDef => {
        // find FHIR value set artifact
        const valueSetDefId = valueSetDef.id.replace(/https:\/\//, 'http://'); // vsac only returns urls with http in the resource
        const valueSet = artifacts.valueSets.find(
          valueSet => valueSet.id == valueSetDefId || valueSet.url == valueSetDefId
        );
        if (valueSet != null) {
          // make sure it has an expansion
          if (valueSet.expansion != null) {
            // add all codes to the the value set db. it is a map in a map, where the first layer key
            // is the value set id and second layer key is the value set version. for this purpose we are using un-versioned valuesets
            executionInputs.valueSetDB[valueSetDef.id] = {};
            executionInputs.valueSetDB[valueSetDef.id][''] = valueSet.expansion.contains?.map(
              code => {
                return {
                  code: code.code,
                  system: code.system,
                  version: code.version
                };
              }
            );
          } else if (valueSet.compose != null) {
            consoleLog(`Valueset ${valueSet.id} has a compose.`, 'infoClass');

            const codeList = valueSet.compose.include.map(code => {
              if (code.filter != null) {
                consoleLog(`code ${code} has a filter and is not supported.`, 'infoClass');
              }
              const conceptList = code.filter == null ? code.concept : [];
              const system = code.system;
              const codeList: Coding[] = [];
              if (conceptList) {
                conceptList.forEach(concept => {
                  codeList.push({
                    code: concept.code,
                    system: system,
                    version: code.version
                  });
                });
              }

              return codeList;
            });
            executionInputs.valueSetDB[valueSetDef.id] = {};
            executionInputs.valueSetDB[valueSetDef.id][''] =
              codeList.length > 0 ? codeList[0] : null;
          }
        } else {
          consoleLog(
            `Could not find valueset ${valueSetDef.id}. Try reloading with VSAC credentials in CRD.`,
            'errorClass'
          );
        }
      });
    });
  };

  const updateQuestionnaire = (updatedQuestionnaire: Questionnaire) => {
    setQuestionnaire(updatedQuestionnaire);
    setReloadQuestionnaire(true);
  };
  const onFilterCheckboxRefChange = () => {
    const filterCheckbox = document.getElementById(
      questionnaire ? `filterCheckbox-${questionnaire.id}` : 'filterCheckbox'
    ) as HTMLInputElement;
    if (filterCheckbox != null) {
      filterCheckbox.checked = filterChecked;
    }
  };
  const getFhirWrapper = (fhirVersion: string): cqlfhir.FHIRWrapper => {
    if (fhirVersion == 'r4') {
      return cqlfhir.FHIRWrapper.FHIRv400();
    } else if (fhirVersion == 'stu3') {
      return cqlfhir.FHIRWrapper.FHIRv300();
    } else {
      console.log('ERROR: unknown FHIR version, defaulting to R4');
      return cqlfhir.FHIRWrapper.FHIRv400();
    }
  };
  const consoleLog = (content: string, type: LogType, details: string | null = null) => {
    if (details == null) {
      console.log(content, type);
    } else {
      console.log(content, type, details);
    }
    const jsonContent: LogEntry = {
      content,
      details,
      type
    };
    setLogs([...logs, jsonContent]);
    if (type === 'errorClass') {
      setErrors([...errors, jsonContent]);
    }
  };
  const renderButtons = (ref: Element) => {
    const element = (
      <div>
        <div>
          <div className="task-button">
            <label>Only Show Unfilled Fields</label>{' '}
            <input
              type="checkbox"
              onChange={() => {
                filter(false);
              }}
              id={questionnaire ? `filterCheckbox-${questionnaire.id}` : 'filterCheckbox'}
              ref={onFilterCheckboxRefChange}
            ></input>
          </div>
        </div>
      </div>
    );
    const root = createRoot(ref);
    root.render(element);
  };
  // render
  if (
    (questionnaire && cqlPrepopulationResults) ||
    (questionnaire && response && props.standalone) ||
    (questionnaire && isAdaptiveFormWithoutExtension)
  ) {
    return isFetchingArtifacts ? (
      <div> Fetching resources ... </div>
    ) : (
      <div>
        <div className="App">
          <div
            className={'overlay ' + (showOverlay ? 'on' : 'off')}
            onClick={() => {
              console.log(showOverlay);
              toggleOverlay();
            }}
          ></div>
          {specialtyRxBundle && remsAdminResponse ? (
            <RemsInterface
              specialtyRxBundle={specialtyRxBundle}
              remsAdminResponse={remsAdminResponse}
            />
          ) : (
            <QuestionnaireForm
              qform={questionnaire}
              appContext={appContext}
              cqlPrepopulationResults={cqlPrepopulationResults}
              request={orderResource}
              bundle={bundle}
              standalone={props.standalone}
              response={response}
              attested={attested}
              setPriorAuthClaim={setPriorAuthClaim}
              setSpecialtyRxBundle={setSpecialtyRxBundle}
              setRemsAdminResponse={setRemsAdminResponse}
              fhirVersion={FHIR_VERSION}
              smartClient={smart}
              renderButtons={renderButtons}
              filterFieldsFn={filter}
              filterChecked={filterChecked}
              formFilled={formFilled}
              updateQuestionnaire={updateQuestionnaire}
              ehrLaunch={ehrLaunch}
              reloadQuestionnaire={reloadQuestionnaire}
              updateReloadQuestionnaire={reload => setReloadQuestionnaire(reload)}
              adFormCompleted={adFormCompleted}
              updateAdFormCompleted={completed => setAdFormCompleted(completed)}
              adFormResponseFromServer={adFormResponseFromServer}
              updateAdFormResponseFromServer={response => setAdFormResponseFromServer(response)}
              setFormElement={setFormElement}
              tabIndex={props.tabIndex}
            />
          )}
        </div>
      </div>
    );
  } else if (props.standalone) {
    return <PatientSelect smart={smart} callback={standaloneLaunch} />;
  } else {
    return (
      <div className="App">
        <p>Loading...</p>
      </div>
    );
  }
}
