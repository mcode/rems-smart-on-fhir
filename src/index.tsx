import React from 'react';
import ReactDOM from 'react-dom/client';

import './index.css';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import FHIR from 'fhirclient';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

const smartLaunch = () => {
  FHIR.oauth2
    .init({
      clientId: 'app-login',
      scope: 'launch openid profile user/Patient.read patient/Patient.read user/Practitioner.read'
    })
    .then(client => {
      console.log(client);
      root.render(
        <React.StrictMode>
          <App client={client} />
        </React.StrictMode>
      );
    });
};

smartLaunch();
