import React, { Component, useEffect, useState } from 'react';
import ResourceEntry from './ResourceEntry';
import './RemsInterface.css';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { Bundle, MedicationRequest, MessageHeader, Parameters, Patient } from 'fhir/r4';
const colorPicker = {
  Pending: '#f0ad4e',
  Approved: '#5cb85c'
};
interface RemsInterfaceProps {
  remsAdminResponse: RemsAdminResponse;
  specialtyRxBundle: Bundle;
}
interface RemsAdminResponse {
  data: JsonData;
}
interface JsonData {
  case_number: string;
  status: string;
  metRequirements: [
    {
      requirementName: string;
      completed: boolean;
      requirementDescription: string;
    }
  ];
}
export default function RemsInterface(props: RemsInterfaceProps) {
  const [claimResponseBundle, setClaimResponseBundle] = useState<Bundle | null>(null);
  const [remsAdminResponse, setRemsAdminResponse] = useState<RemsAdminResponse | null>(null);
  const [response, setResponse] = useState<AxiosResponse | null>(null);
  const [spin, setSpin] = useState<boolean>(false);
  const [spinPis, setSpinPis] = useState<boolean>(false);
  const [viewResponse, setViewResponse] = useState<boolean>(false);
  const [viewBundle, setViewBundle] = useState<boolean>(false);
  const [viewPisBundle, setViewPisBundle] = useState<boolean>(false);

  useEffect(() => {
    sendRemsMessage();
  }, []);

  const getAxiosOptions = () => {
    const options: AxiosRequestConfig = {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    };
    return options;
  };

  const unfurlJson = (jsonData: JsonData) => {
    return jsonData.metRequirements.map(metReq => {
      console.log(metReq);
      return (
        <div>
          <div className={'resource-entry etasu-container'}>
            <div className={'resource-entry-text'}>{metReq.requirementName}</div>
            <div className={'resource-entry-icon'}>{metReq.completed ? '✅' : '❌'}</div>
            <div className={'resource-entry-hover'}>{metReq.requirementDescription}</div>
          </div>
        </div>
      );
    });
  };

  const getResource = (bundle: Bundle, resourceReference: string) => {
    const temp = resourceReference.split('/');
    const _resourceType = temp[0];
    const _id = temp[1];
    if (bundle.entry) {
      for (let i = 0; i < bundle.entry.length; i++) {
        if (
          bundle.entry[i].resource?.resourceType === _resourceType &&
          bundle.entry[i].resource?.id === _id
        ) {
          return bundle.entry[i].resource;
        }
      }
    }

    return null;
  };
  const sendGetRx = () => {
    if (props.specialtyRxBundle.entry && props.specialtyRxBundle.entry[0].resource) {
      // extract params and questionnaire response identifier
      const messageHeader: MessageHeader = props.specialtyRxBundle.entry[0]
        .resource as MessageHeader;
      if (messageHeader.focus?.[0]?.reference) {
        const potentialParams = getResource(
          props.specialtyRxBundle,
          messageHeader.focus[0].reference
        );
        if (potentialParams) {
          const params = potentialParams as Parameters;
          // stakeholder and medication references
          let prescriptionReference = '';
          let patientReference = '';
          if (params.parameter) {
            for (const param of params.parameter) {
              if (
                param.name === 'prescription' &&
                param.valueReference &&
                param.valueReference.reference
              ) {
                prescriptionReference = param.valueReference.reference;
              } else if (
                param.name === 'source-patient' &&
                param.valueReference &&
                param.valueReference.reference
              ) {
                patientReference = param.valueReference.reference;
              }
            }
          }

          // obtain drug information from database
          const potentialPrescription = getResource(props.specialtyRxBundle, prescriptionReference);
          const potentialPatient = getResource(props.specialtyRxBundle, patientReference);
          if (potentialPrescription && potentialPatient) {
            const prescription = potentialPrescription as MedicationRequest;
            const simpleDrugName =
              prescription.medicationCodeableConcept?.coding?.[0].display?.split(' ')[0];
            const rxDate = prescription.authoredOn;
            const patient = potentialPatient as Patient;
            const patientFirstName = patient.name?.[0].given?.[0];
            const patientLastName = patient.name?.[0].family;
            const patientDOB = patient.birthDate;
            axios
              .get(
                `http://localhost:5051/doctorOrders/api/getRx/${patientFirstName}/${patientLastName}/${patientDOB}?simpleDrugName=${simpleDrugName}&rxDate=${rxDate}`,
                getAxiosOptions()
              )
              .then(response => {
                setResponse(response);
              });
          }
        }
      }
    }
  };
  const sendRemsMessage = async () => {
    const remsAdminResponse = props.remsAdminResponse;
    setRemsAdminResponse(remsAdminResponse);
    //  Will not send post request to PIS if only for patient enrollment
    if (remsAdminResponse?.data?.case_number) {
      sendGetRx();
    }
  };

  const toggleBundle = () => {
    setViewBundle(!viewBundle);
  };

  const toggleResponse = () => {
    setViewResponse(!viewResponse);
  };

  const togglePisBundle = () => {
    setViewPisBundle(!viewPisBundle);
  };

  const renderBundle = (bundle: Bundle) => {
    return bundle.entry?.map(entry => {
      const resource = entry.resource;
      if (resource) {
        return (
          <div>
            <ResourceEntry resource={resource}></ResourceEntry>
          </div>
        );
      }
    });
  };

  const refreshPisBundle = () => {
    setSpinPis(true);
    sendGetRx();
  };

  const refreshBundle = () => {
    setSpin(true);
    axios
      .get(`http://localhost:8090/etasu/met/${remsAdminResponse?.data.case_number}`)
      .then(response => {
        setRemsAdminResponse(response);
      });
  };

  const status = remsAdminResponse?.data?.status;
  let color = '#f7f7f7';
  if (status === 'Approved') {
    color = '#5cb85c';
  } else if (status === 'Pending') {
    color = '#f0ad4e';
  }

  let colorPis = '#f7f7f7';
  const statusPis = response?.data?.dispenseStatus;

  if (statusPis === 'Approved') {
    colorPis = '#5cb85c';
  } else if (statusPis === 'Pending') {
    colorPis = '#f0ad4e';
  } else if (statusPis === 'Picked Up') {
    colorPis = '#0275d8';
  }

  // Checking if REMS Request (pt enrollment) || Met Requirments (prescriber Form)
  const hasRemsCase = remsAdminResponse?.data?.case_number ? true : false;

  return (
    <div>
      <div>
        {hasRemsCase ? (
          <div>
            <div className="container left-form">
              <h1>REMS Admin Status</h1>
              <Paper style={{ paddingBottom: '5px' }}>
                <div className="status-icon" style={{ backgroundColor: color }}></div>
                <div className="bundle-entry">
                  Case Number : {remsAdminResponse?.data?.case_number || 'N/A'}
                </div>
                <div className="bundle-entry">Status: {remsAdminResponse?.data?.status}</div>
                <div className="bundle-entry">
                  <Button variant="contained" onClick={toggleBundle}>
                    View Bundle
                  </Button>
                  <Button variant="contained" onClick={toggleResponse}>
                    View ETASU
                  </Button>

                  {remsAdminResponse?.data?.case_number ? (
                    <AutorenewIcon
                      className={spin === true ? 'refresh' : 'renew-icon'}
                      onClick={refreshBundle}
                      onAnimationEnd={() => setSpin(false)}
                    />
                  ) : (
                    ''
                  )}
                </div>
              </Paper>
              {viewResponse ? (
                <div className="bundle-view">
                  <br></br>
                  <h3>ETASU</h3>
                  {remsAdminResponse ? unfurlJson(remsAdminResponse.data) : ''}
                </div>
              ) : (
                ''
              )}
              {viewBundle ? (
                <div className="bundle-view">
                  <br></br>
                  <h3>Bundle</h3>
                  {renderBundle(props.specialtyRxBundle)}
                </div>
              ) : (
                ''
              )}
            </div>

            <div className="right-form">
              <h1>Pharmacy Status</h1>
              <Paper style={{ paddingBottom: '5px' }}>
                <div className="status-icon" style={{ backgroundColor: colorPis }}></div>
                <div className="bundle-entry">ID : {response?.data?._id || 'N/A'}</div>
                <div className="bundle-entry">Status: {response?.data?.dispenseStatus}</div>
                <div className="bundle-entry">
                  {/* <Button variant="contained" onClick={this.togglePisBundle}>View Bundle</Button> */}
                  {response?.data?._id ? (
                    <AutorenewIcon
                      className={spinPis === true ? 'refresh' : 'renew-icon'}
                      onClick={refreshPisBundle}
                      onAnimationEnd={() => setSpinPis(false)}
                    />
                  ) : (
                    ''
                  )}
                </div>
              </Paper>
              {viewPisBundle ? (
                <div className="bundle-view">
                  <br></br>
                  <h3>Bundle</h3>
                  {renderBundle(props.specialtyRxBundle)}
                </div>
              ) : (
                ''
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="container left-form">
              <h1>Prescriber Document Status</h1>
              <Paper style={{ paddingBottom: '5px' }}>
                <div className="status-icon" style={{ backgroundColor: '#5cb85c' }}></div>
                <div className="bundle-entry">Status: Documents successfully submitted</div>
                <div className="bundle-entry">
                  <Button variant="contained" onClick={toggleBundle}>
                    View Bundle
                  </Button>

                  {remsAdminResponse?.data?.case_number ? (
                    <AutorenewIcon
                      className={spin === true ? 'refresh' : 'renew-icon'}
                      onClick={refreshBundle}
                      onAnimationEnd={() => setSpin(false)}
                    />
                  ) : (
                    ''
                  )}
                </div>
              </Paper>
              {viewBundle ? (
                <div className="bundle-view">
                  <br></br>
                  <h3>Bundle</h3>
                  {renderBundle(props.specialtyRxBundle)}
                </div>
              ) : (
                ''
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
