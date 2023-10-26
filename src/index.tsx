import React from 'react';
import ReactDOM from 'react-dom/client';

import './index.css';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import FHIR from 'fhirclient';
import * as env from 'env-var';
import {
  Box,
  Modal
} from '@mui/material';
import Register from './views/Register';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

const smartLaunch = () => {
  let open = true;

  const modal_style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '1px solid #000',
    boxShadow: 24,
    p: 4
  };

  const submitAuth = (clientId: string, fhirUrl: string ) => {
    console.log('client id -- > ', clientId);
    console.log('fhirUrl -- > ', fhirUrl);
    FHIR.oauth2
    .init({
      clientId: clientId,
      scope: env.get('REACT_APP_CLIENT_SCOPES').asString()
    })
    .then(client => {
      console.log('CLIENT IS --- ', client);
      root.render(
        <React.StrictMode>
          <App client={client} />
        </React.StrictMode>
      );
    });
  };

  root.render(
    <React.StrictMode>
      <Modal open={open} onClose={() => { open = false; }}>
            <Box sx={modal_style}>
              <Register onSubmit={submitAuth}/>
            </Box>
          </Modal>
    </React.StrictMode>
  );

  // FHIR.oauth2
  //   .init({
  //     clientId: env.get('REACT_APP_CLIENT_ID').asString(),
  //     scope: env.get('REACT_APP_CLIENT_SCOPES').asString()
  //   })
  //   .then(client => {
  //     console.log('CLIENT IS --- ', client);
  //     root.render(
  //       <React.StrictMode>
  //         <App client={client} />
  //       </React.StrictMode>
  //     );
  //   });
};

smartLaunch();
