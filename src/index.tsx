import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import FHIR from 'fhirclient';
import Client from 'fhirclient/lib/Client';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

interface App {
  client?: Client;
}

const smartLaunch = () => {

  FHIR.oauth2
    .init({
      clientId: process.env.REACT_APP_CLIENT_ID,
      scope: process.env.REACT_APP_CLIENT_SCOPES
    })
    .then(client => {
      root.render(
        <React.StrictMode>
          <App client={client} />
        </React.StrictMode>
      );
    });
};

smartLaunch();
