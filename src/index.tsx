import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import 'bootstrap/dist/css/bootstrap.min.css';
import FHIR from 'fhirclient';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

interface App {
  client?: React.ReactNode;
}

const smartLaunch = () => {

  FHIR.oauth2
    .init({
      clientId: '20560ea5-f224-4658-b667-4e6bab935c85',
      scope: 'launch/patient openid profile'
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
