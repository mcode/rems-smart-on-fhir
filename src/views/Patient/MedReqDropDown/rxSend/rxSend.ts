import buildNewRxRequest from './buildScript.2017071';
import { Practitioner, Patient, MedicationRequest } from 'fhir/r4';

export default function sendRx(
  patient: Patient,
  practitioner: Practitioner,
  request: MedicationRequest
) {
  const pimsUrl = process.env.REACT_APP_PHARMACY_SERVER_BASE;

  // build the NewRx Message
  const newRx = buildNewRxRequest(patient, practitioner, request);
  console.log(newRx);
  const serializer = new XMLSerializer();
  if (pimsUrl) {
    fetch(`${pimsUrl}/doctorOrders/api/addRx`, {
      method: 'POST',
      //mode: 'no-cors',
      headers: {
        Accept: 'application/xml',
        'Content-Type': 'application/xml'
      },
      body: serializer.serializeToString(newRx)
    })
      .then(response => {
        console.log('sendRx response: ');
        console.log(response);
      })
      .catch(error => {
        console.log('sendRx error: ');
        console.log(error);
      });
  }
}
