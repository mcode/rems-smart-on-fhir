import React from 'react';
import ReactDOM from 'react-dom/client';

import './index.css';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import FHIR from 'fhirclient';
import * as env from 'env-var';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

const smartLaunch = () => {
  FHIR.oauth2
    .init({
      clientId: env.get('REACT_APP_CLIENT_ID').asString(),
      scope: env.get('REACT_APP_CLIENT_SCOPES').asString()
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
