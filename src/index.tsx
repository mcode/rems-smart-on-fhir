import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from "react-router-dom";

import './index.css';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import FHIR from 'fhirclient';
import Client from 'fhirclient/lib/Client';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

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
          <BrowserRouter>
            <Routes>
              <Route index element={<App client={client} />}></Route>
              {/* <Route path="launch" element={<SmartLaunch />}></Route> */}
            </Routes>
          </BrowserRouter>
        </React.StrictMode>
      );
    });
};

smartLaunch();
