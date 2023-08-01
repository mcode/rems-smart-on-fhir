import {
  DeviceRequest,
  FhirResource,
  MedicationRequest,
  Questionnaire,
  QuestionnaireResponse,
  QuestionnaireResponseItem,
  ServiceRequest
} from 'fhir/r4';
interface MyObject {
  [key: string]: any;
}

export interface AppContext {
  questionnaire?: string;
  response?: string;
  order?: string;
  coverage?: string;
}
// to get FHIR properties of the form answer{whatever}
export function getAppContext(appContextString: string) {
  const appContext: AppContext = {};
  // Fix + encoded spaces back to precent encoded spaces
  const encodedAppString = appContextString.replace(/\+/g, '%20');
  const appString = decodeURIComponent(encodedAppString);
  // Could switch to this later
  appString.split('&').map(e => {
    const temp = e.split('=');
    if (
      temp[0] === 'questionnaire' ||
      temp[0] === 'order' ||
      temp[0] === 'coverage' ||
      temp[0] === 'response'
    ) {
      appContext[temp[0]] = temp[1];
    }
  });
  return appContext;
}
export function findValueByPrefix(object: MyObject, prefix: string) {
  for (const property in object) {
    if (object.hasOwnProperty(property) && property.toString().startsWith(prefix)) {
      return object[property];
    }
  }
}

export function searchQuestionnaire(
  questionnaire: QuestionnaireResponseItem,
  attestation: string[]
) {
  const result = questionnaire;
  if (questionnaire.item) {
    questionnaire.item.forEach(item => {
      searchQuestionnaire(item, attestation);
      console.log(item);
    });
  } else {
    if (
      attestation.find(e => {
        return e === questionnaire.linkId;
      })
    ) {
      if (!questionnaire.answer) {
        questionnaire.answer = [];
      }
      return questionnaire.answer.push({
        valueCoding: {
          code: '410515003',
          system: 'http://snomed.info/sct',
          display: 'known present'
        }
      });
    }
  }
  return result;
}

export function retrieveQuestions(url: string, body: object) {
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/fhir+json' },
    body: JSON.stringify(body)
  };

  return fetch(url, requestOptions);
}

export function buildNextQuestionRequest(
  questionnaire: Questionnaire,
  questionnaireResponse: QuestionnaireResponse
) {
  let requestBody: QuestionnaireResponse = {
    resourceType: 'QuestionnaireResponse',
    meta: {
      profile: ['http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaireresponse-adapt']
    },
    contained: [],
    status: 'in-progress'
  };
  if (questionnaireResponse) {
    requestBody = questionnaireResponse;
  }

  requestBody.status = 'in-progress';
  requestBody.contained = [];
  requestBody.contained.push(questionnaire);

  requestBody.questionnaire = `#${questionnaire.id}`;

  const questionnaireReference = {
    url: 'http://hl7.org/fhir/StructureDefinition/contained-id',
    valueReference: {
      reference: `#${questionnaire.id}`
    }
  };
  if (requestBody.extension) {
    requestBody.extension.push(questionnaireReference);
  } else {
    requestBody.extension = [questionnaireReference];
  }

  return requestBody;
}

export function isRequestReference(reference: string) {
  const re = /^(?:DeviceRequest|MedicationRequest|ServiceRequest)\/.+$/;
  return re.exec(reference) ? true : false;
}

export function checkOrderType(order: FhirResource) {
  if (order.resourceType === 'DeviceRequest') {
    return order as DeviceRequest;
  } else if (order.resourceType === 'MedicationRequest') {
    return order as MedicationRequest;
  } else if (order.resourceType === 'ServiceRequest') {
    return order as ServiceRequest;
  } else {
    return null;
  }
}

export function buildFhirUrl(reference: string, fhirPrefix: string, fhirVersion: string) {
  if (reference.startsWith('http')) {
    const endIndex = reference.lastIndexOf('/');
    const startIndex = reference.lastIndexOf('/', endIndex - 1) + 1;
    const resoruce = reference.substr(startIndex, endIndex - startIndex);
    return fhirPrefix + fhirVersion + '/' + resoruce + '?url=' + reference;
  } else {
    return fhirPrefix + fhirVersion + '/' + reference;
  }
}

export function fetchFhirVersion(fhirServer: string) {
  return new Promise<string>(function (resolve, reject) {
    console.log('fetchFhirVersion from ' + fhirServer);

    function handleFetchErrors(response: Response) {
      if (!response.ok) {
        const msg = 'Failure when fetching CapabilityStatement to find FHIR version';
        const details = `${msg}: ${response.url}: the server responded with a status of ${response.status} (${response.statusText})`;
        console.log(msg + ': errorClass: ' + details);
        reject(msg);
      }
      return response;
    }

    fetch(fhirServer + '/metadata?_format=json')
      .then(handleFetchErrors)
      .then(r => r.json())
      .then(capabilityStatement => {
        const fhirV4 = ['4.0.1', '4.0.0', '3.5a.0', '3.5.0', '3.3.0', '3.2.0'];
        const fhirStu3 = ['3.0.2', '3.0.1', '3.0.0', '1.8.0', '1.6.0', '1.4.0', '1.2.0', '1.1.0'];
        const fhirDstu2 = ['1.0.2', '1.0.1', '1.0.0', '0.5.0', '0.4.0'];
        const fhirDstu1 = ['0.0.82', '0.11', '0.06', '0.05'];

        let fhirVersion = 'unknown';
        if (fhirV4.includes(capabilityStatement.fhirVersion)) {
          fhirVersion = 'r4';
        } else if (fhirStu3.includes(capabilityStatement.fhirVersion)) {
          fhirVersion = 'stu3';
        } else if (fhirDstu2.includes(capabilityStatement.fhirVersion)) {
          fhirVersion = 'dstu2';
        } else if (fhirDstu1.includes(capabilityStatement.fhirVersion)) {
          fhirVersion = 'dstu1';
        }

        console.log(
          'fetched CapabilityStatement successfully, FHIR version:  ' +
            capabilityStatement.fhirVersion +
            ' (' +
            fhirVersion +
            ')'
        );
        resolve(fhirVersion);
      })
      .catch(err => {
        console.log('error doing fetch():' + err);
        reject(err);
      });
  });
}

export default fetchFhirVersion;
