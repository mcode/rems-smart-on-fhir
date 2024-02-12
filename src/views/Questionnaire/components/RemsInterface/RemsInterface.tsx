import React, { useEffect, useState } from 'react';
import ResourceEntry from './ResourceEntry';
import './RemsInterface.css';
import axios from 'axios';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { Bundle, MedicationDispense, BundleEntry, MessageHeader, Parameters } from 'fhir/r4';
import * as env from 'env-var';

interface RemsInterfaceProps {
  remsAdminResponse: RemsAdminResponse;
  specialtyRxBundle: Bundle;
}
interface RemsAdminResponse {
  data: JsonData;
}

type MetRequirements = {
  completed: boolean;
  requirementName: string;
  requirementDescription: string;
};

interface JsonData {
  case_number: string;
  status: string;
  metRequirements: MetRequirements[];
}

export default function RemsInterface(props: RemsInterfaceProps) {
  const [remsAdminResponse, setRemsAdminResponse] = useState<RemsAdminResponse | null>(null);
  const [response, setResponse] = useState<BundleEntry<MedicationDispense> | null>(null);
  const [spin, setSpin] = useState<boolean>(false);
  const [spinPis, setSpinPis] = useState<boolean>(false);
  const [viewResponse, setViewResponse] = useState<boolean>(false);
  const [viewBundle, setViewBundle] = useState<boolean>(false);

  useEffect(() => {
    sendRemsMessage();
  }, []);

  const unfurlJson = (jsonData: JsonData) => {
    return jsonData.metRequirements
      .sort((first: MetRequirements, second: MetRequirements) => {
        // Keep the other forms unsorted.
        if (second.requirementName.includes('Patient Status Update')) {
          // Sort the Patient Status Update forms in descending order of timestamp.
          return second.requirementName.localeCompare(first.requirementName);
        }
        return 0;
      })
      .map(metReq => {
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
  const refreshPharmacyBundle = () => {
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
          if (params.parameter) {
            for (const param of params.parameter) {
              if (
                param.name === 'prescription' &&
                param.valueReference &&
                param.valueReference.reference
              ) {
                prescriptionReference = param.valueReference.reference;
              } 
            }
          }

          // obtain drug information from database
          const potentialPrescription = getResource(props.specialtyRxBundle, prescriptionReference);

          const rxId = potentialPrescription?.id;
          // // now get new url hit:

          const url = `${env.get('REACT_APP_DEFAULT_ISS').asString()}/MedicationDispense?prescription=${rxId}`;
          axios({
            method: 'get',
            url: url
          }).then(
            response => {
              setResponse(response?.data?.entry ? response?.data?.entry[0] : null);
            },
            error => {
              console.log(error);
            }
          );
        }
      }
    }
  };
  const sendRemsMessage = async () => {
    const remsAdminResponse = props.remsAdminResponse;
    setRemsAdminResponse(remsAdminResponse);
    //  Will not send post request to PIS if only for patient enrollment
    if (remsAdminResponse?.data?.case_number) {
      refreshPharmacyBundle();
    }
  };

  const toggleBundle = () => {
    setViewBundle(!viewBundle);
  };

  const toggleResponse = () => {
    setViewResponse(!viewResponse);
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
    refreshPharmacyBundle();
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

  let colorPis = '#0c0c0c';
  const statusPis = response?.resource?.status;

  if (statusPis === 'completed') {
    colorPis = '#5cb85c';
  }

  // Checking if REMS Request (pt enrollment) || Met Requirments (prescriber Form)
  const hasRemsCase = remsAdminResponse?.data?.case_number ? true : false;

  return (
    <div>
      <div>
        {hasRemsCase ? (
          <div>
            <div className="left-form">
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
                <div className="bundle-entry">ID : {response?.resource?.id || 'N/A'}</div>
                <div className="bundle-entry">Status: {response?.resource?.status ? response?.resource?.status?.charAt(0).toUpperCase() + response?.resource?.status?.slice(1) : 'N/A'}</div>
                <div className="bundle-entry">
                  {response?.resource?.id ? (
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
            </div>
          </div>
        ) : (
          <div>
            <div className="left-form">
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
