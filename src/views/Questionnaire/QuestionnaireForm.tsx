import { Bundle, Claim, CodeableConcept, Coding, DeviceRequest, FhirResource, Location, MedicationDispense, MedicationRequest, MessageHeader, Meta, Organization, Parameters, Questionnaire, QuestionnaireItem, QuestionnaireItemAnswerOption, QuestionnaireResponse, QuestionnaireResponseItem, ServiceRequest, Signature, ValueSet } from 'fhir/r4';
import { useEffect, useState } from 'react';
import { AppContext, buildNextQuestionRequest, findValueByPrefix, retrieveQuestions, searchQuestionnaire } from './questionnaireUtil';
import Client from 'fhirclient/lib/Client';
import ConfigData from "../../config.json";
import { SelectPopup } from './components/SelectPopup';
import AlertDialog from './components/AlertDialog';

import ReactDOM from 'react-dom';
import { PrepopulationResults } from './SmartApp';
import { v4 as uuid } from 'uuid';
import axios, { AxiosResponse } from 'axios';
declare global {
  interface Window {
      LForms: any;
  }
}

interface QuestionnaireProps {
  response: QuestionnaireResponse | null
  qform: Questionnaire
  standalone: Boolean
  cqlPrepopulationResults: PrepopulationResults | null
  smartClient: Client
  request?: DeviceRequest | MedicationRequest | ServiceRequest | MedicationDispense,
  formFilled: boolean,
  adFormCompleted: Boolean,
  appContext: AppContext | null,
  updateQuestionnaire: (n: Questionnaire) => void
  fhirVersion: string,
  filterChecked: boolean,
  filterFieldsFn: (n: boolean) => void,
  renderButtons: (n: Element) => void,
  adFormResponseFromServer?: QuestionnaireResponse,
  updateAdFormResponseFromServer: (n: any) => void,
  updateAdFormCompleted: (n: boolean) => void,
  ehrLaunch: (n: boolean, m: Questionnaire | null) => void,
  attested: string[],
  updateReloadQuestionnaire: (n: boolean) => void,
  reloadQuestionnaire: boolean,
  bundle?: Bundle,
  setPriorAuthClaim: (n: Bundle) => void,
  setSpecialtyRxBundle: (n: Bundle) => void,
  setRemsAdminResponse: (n: any) => void
}

interface GTableResult {
  [key: string]: any
}
interface MetaSmart extends Meta {
  lastUpdated: string
}
interface QuestionnaireResponseSmart extends QuestionnaireResponse {
  meta?: MetaSmart
}
interface PopupInfo {
  popupTitle: string,
  popupOptions: string[],
  popupFinalOption: string
}
interface PartialForms { 
  [key: string]: QuestionnaireResponse
}
interface RxAlert {
  response?: AxiosResponse, 
  rxBundle?: Bundle, 
  description?: string, 
  open: Boolean, 
  callback?: () => void
}

export function QuestionnaireForm(props: QuestionnaireProps) {
  const [savedResponse, setSavedResponse] = useState<QuestionnaireResponse | null>(null);
  const [popupInfo, setPopupInfo] = useState<PopupInfo>({popupTitle: "", popupOptions: [], popupFinalOption: ""})
  const [openPopup, setOpenPopup] = useState<boolean>(false)
  const [formLoaded, setFormLoaded] = useState<string>("")
  const [showRxAlert, setShowRxAlert] = useState<RxAlert>({open: false})
  const [formValidationErrors, setFormValidationErrors] = useState<any[]>([])
  const partialForms: PartialForms = {}
  const LForms = window.LForms
  const setPopupOptions = (options: string[]) => {
    setPopupInfo(
      {
        popupTitle: popupInfo.popupTitle,
        popupOptions: options,
        popupFinalOption: popupInfo.popupFinalOption
      }
    )
  }
  useEffect(() => {
        // search for any partially completed QuestionnaireResponses
        if (props.response) {
          const response = props.response;
          const items = props.qform.item;
          const parentItems: QuestionnaireResponseItem[] = [];
          if(items && response.item){
            handleGtable(items, parentItems, response.item);
            prepopulate(items, response.item, true);
          }

          const mergedResponse = mergeResponseForSameLinkId(response);
          setSavedResponse(mergedResponse)
        } else {
          loadPreviousForm(false);
    
          // If not using saved QuestionnaireResponse, create a new one
          let newResponse: QuestionnaireResponse = {
            resourceType: 'QuestionnaireResponse',
            status: 'in-progress',
          }
          newResponse.item = [] // defined here to avoid compiler thinking it's potentially undefined
          const items = props.qform.item || [];
          const parentItems: QuestionnaireResponseItem[] = [];
          handleGtable(items, parentItems, newResponse.item);
          prepopulate(items, newResponse.item, false);
          let mergedResponse = mergeResponseForSameLinkId(newResponse);
          setSavedResponse(mergedResponse)
          localStorage.setItem("lastSavedResponse", JSON.stringify(mergedResponse));
        }
  }, [])

  useEffect(() => {
    if(savedResponse){
      loadAndMergeForms(savedResponse);
    }
    const formErrors = LForms.Util.checkValidity();
    setFormValidationErrors(formErrors == null ? [] : formErrors)
    document.addEventListener('change', event => {
      if (props.filterChecked && event.target instanceof Element && event.target?.id != "filterCheckbox" && event.target.id != "attestationCheckbox") {
        const checkIfFilter = (currentErrors: any[], newErrors: any[], targetElementName: string | null) => {
          if (currentErrors.length < newErrors.length)
            return false;

          const addedErrors = newErrors.filter(error => !currentErrors.includes(error));
          if (addedErrors.some(error => error.includes(targetElementName))) {
            return false;
          }

          return true;
        };
        const newErrors = LForms.Util.checkValidity();
        const ifFilter = checkIfFilter(formValidationErrors, newErrors == null ? [] : newErrors, event.target.getAttribute("name"));

        if (ifFilter) {
          props.filterFieldsFn(props.formFilled);
        } else {
          console.log("Modified field is invalid. Skip filtering.");
        }
        setFormValidationErrors(newErrors)
      }
    });
  }, [])

  useEffect(() => {
    if(props.reloadQuestionnaire){
      repopulateAndReload()
    }
  })
  const loadAndMergeForms = (newResponse: QuestionnaireResponse) => {
    console.log(JSON.stringify(props.qform));
    console.log(JSON.stringify(newResponse));

    let lform = LForms.Util.convertFHIRQuestionnaireToLForms(props.qform, props.fhirVersion);

    lform.templateOptions = {
      showFormHeader: false,
      showColumnHeaders: false,
      showQuestionCode: false,
      hideFormControls: true,
      showFormOptionPanelButton: true
    };

    if (newResponse) {
      newResponse = mergeResponseForSameLinkId(newResponse);
      lform = LForms.Util.mergeFHIRDataIntoLForms("QuestionnaireResponse", newResponse, lform, props.fhirVersion)
    }

    console.log(lform);

    LForms.Util.addFormToPage(lform, "formContainer");
    const header = document.getElementsByClassName("lf-form-title")[0];
    const el = document.createElement('div');
    el.setAttribute("id", "button-container");
    header.appendChild(el);
    props.renderButtons(el);

    const patientInfoEl = document.createElement('div');
    patientInfoEl.setAttribute("id", "patientInfo-container");
    header.appendChild(patientInfoEl);
    let patientId = getPatient().replace("Patient/", "");
    let patientInfoElement = (display: string) => (<div className="patient-info-panel"><label>Patient: {display}</label></div>);
    props.smartClient.request("Patient/" + patientId).then((result) => {
      ReactDOM.render(patientInfoElement(`${result.name[0].given[0]} ${result.name[0].family}`), patientInfoEl);
    }, (error) => {
      console.log("Failed to retrieve the patient information. Error is ", error);
      ReactDOM.render(patientInfoElement("Unknown"), patientInfoEl);
    });

    props.filterFieldsFn(true);
  }

  const repopulateAndReload = () => {
    console.log("----- Re-populating and reloading form ----");
    // rerun pre-population
    let newResponse: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      status: 'in-progress',
    }
    newResponse.item = []
    const items = props.qform.item || [];
    const parentItems: QuestionnaireResponseItem[] = [];
    handleGtable(items, parentItems, newResponse.item);
    prepopulate(items, newResponse.item, false);

    // merge pre-populated response and response from the server
    let mergedResponse = newResponse;
    if (props.adFormResponseFromServer) {
      mergedResponse = mergeResponses(mergeResponseForSameLinkId(newResponse), mergeResponseForSameLinkId(props.adFormResponseFromServer));
    } else {
      const lastResponse = localStorage.getItem("lastSavedResponse")
      if(lastResponse){
        mergedResponse = mergeResponses(mergeResponseForSameLinkId(newResponse), JSON.parse(lastResponse));
      }
    }
    
    loadAndMergeForms(mergedResponse);
    props.updateReloadQuestionnaire(false);
  }

  const mergeResponses = (firstResponse: QuestionnaireResponse, secondResponse: QuestionnaireResponse) => {
    if(firstResponse.item && secondResponse.item){
      const combinedItems = firstResponse.item.concat(secondResponse.item);
      firstResponse.item = combinedItems;
    }
    return firstResponse;
  }
  // handlGtable expands the items with contains a table level expression
  // the expression should be a list of objects
  // this function creates the controls based on the size of the expression
  // then set the value of for each item
  // the expression should be a list of objects with keys, the keys will have to match
  // with the question text
  // e.g. expression object list is [{"RxNorm":"content", "Description": "description"}]
  // the corresponding item would be "item": [{"text": "RxNorm", "type": "string", "linkId": "MED.1.1"}, {"text": "Description", "type": "string", "linkId": "MED.1.2"} ]
  const handleGtable = (items: QuestionnaireItem[], parentItems: QuestionnaireResponseItem[], responseItems: QuestionnaireResponseItem[]) => {
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      let item = items[itemIndex];
      let response_item: QuestionnaireResponseItem = {
        "linkId": item.linkId,
      };
      if (item.item) {
        parentItems.push(response_item);
      }

      if (item.type == "group" && item.extension) {

        let isGtable = item.extension.some(e =>
          e.url == "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl" && e.valueCodeableConcept?.coding?.[0].code == "gtable"
        );
        let containsValueExpression = item.extension.some(e =>
          e.url == "http://hl7.org/fhir/StructureDefinition/cqf-expression" || e.url == "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression"
        );

        if (isGtable && containsValueExpression && !props.standalone) {
          // check if the prepopulationResult contains any value
          // if yes, then need to add corresponding sub-items then provide the answer
          // need to figure out which value is provided from the prepopulationResult though

          // grab the population result
          let prepopulationResult = null
          if(props.cqlPrepopulationResults){
            prepopulationResult = getLibraryPrepopulationResult(item, props.cqlPrepopulationResults);
          }

          // console.log("prepopulationResult: ", prepopulationResult);
          if (prepopulationResult && prepopulationResult.length > 0) {
            let newItemList = buildGTableItems(item, prepopulationResult);
            parentItems.pop();
            let parentItem = parentItems.pop();
            if (newItemList.length > 0 && parentItem) {
              parentItem.item = [];
              for (let i = 0; i < newItemList.length; i++) {
                parentItem.item.push(newItemList[i])
              }
              responseItems.push(parentItem);
            }
          } else {
            // remove valueExpression from item to prevent prepopulate function to fill empty response
            let valueExpressionIndex = item.extension.findIndex(e => e.url == "http://hl7.org/fhir/StructureDefinition/cqf-expression" || e.url == "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression");
            item.extension.splice(valueExpressionIndex, 1);
          }
        }
        continue;
      }

      if (item.item) {
        handleGtable(item.item, parentItems, responseItems);
      }
    }
  }

  // build multiple items if there are multiple items for the gtable
  const buildGTableItems = (item: QuestionnaireItem, prepopulationResult: GTableResult[]) => {
    if (item.extension) {
      //remove expression extension
      let expressionExtensionIndex = item.extension.findIndex(e =>
        e.url == "http://hl7.org/fhir/StructureDefinition/cqf-expression" || e.url == "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression"
      );
      item.extension.splice(expressionExtensionIndex, 1);
    }
    //add item answer to the subitem
    let itemSubItems = item.item ? item.item : [];
    let newItemResponseList = [];

    for (let index = 0; index < prepopulationResult.length; index++) {
      let result = prepopulationResult[index];

      let newItemResponse: QuestionnaireResponseItem = {
        "linkId": item.linkId,
        "text": item.text
      }

      let newItemResponseSubItems: QuestionnaireResponseItem[]  = [];
      itemSubItems.forEach(subItem => {
        let targetItem = {};
        newItemResponseSubItems.push(Object.assign(targetItem, subItem));
      });
      newItemResponse.item = newItemResponseSubItems;

      newItemResponse.item.forEach(subItem => {
        if (subItem.text){
          let resultTextValue = result[subItem.text];
          if (resultTextValue) {
            subItem.answer = [{
              "valueString": resultTextValue
            }];
          }
        }
      });
      newItemResponseList.push(newItemResponse);
    }

    return newItemResponseList;
  }
  const getLibraryPrepopulationResult = (item: QuestionnaireItem, cqlResults: PrepopulationResults) => {
    let prepopulationResult;
    const ext = item.extension?.find((val) => {
      return val.url === "http://hl7.org/fhir/StructureDefinition/cqf-expression" || "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression"
    })
    if(ext){
      const value = findValueByPrefix(ext, "value");
      const valueExpression = value.expression;
    

      let libraryName;
      let statementName;
      // this is embedded CQL in Questionnaire
      if(value.language === "application/elm+json") {
        libraryName = "LibraryLinkId" + item.linkId;
        statementName = "LinkId." + item.linkId;
      }
      else {
        // split library designator from statement
        const valueComponents = valueExpression.split(".");
      
        if (valueComponents.length > 1) {
          libraryName = valueComponents[0].substring(
            1,
            valueComponents[0].length - 1
          );
          statementName = valueComponents[1];
        } else {
          // if there is not library name grab the first library name
          statementName = valueExpression;
          libraryName = Object.keys(cqlResults)[0];
        }
      }

      if (cqlResults[libraryName] != null) {
        prepopulationResult = cqlResults[
          libraryName
        ][statementName];
        console.log(`Found library "${libraryName}"`);
      } else {
        prepopulationResult = null;
        console.log(`Couldn't find library "${libraryName}"`);
      }
    }
    return prepopulationResult;
  }
  const prepopulate = (items: QuestionnaireItem[], response_items: QuestionnaireResponseItem[], saved_response: boolean) => {
    items.map(item => {
      let response_item: QuestionnaireResponseItem = {
        linkId: item.linkId,
      };

      if (item.item) {
        // add sub-items
        response_item.item = []
        prepopulate(item.item, response_item.item, saved_response);
      }

      // Remove empty child item array
      if ((response_item.item != undefined) && (response_item.item.length == 0)) {
        response_item.item = undefined
      }

      if (item.type === 'choice' || item.type === 'open-choice') {
        populateMissingDisplay(item)
      }

      // autofill fields
      if (item.extension && (!saved_response || item.type == 'open-choice') && !props.standalone) {
        response_item.answer = []
        item.extension.forEach(e => { // shouldn't there be a check on this extension to make sure its one that requires autofill?
          let prepopulationResult;
          if(props.cqlPrepopulationResults){
            prepopulationResult = getLibraryPrepopulationResult(item, props.cqlPrepopulationResults);
          }

          if (prepopulationResult != null && !saved_response && response_item.answer) {
            switch (item.type) {
              case 'boolean':
                response_item.answer.push({ valueBoolean: prepopulationResult });
                break;

              case 'integer':
                response_item.answer.push({ valueInteger: prepopulationResult });
                break;

              case 'decimal':
                response_item.answer.push({ valueDecimal: prepopulationResult });
                break;

              case 'date':
                // LHC form could not correctly parse Date object.
                // Have to convert Date object to string.
                response_item.answer.push({ valueDate: prepopulationResult.toString() });
                break;

              case 'choice':
                response_item.answer.push({ valueCoding: getDisplayCoding(prepopulationResult, item) });
                break;

              case 'open-choice':
                //This is to populated dynamic options (option items generated from CQL expression)
                //R4 uses item.answerOption, STU3 uses item.option
                let populateAnswerOptions = false;
                let populateOptions = false;

                if (item.answerOption != null && item.answerOption.length == 0) {
                  populateAnswerOptions = true
                }

                prepopulationResult.forEach((v: any) => {
                  let displayCoding = getDisplayCoding(v, item)

                  if (populateAnswerOptions && item.answerOption) {
                    item.answerOption.push({ valueCoding: displayCoding })
                  }
                  if(response_item.answer){
                    response_item.answer.push({ valueCoding: displayCoding }); 
                  }
                });
                break;

              case 'quantity':
                response_item.answer.push({ valueQuantity: prepopulationResult });
                break;

              default:
                response_item.answer.push({ valueString: prepopulationResult });
            }
          }
        });

        // Remove empty answer array
        if (response_item.answer.length == 0) {
          response_item.answer = undefined
        }
      }

      if (!saved_response) {
        // If there is no CQL value, check if item/prescription has initial value
        // This does NOT work for STU3 questionnaire which use item.initial[x]
        if (!response_item.answer && item.initial) {
          response_item.answer = item.initial
        }

        // Don't need to add item for reloaded QuestionnaireResponse
        // Add QuestionnaireResponse item if the item has either answer(s) or child item(s)
        if (response_item.answer || response_item.item) {
          response_items.push(response_item);
        }
      }
    });
  }
  const getDisplayCoding = (v: any, item: QuestionnaireItem) => {
    if (typeof v == 'string') {
      const answerValueSetReference = item.answerValueSet
      const answerOption = item.answerOption
      let selectedCode;

      if (answerValueSetReference && props.qform.contained) {
        const vs_id = answerValueSetReference.substr(1);
        const fhirResource = props.qform.contained.find(r => r.id == vs_id);
        if (fhirResource && fhirResource.resourceType == "ValueSet") {
          const vs: ValueSet = fhirResource
          if (vs && vs.expansion && vs.expansion.contains) {
            selectedCode = vs.expansion.contains.find(o => o.code == v)
          }
        }
      } else if (answerOption) {
        const ao = answerOption.find(o => o?.valueCoding?.code == v || o?.valueCoding?.display == v)
        if (ao) {
          selectedCode = ao.valueCoding
        }
      }

      if (selectedCode) {
        return selectedCode
      } else {
        return {
          display: v
        }
      }
    }

    let system = '';
    let displayText = v.display

    if (v.type && v.type === 'encounter' && v.periodStart) {
      displayText = 'Encounter - ' + v.display + ' on ' + v.periodStart
    } else if (v.system) {
      if (v.system == 'http://snomed.info/sct') {
        system = 'SNOMED'
      } else if (v.system.startsWith('http://hl7.org/fhir/sid/icd-10')) {
        system = "ICD-10"
      } else if (v.system == "http://www.nlm.nih.gov/research/umls/rxnorm") {
        system = "RxNorm"
      }

      // if (system.length > 0) {
      //   displayText = displayText + ' - ' + system + ' - ' + v.code
      // }
    }

    return {
      code: v.code,
      system: v.system,
      display: displayText
    }
  }
  const populateMissingDisplay = (qItem: QuestionnaireItem) => {
    const codingList = qItem.answerOption
    if (codingList) {
      codingList.forEach(v => {
        if (v.valueCoding && !v.valueCoding.display) {
          v.valueCoding.display = v.valueCoding.code
        }
      })
    }
  }
  // Merge the items for the same linkId to comply with the LHCForm
  const mergeResponseForSameLinkId = (response: QuestionnaireResponse) => {
    let mergedResponse: QuestionnaireResponse = {
      resourceType: response.resourceType,
      status: response.status,
      item: []
    };
    const responseItems = response.item;
    if (responseItems) {
      let itemKeyList: Set<string> = new Set();
      for (let i = 0; i < responseItems.length; i++) {
        itemKeyList.add(responseItems[i].linkId);
      }
      itemKeyList.forEach(linkId => {
        let linkIdItem: QuestionnaireResponseItem = {
          linkId,
          item: []
        };
        let filteredItems = responseItems.filter(responseItem => responseItem.linkId == linkId
        );
        if (filteredItems) {
          filteredItems.forEach(foundItem => {
            if (foundItem.item) {
              linkIdItem?.item?.push(...foundItem.item);
            } else {
              linkIdItem = foundItem;
              linkIdItem.item = undefined;
            }
          });
          mergedResponse?.item?.push(linkIdItem);
        }
      });
    }
    return mergedResponse;
  }
  const getRetrieveSaveQuestionnaireUrl = () => {
    // read configuration 
    let updateDate = new Date();
    updateDate.setDate(updateDate.getDate() - ConfigData.QUESTIONNAIRE_EXPIRATION_DAYS);
    return `QuestionnaireResponse?_lastUpdated=gt${updateDate.toISOString().split('T')[0]}&status=in-progress`
  }
  const loadPreviousForm = (showError = true) => {
    // search for any QuestionnaireResponses
    let questionnaireResponseUrl = getRetrieveSaveQuestionnaireUrl();
    questionnaireResponseUrl = questionnaireResponseUrl + "&subject=" + getPatient();
    console.log("Using URL " + questionnaireResponseUrl);

    props.smartClient.request(questionnaireResponseUrl).then((result) => {
        popupClear("Would you like to load a previously in-progress form?", "Cancel", false);
        processSavedQuestionnaireResponses(result, showError);
      }, ((result) => {
        popupClear("Error: failed to load previous in-progress forms", "OK", true);
        popupLaunch();
      })).catch(console.error);
  }
  const popupClear = (title: string, finalOption: string, logTitle: boolean) => {
    setPopupInfo({
      popupTitle: title,
      popupOptions: [],
      popupFinalOption: finalOption
    });
    if (logTitle) {
      console.log(title);
    }
  }
  const popupLaunch = () => {
    setOpenPopup(true)
  }

  const popupCallback = (returnValue: string) => {
    // display the form loaded
    setFormLoaded(returnValue)

    if (partialForms[returnValue]) {
      // load the selected form
      let partialResponse = partialForms[returnValue];
      let saved_response = false;

      console.log(partialResponse);

      if(partialResponse.contained && partialResponse.contained[0].resourceType === "Questionnaire") {
        localStorage.setItem("lastSavedResponse", JSON.stringify(partialResponse));
        props.updateQuestionnaire(partialResponse.contained[0]);
      } else {
        // If not using saved QuestionnaireResponse, create a new one
        let newResponse: QuestionnaireResponse = {
          resourceType: 'QuestionnaireResponse',
          status: "in-progress"
        }
        newResponse.item = []

        const items = props.qform.item;
        if (items) {
          prepopulate(items, newResponse.item, saved_response)

          updateSavedResponseWithPrepopulation(newResponse, partialResponse);

          // force it to reload the form
          loadAndMergeForms(partialResponse);
        }

      }
    } else {
      console.log("No form loaded.");
    }
  }

  const updateSavedResponseWithPrepopulation = (newOne: QuestionnaireResponse, saved: QuestionnaireResponse) => {
    const updateMergeItem = (newItem: QuestionnaireResponseItem, savedItem: QuestionnaireResponseItem, parentLinkId: string) => {
      if (newItem.item == undefined) {
        //find the corresponding linkId in savedItem and replace it
        const findSavedParentItem = (parentLinkId: string, savedItem: QuestionnaireResponseItem) => {
          if (savedItem.linkId === parentLinkId) {
            return savedItem;
          } else {
            if (savedItem.item) {
              const parentIndex = savedItem.item.findIndex(item => item.linkId == parentLinkId);
              if (parentIndex != -1) {
                return savedItem.item[parentIndex];
              } 
              // I don't think this recursion is necessary, it seems to do nothing.  But maybe I'm wrong.
              // else {
              //   findSavedParentItem(parentLinkId, savedItem.item);
              // }
            }
          }
        };

        const savedParentItem = findSavedParentItem(parentLinkId, savedItem);
        const replaceOrInsertItem = (newResponseItem: QuestionnaireResponseItem, savedParentItem: QuestionnaireResponseItem) => {
          if(savedParentItem.item) {
            const replaceIndex = savedParentItem.item.findIndex(item => item.linkId == newResponseItem.linkId);
            if (replaceIndex != -1) {
              savedParentItem.item[replaceIndex] = newResponseItem;
            } else {
              savedParentItem.item.push(newResponseItem);
            }
          }

        };
        if (savedParentItem != undefined) {
          replaceOrInsertItem(newItem, savedParentItem);
        }
      } else {
        if(newItem.item) {
          newItem.item.forEach(newSubItem => {
            updateMergeItem(newSubItem, savedItem, newItem.linkId);
          });
        }
      }
    };

    newOne.item?.map(newItem => {
      if (saved.item !== undefined) {
        let savedIndex = saved.item.findIndex(savedItem => newItem.linkId == savedItem.linkId);
        if (savedIndex != -1) {
          updateMergeItem(newItem, saved.item[savedIndex], "");
        }
      }
    });
  };

  const getPatient = () => {
    let p = "Unknown";
    let requestType = "Unknown";
    if (props.smartClient.patient.id) {
      p = `Patient/${props.smartClient.patient.id}`;
    } else if (props.request) {
      const ref = props.request.subject?.reference
      if (ref) {
        p = ref
      }
    }
    console.log("getPatient(): " + requestType + ": " + p);
    return p;
  }
  const getPractitioner = () => {
    let p = "Unknown";
    let requestType = "Unknown";
    if (props.request) {
      requestType = props.request.resourceType;
      if (requestType == "DeviceRequest" || requestType == "ServiceRequest") {
        const pVal = props.request.performer
        if(pVal && !Array.isArray(pVal) && pVal.reference){
          p = pVal.reference
        }
      } else if (props.request.resourceType == "MedicationRequest" && props.request.requester) {
        if(props.request.requester.reference){
          p = props.request.requester.reference;
        }
      }
    }
    console.log("getPractitioner(): " + requestType + ": " + p);
    return p;
  }

  const getCode = () => {
    let c: CodeableConcept | undefined = undefined;
    const request = props.request
    if (request) {
      if (request.resourceType == "DeviceRequest") {
        c = request.codeCodeableConcept;
      } else if (request.resourceType == "ServiceRequest") {
        c = request.code;
      } else if (request.resourceType == "MedicationRequest") {
        c = request.medicationCodeableConcept;
      }
    }
    console.log("getCode(): " + request?.resourceType + ": ")
    console.log(c);
    return c;
  }

  // retrieve next sets of questions
  const loadNextQuestions = () => {
    // this is a temp fix for adaptive forms 
    // TODO: figure out what to do about next-question standardization.
    let qformUrl = props.appContext?.questionnaire;
    if(qformUrl) {
      const urlArray = qformUrl.split('/');
      urlArray.pop();
      qformUrl = urlArray.join('/');
    } else {
      qformUrl = 'http://localhost:8090/fhir/r4/Questionnaire'
    }
    const url = `${qformUrl}/$next-question`;

    const currentQuestionnaireResponse = window.LForms.Util.getFormFHIRData('QuestionnaireResponse', props.fhirVersion, "#formContainer");
    //const mergedResponse = this.mergeResponseForSameLinkId(currentQuestionnaireResponse);
    retrieveQuestions(url, buildNextQuestionRequest(props.qform, currentQuestionnaireResponse))
      .then(result => result.json())
      .then(result => {
        console.log("-- loadNextQuestions response returned from payer server questionnaireResponse ", result);
        if(result.error === undefined) {
          let newResponse = {
            resourceType: 'QuestionnaireResponse',
            status: 'draft',
            item: []
          }
          prepopulate(result.contained[0].item, newResponse.item, true);
          props.updateAdFormResponseFromServer(result);
          props.updateAdFormCompleted(result.status === "completed");
          props.ehrLaunch(true, result.contained[0]);
        } else {
          alert("Failed to load next questions. Error: " + result.error);
        }
      });
  }
  const processSavedQuestionnaireResponses = (partialResponses: Bundle<QuestionnaireResponse>, displayErrorOnNoneFound: boolean) => {
    let noneFound = true;

    if (partialResponses.total && partialResponses.total > 0 && partialResponses.entry) {
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
      };

      let count = 0;

      partialResponses.entry.forEach(bundleEntry => {
        let idMatch = false;
        if(bundleEntry.resource?.contained){
          const questionnaireId = bundleEntry.resource?.contained[0].id;
          idMatch = props.qform.id === questionnaireId;
        }
        const questionnaireIdUrl = bundleEntry.resource?.questionnaire;

        if ( idMatch || (questionnaireIdUrl && props.qform.id && questionnaireIdUrl.includes(props.qform.id))) {
          count = count + 1;
          // add the option to the popupOptions
          let date = new Date(bundleEntry?.resource?.authored || Date.now());
          let option = date.toLocaleDateString(undefined, options) + " (" + bundleEntry?.resource?.status + ")";
          setPopupOptions([...popupInfo.popupOptions, option])
          if (bundleEntry.resource) {
            partialForms[option] = bundleEntry.resource;
          }
        }
      });
      console.log(popupInfo.popupOptions);
      console.log(partialForms);

      //check if show popup
      const showPopup = !isAdaptiveForm() || isAdaptiveFormWithoutItem();
      // only show the popupOptions if there is one to show
      if (count > 0 && showPopup) {
        noneFound = false;
        popupLaunch();
      }
    }

    // display a message that none were found if necessary
    if (noneFound && displayErrorOnNoneFound) {
      popupClear("No saved forms available to load.", "OK", true);
      popupLaunch();
    }
  }
  const isAdaptiveForm = () => {
    return props.qform.meta && props.qform.meta.profile && props.qform.meta.profile.includes("http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-adapt");
  }

  const isAdaptiveFormWithoutItem = () => {
    return isAdaptiveForm() && props.qform && (props.qform.item === undefined || props.qform.item.length <= 0);
  }

  const isAdaptiveFormWithItem = () => {
    return isAdaptiveForm() && props.qform && props.qform.item && props.qform.item.length >0;
  }
 
  const getDisplayButtons = () => {
    if (!isAdaptiveForm()) {
      return (<div className="submit-button-panel">
        <button className="btn submit-button" onClick={() => loadPreviousForm()}>
          Load Previous Form
        </button>
        <button className="btn submit-button" onClick={() => {outputResponse("in-progress")}}>
          Save to EHR
        </button>
        <button className="btn submit-button" onClick={() => {outputResponse("completed")}}>
          Submit REMS Bundle
        </button>
      </div>)
    }
    else {
      if (props.adFormCompleted) {
        return (
          <div className="submit-button-panel">
            <button className="btn submit-button" onClick={() => {outputResponse("completed")}}>
              Submit REMS Bundle
            </button>
          </div>
        )
      }
      else {
        return (
          <div className="submit-button-panel">
            {isAdaptiveFormWithoutItem() ? (
              <button className="btn submit-button" onClick={() => loadPreviousForm()}>
              Load Previous Form
               </button>
            ) : null}
            {isAdaptiveFormWithItem() ? (<button className="btn submit-button" onClick={() => {outputResponse("in-progress")}}>
              Save To EHR
            </button>) : null}
          </div>
        )
      }
    }
  }
  const addAuthorToResponse = (qr: QuestionnaireResponse, practitionerRef: string) => {
    function traverseToItemsLeafNode(item: QuestionnaireResponseItem, practitionerRef: string) {
      if (!item.item) {
        return addAuthor(item, practitionerRef);
      }
      else {
        item.item.map(item => {
          traverseToItemsLeafNode(item, practitionerRef);
        })
      }
    }
    // url is a string
    function addAuthor(item: QuestionnaireResponseItem, practitionerRef: string) {
      var url = "http://hl7.org/fhir/StructureDefinition/questionnaireresponse-author"
      const urlValRef =
      {
        "url": url,
        "valueReference":
        {
          "reference": practitionerRef
        }
      }
      if (item.extension) {
        // if there is already an extension with author-extension url
        const completelyFound = item.extension.find(element => element.url === url && element.valueReference?.reference === practitionerRef)
        const urlFound = item.extension.find(element => element.url === url && element.valueReference?.reference !== practitionerRef)

        if (!completelyFound) {
          if (urlFound) {
            var urlFoundIndex = item.extension.findIndex(element => element.url === url)
            item.extension[urlFoundIndex].valueReference =
            {
              "reference": practitionerRef
            }
          }
          else {
            item.extension.push(urlValRef)
          }
        }
      }
      else {
        item["extension"] = [urlValRef]
      }
    }
    if(qr.item) {
      qr.item.map(item => {
        traverseToItemsLeafNode(item, practitionerRef)
      })
    }
  }

  const getQuestionnaireResponse = (status: QuestionnaireResponse["status"]) => {
    let qr: QuestionnaireResponseSmart = window.LForms.Util.getFormFHIRData('QuestionnaireResponse', props.fhirVersion, "#formContainer");
    //console.log(qr);
    qr.status = status;
    qr.author = {
      reference:
        getPractitioner()
    };
    getPatient();
    qr.subject = {
      reference:
        getPatient()
    };
    addAuthorToResponse(qr, getPractitioner());

    qr.questionnaire = props.appContext?.questionnaire?props.appContext?.questionnaire:props.response?.questionnaire; // questionnaire from response
    console.log("GetQuestionnaireResponse final QuestionnaireResponse: ", qr);

    const request = props.request;
    // add context extension
    qr.extension = [];
    if(request) {
      const contextExtensionUrl = "http://hl7.org/fhir/us/davinci-dtr/StructureDefinition/context";
      qr.extension.push({
        url: contextExtensionUrl,
        valueReference: {
          reference: `${request.resourceType}/${request.id}`,
          type: `${request.resourceType}`
        }
      })

      if(request.resourceType != "MedicationDispense" && request.insurance && request.insurance.length > 0) {
        const coverage = request.insurance[0];
        qr.extension.push({
          url: contextExtensionUrl,
          valueReference: {
            reference: `${coverage.reference}`,
            type: "Coverage"
          }
        })
      }
   }
    console.log(props.attested);
    if(qr.item) {
      qr.item.forEach((item) => {
        const aa = searchQuestionnaire(item, props.attested);
        console.log(aa);
      })
    }
    return qr;
  }
  const isPriorAuthBundleValid = (bundle: Bundle) => {
    const resourceTypeList = ["Patient", "Practitioner"];

    return resourceTypeList.every(resourceType => {
      let foundEntry = bundle.entry?.find(function (entry) {
        return entry.resource?.resourceType === resourceType;
      });
      if (foundEntry === undefined) {
        console.warn("--- isPriorAuthBundleValid: bundle missing required resource ", resourceType);
      }
      return foundEntry !== undefined;
    });
  }


  const storeQuestionnaireResponseToEhr = (questionnaireReponse: QuestionnaireResponseSmart, showPopup: Boolean | undefined) => {
    // send the QuestionnaireResponse to the EHR FHIR server
    var questionnaireUrl = sessionStorage["serviceUri"] + "/QuestionnaireResponse";
    console.log("Storing QuestionnaireResponse to: " + questionnaireUrl);
    props.smartClient.create(questionnaireReponse).then((result) => {
      if (showPopup) {
        popupClear("Partially completed form (QuestionnaireResponse) saved to EHR", "OK", true);
        popupLaunch();
      }
    }, ((result) => {
      popupClear("Error: Partially completed form (QuestionnaireResponse) Failed to save to EHR", "OK", true);
      popupLaunch();
    })).catch(console.error);
  }

  const outputResponse = (status: QuestionnaireResponse["status"]) => {
    var qr = getQuestionnaireResponse(status);

    // add the contained questionnaire for adaptive form 
    if (isAdaptiveForm()) {
      qr.contained = [];
      qr.contained.push(props.qform);
    }

    if (status == "in-progress") {
      const showPopup = !isAdaptiveForm() || isAdaptiveFormWithoutItem();
      storeQuestionnaireResponseToEhr(qr, showPopup);
      popupClear("Partially completed form (QuestionnaireResponse) saved to EHR", "OK", true);
      if(showPopup) {
        popupLaunch();
      } else {
        alert("Partially completed form (QuestionnaireResponse) saved to EHR");
      }
      return;
    }

    // For HIMSS Demo with Mettle always use GCS as payor info
    const managingOrg: Organization = {
      resourceType: "Organization",
      id: "org1111",
      name: "Byrd-Watson",
      identifier: [
        {
          system: "http://hl7.org/fhir/sid/us-npi",
          value: "1437147246"
        }
      ],
      address: [
        {
          use: "work",
          state: "IL",
          postalCode: "62864",
          city: "Mount Vernon",
          line: ["1200 Main St"]
        }
      ]
    };
    const facility: Location = {
      resourceType: "Location",
      id: "loc1234",
      type: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
              code: "IEC",
              display: "Impairment evaluation center"
            }
          ]
        }
      ],
      managingOrganization: {
        reference: "Organization/org1111"
      }
    };

    if(props.bundle){
      const priorAuthBundle: Bundle = JSON.parse(JSON.stringify(props.bundle));
      if (priorAuthBundle && isPriorAuthBundleValid(priorAuthBundle) && priorAuthBundle.entry) {
        priorAuthBundle.entry.unshift({ resource: managingOrg });
        priorAuthBundle.entry.unshift({ resource: facility });
        priorAuthBundle.entry.unshift({ resource: props.request });
        priorAuthBundle.entry.unshift({ resource: qr });

        storeQuestionnaireResponseToEhr(qr, false);

        const priorAuthClaim: Claim = {
          resourceType: "Claim",
          status: "active",
          type: {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/claim-type",
                code: "professional",
                display: "Professional"
              }
            ]
          },
          identifier: [
            {
              system: "urn:uuid:mitre-drls",
              value: uuid()
            }
          ],
          use: "preauthorization",
          patient: { reference: makeReference(priorAuthBundle, "Patient") },
          created: qr.authored || Date.now().toLocaleString(),
          provider: {
            // TODO: make this organization
            reference: makeReference(priorAuthBundle, "Practitioner")
          },
          facility: {
            reference: makeReference(priorAuthBundle, "Location")
          },
          priority: { coding: [{ code: "normal" }] },
          careTeam: [
            {
              sequence: 1,
              provider: {
                reference: makeReference(priorAuthBundle, "Practitioner")
              },
              extension: [
                {
                  url: "http://terminology.hl7.org/ValueSet/v2-0912",
                  valueCode: "OP"
                }
              ]
            }
          ],
          supportingInfo: [
            {
              sequence: 1,
              category: {
                coding: [
                  {
                    system:
                      "http://hl7.org/us/davinci-pas/CodeSystem/PASSupportingInfoType",
                    code: "patientEvent"
                  }
                ]
              },
              timingPeriod: {
                start: "2020-01-01",
                end: "2021-01-01"
              }
            },
            {
              sequence: 2,
              category: {
                coding: [
                  {
                    system:
                      "http://terminology.hl7.org/CodeSystem/claiminformationcategory",
                    code: "info",
                    display: "Information"
                  }
                ]
              },
              valueReference: {
                reference: makeReference(
                  priorAuthBundle,
                  "QuestionnaireResponse"
                )
              }
            }
          ],
          item: [
            {
              sequence: 1,
              careTeamSequence: [1],
              productOrService: getCode() || {},
              quantity: {
                value: 1
              }
              // TODO: add extensions
            }
          ],
          diagnosis: [],
          insurance: [
            {
              sequence: 1,
              focal: true,
              coverage: {
                // TODO: diagnosis is not a reference it must be CodeableConcept
                reference: makeReference(priorAuthBundle, "Coverage")
              }
            }
          ]
        };

        const signature: Signature = {
          type: [
            {
              system: "urn:iso-astm:E1762-95:2013",
              code: "1.2.840.10065.1.12.1.14",
              display: "Source Signature"
            }
          ],
          when:  new Date(Date.now()).toISOString(),
          who:  {
            reference: makeReference(priorAuthBundle, "Practitioner")
          }
        }
        var sequence = 1;
        priorAuthBundle.entry.forEach(function (entry, index) {
          if (entry.resource?.resourceType == "Condition" && priorAuthClaim.diagnosis) {
            priorAuthClaim.diagnosis.push({
              sequence: sequence++,
              diagnosisReference: { reference: "Condition/" + entry.resource.id }
            });
          }
        });
        priorAuthBundle.timestamp = new Date(Date.now()).toISOString()
        priorAuthBundle.language = "en";
        priorAuthBundle.id = uuid();
        priorAuthBundle.meta = {
          lastUpdated: Date.now().toString()
        }
        priorAuthBundle.implicitRules = "http://build.fhir.org/ig/HL7/davinci-pas/StructureDefinition-profile-pas-request-bundle"
        priorAuthBundle.identifier = {
          use: "official",
          system: "urn:uuid:mitre-drls",
          value: uuid()
        }
        priorAuthBundle.signature = signature;
        priorAuthBundle.entry.unshift({ resource: priorAuthClaim });

        const specialtyRxBundle: Bundle = JSON.parse(JSON.stringify(priorAuthBundle));
        specialtyRxBundle.type = "message";
        if (makeReference(priorAuthBundle, "MedicationRequest")) {
          const pharmacy: Organization = {
            resourceType: "Organization",
            id: "pharm0111",
            identifier: [
              {
                system: "http://hl7.org/fhir/sid/us-npi",
                value: "1837247346"
              },
              {
                system: "http://terminology.hl7.org/CodeSystem/NCPDPProviderIdentificationNumber",
                value: "838283882"
              }
            ],
            telecom: [
              {
                system : "phone", 
                value : "919-234-5174",
                use : "work", 
                rank : 1, 
              }
            ],
            address: [
              {
                use: "work",
                state: "IL",
                postalCode: "62864",
                city: "Mount Vernon",
                line: ["1500 Main St"]
              }
            ]
          }

          const specialtyRxSearchResult: Bundle = {
            resourceType: "Bundle",
            type: "searchset",
            id: "bundle02",
            total: 0,
            link: [
              {
                relation: "self",
                url: "",
              }
            ],
            entry: []
          }
          // TODO - Fix hard coded values?
          const specialtyRxParameters: Parameters = {
            resourceType: "Parameters",
            id: "param0111",
            parameter: [
              {
                name: "source-patient",
                valueReference: {reference: makeReference(priorAuthBundle, "Patient")}
              },
              {
                name: "prescription",
                valueReference: {reference: makeReference(priorAuthBundle, "MedicationRequest")}
              },
              {
                name: "pharmacy",
                valueReference: {reference: "Organization/pharm0111"}
              },
              {
                name: "prescriber",
                valueReference: {reference: makeReference(priorAuthBundle, "Practitioner")}
              },
              {
                name: "search-result",
                valueReference: {reference: "Bundle/bundle02"}
              },
    
            ]
          }
    
          const specialtyRxMessageHeader: MessageHeader = {
            resourceType: "MessageHeader",
            id: "msghdr0111",
            eventCoding: {
              system: "http://hl7.org/fhir/us/specialty-rx/CodeSystem/specialty-rx-event-type",
              code: "query-response-unsolicited",
            },
            focus: [
                {reference: "Parameters/param0111"}
            ],
            source: {
              // TODO: url should be dynamically created
              // also if DTR expects to recieve a response it 
              // will need an endpoint to recieve it at
              endpoint: "http://localhost:3005"
            }
    
          }       
          if(!specialtyRxBundle.entry){
            specialtyRxBundle.entry = []
          }
          specialtyRxBundle.entry.unshift({ resource: specialtyRxSearchResult });
          specialtyRxBundle.entry.unshift({ resource: pharmacy });
          specialtyRxBundle.entry.unshift({ resource: specialtyRxParameters });
          specialtyRxBundle.entry.unshift({ resource: specialtyRxMessageHeader });

        }

        console.log("specialtyRx", specialtyRxBundle);


        props.setPriorAuthClaim(priorAuthBundle);
        const options = {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          }
        }
        axios.post("http://localhost:8090/etasu/met", specialtyRxBundle, options).then((response) => {
          const proceedToRems = () => {
            props.setSpecialtyRxBundle(specialtyRxBundle);
            props.setRemsAdminResponse(response)
          }
          if(response.status == 201) {
            proceedToRems()
          } else if(response.status == 200) {
            setShowRxAlert({response: response, rxBundle: specialtyRxBundle, description: "Form was already submitted previously. View current case?", open: true, callback: proceedToRems})
          }
        }).catch((e)=>{
          setShowRxAlert({description: "Encountered an error", open:true})
        })
      } else {
        alert("Prior Auth Bundle is not available or does not contain enough resources for Prior Auth. Can't submit to prior auth.")
      }
    }
  }
  const makeReference = (bundle: Bundle, resourceType: string) => {
    var entry = bundle.entry?.find(function (entry) {
      return entry.resource?.resourceType == resourceType;
    });
    if(!entry) {
      console.warn("Couldn't find entry for resource ", resourceType);
      return;
    } else {
      return resourceType + "/" + entry.resource?.id;
    }
  }
  const isAdaptive = isAdaptiveForm()
  const showPopup = !isAdaptive || isAdaptiveFormWithoutItem();
  return (
    <div>
      <div id="formContainer">
      </div>
      {!isAdaptive && props.formFilled ? <div className="form-message-panel"><p>All fields have been filled. Continue or uncheck "Only Show Unfilled Fields" to review and modify the form.</p></div> : null}
      {
        showPopup ? (
          <SelectPopup
          title={popupInfo.popupTitle}
          options={popupInfo.popupOptions}
          finalOption={popupInfo.popupFinalOption}
          selectedCallback={popupCallback}
          open = {openPopup}
        />
        ) : null
      }
      <AlertDialog title="Alert" rxAlert={showRxAlert} setRxAlert={(e: RxAlert)=>{setShowRxAlert(e)}}></AlertDialog>
      {
        isAdaptive ? (
          <div className="form-message-panel">
            {isAdaptiveFormWithoutItem() && !props.adFormCompleted ? (<p>Click Next Question button to proceed.</p>) : null}
            {!props.adFormCompleted ? (<div> <button className="btn submit-button" onClick={loadNextQuestions}>
              Next Question
            </button>
            </div>) : null}
          </div>) : null
      }
      {
        !isAdaptive ? (<div className="status-panel">
          Form Loaded: {formLoaded}
        </div>) : null
      }
      {getDisplayButtons()}
    </div>)
    ;
}

