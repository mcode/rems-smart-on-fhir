import { Button, FormControl, FormHelperText, IconButton, TextField } from '@mui/material';
import React, { FormEvent, memo, useState, useEffect } from 'react';
import CloseIcon from '@mui/icons-material/Close';

interface RegisterProps {
  callback?: () => void;
  fhirUrl?: string;
}

type ClientConfig = {
  name: string;
  client: string;
};

const Register = (props: RegisterProps) => {
  const [clientId, setClientId] = useState<string>('');
  const [fhirUrl, setFhirUrl] = useState<string>(props.fhirUrl || '');
  useEffect(() => {
    document.title = 'Registration page for SMART on FHIR clients';
  });
  const [currentClients, setCurrentClients] = useState<ClientConfig[]>(
    JSON.parse(localStorage.getItem('clients') || '[]')
  );

  function submit(event: FormEvent) {
    console.log('new selection add to LS');
    const newClients: ClientConfig[] = [...currentClients, { name: fhirUrl, client: clientId }];
    setCurrentClients(newClients);
    localStorage.setItem('clients', JSON.stringify(newClients));
    if (props.callback) {
      event.preventDefault();
      props.callback(); // try launching again
    }
    return false;
  }

  function deleteClient(client: ClientConfig) {
    const newClients = currentClients.filter(
      c => !(c.name === client.name && c.client === client.client)
    );
    localStorage.setItem('clients', JSON.stringify(newClients));
    setCurrentClients(newClients);
  }

  return (
    <div>
      <div className="register-page">
        <h2 style={{ marginBottom: '25px' }}>Register</h2>
        {props.callback ? <h6>Client ID not found. Please register the client ID.</h6> : ''}
        <br />
        <form onSubmit={submit} autoComplete="off">
          <FormControl fullWidth={true} required={true} margin="normal">
            <TextField
              id="clientId"
              label="Client ID"
              aria-describedby="clientIdHelp"
              value={clientId}
              onChange={e => {
                setClientId(e.target.value);
              }}
            />
            <FormHelperText id="clientIdHelp">
              Clients must be registered with the FHIR server out of band.
            </FormHelperText>
          </FormControl>
          <FormControl fullWidth={true} required={true} margin="normal">
            <TextField
              id="fhirIss"
              label="ISS"
              aria-describedby="fhirIssHelp"
              value={fhirUrl}
              onChange={e => {
                setFhirUrl(e.target.value);
              }}
            />
            <FormHelperText id="fhirIssHelp">
              The ISS is the base url of the FHIR server.
            </FormHelperText>
          </FormControl>
          <Button type="submit" variant="outlined" disabled={clientId === '' || fhirUrl === ''}>
            {props.callback ? 'Submit and Retry' : 'Submit'}
          </Button>
        </form>
        <hr style={{ color: '#000000', width: '80%' }} />
        <div className="current-selection">
          <h4>Existing Client Ids</h4>
          {currentClients.map((client: ClientConfig, index: React.Key | null | undefined) => {
            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '35px' }}>
                  <b>{client.name}</b>: {client.client}
                </span>
                <IconButton
                  style={{ marginRight: '5px' }}
                  onClick={() => {
                    deleteClient(client);
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </div>
            );
          })}
        </div>
        <hr style={{ color: '#000000', width: '80%' }} />
      </div>
    </div>
  );
};

export default memo(Register);
