import { Coding, Questionnaire, QuestionnaireItem, QuestionnaireItemAnswerOption, QuestionnaireResponse, QuestionnaireResponseItem, ValueSet } from 'fhir/r4';
import { useEffect, useState } from 'react';
import { findValueByPrefix } from './questionnaireUtil';
import Client from 'fhirclient/lib/Client';
import ConfigData from "../../config.json";

interface QuestionnaireProps {
  response: QuestionnaireResponse
  qform: Questionnaire
  standalone: Boolean
  cqlPrepopulationResults: PrepopulationResults
  smartClient: Client
}
interface PrepopulationResults {
  [key: string]: {
    [key: string]: any 
  }
}
interface GTableResult {
  [key: string]: any
}
type PrepopulationResult = string | number | boolean | Coding

function QuestionnaireForm(props: QuestionnaireProps) {
  const [savedResponse, setSavedResponse] = useState<QuestionnaireResponse | null>(null);

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
          let prepopulationResult = getLibraryPrepopulationResult(item, props.cqlPrepopulationResults);

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
          let prepopulationResult = getLibraryPrepopulationResult(item, props.cqlPrepopulationResults);

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

    smart.request(questionnaireResponseUrl).then((result) => {
        popupClear("Would you like to load a previously in-progress form?", "Cancel", false);
        processSavedQuestionnaireResponses(result, showError);
      }, ((result) => {
        popupClear("Error: failed to load previous in-progress forms", "OK", true);
        popupLaunch();
      })).catch(console.error);
  }
  const getPatient = () => {
    var p = "Unknown";
    var requestType = "Unknown";
    if (this.patientId) {
      p = `Patient/${this.patientId}`;
    } else if (this.props.deviceRequest) {
      requestType = this.props.deviceRequest.resourceType;
      if (requestType == "DeviceRequest") {
        p = this.props.deviceRequest.subject.reference;
      } else if (requestType == "ServiceRequest") {
        p = this.props.deviceRequest.subject.reference;
      } else if (requestType == "MedicationRequest") {
        p = this.props.deviceRequest.subject.reference;
      }
    }
    console.log("getPatient(): " + requestType + ": " + p);
    return p;
  }

}

