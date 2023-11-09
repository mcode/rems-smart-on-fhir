import React from 'react';
import ReactDOM from 'react-dom/client';

import './index.css';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FHIR from 'fhirclient';
import * as env from 'env-var';
import Register from './views/Register';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

const smartLaunch = () => {
  // Get selected client saved in local storage
  const selectedClient = JSON.parse(localStorage.getItem('selectedClient') || '{}');
  // set the client ID 
  let selectedClientId = env.get('REACT_APP_CLIENT_ID').asString();
  if (Object.keys(selectedClient).length) {
    selectedClientId = selectedClient.client;
  }
  console.log('client id --- > ', selectedClientId);
  // TODO: get rid of using the init, need to look up iss first, then see if it is the right client id then auth
  // currently when launched from request generator the  retrieveLaunchContext function makes a POST to the iss and all that information
  // gets passed along when opening the smart app. The init call from oauth2 does the lookup of client id with iss behind the scenes
  // so we want to udpate that
  // I think the ideal scenario is -- Get the iss from the url params then on this auth it should look up the iss 
  // and see if the correct client id is registered with it. If so, authorize to continue
  FHIR.oauth2
    .init({
      clientId: selectedClientId,
      scope: env.get('REACT_APP_CLIENT_SCOPES').asString()
    })
    .then(client => {
      console.log('CLIENT IS --- ', client);
      root.render(
        <Router>
          <Routes>
            <Route path="/" element={<App client={client} />} />
            <Route
              path="/register"
              element={ <Register />}
            />
          </Routes>
        </Router>
      );
    });
};

const launch = () => {
  const urlSearchString = window.location.search;
  const params = new URLSearchParams(urlSearchString);
  // if the route is coming from request generator it will have iss and state params, 
  // if so do smart launch to auth with client
  if (params.get('iss') || params.get('state')) {
    smartLaunch();
  } else {
    // if not, render just the register page so no authentication is required
    root.render(
      <Router>
        <Routes>
          <Route
            path="/register"
            element={ <Register />}
          />
        </Routes>
      </Router>
    );
  }
};

launch();
