import { memo, useState, useEffect } from 'react';
import FHIR from 'fhirclient';
import env from 'env-var';
import Register from './Register';
interface Client {
  name: string;
  client: string;
}
const Launch = () => {
  const [content, setContent] = useState(
    <div className="loading">
      <h1>Launching...</h1>
    </div>
  );
  useEffect(() => {
    document.title = 'REMS SMART on FHIR app launch page';
    smartLaunch();
  }, []);

  const smartLaunch = () => {
    let clients: Client[] = JSON.parse(localStorage.getItem('clients') || '[]');
    if (clients.length === 0) {
      const defaultClient = env.get('REACT_APP_DEFAULT_CLIENT_ID').asString();
      const defaultIss = env.get('REACT_APP_DEFAULT_ISS').asString();
      if (defaultClient && defaultIss) {
        clients = [{ client: defaultClient, name: defaultIss }];
        localStorage.setItem('clients', JSON.stringify(clients));
      }
    }
    const clientIdMap = env.get('REACT_APP_CLIENT_ID_MAP').asString();
    let configuredClients: Client[] = [];
    if (clientIdMap) {
      try {
        const parsed = JSON.parse(clientIdMap);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Expected an object mapping EHR URLs to client IDs');
        }
        configuredClients = Object.entries(parsed).map(([name, client]) => {
          if (typeof client !== 'string') {
            throw new Error('Expected client IDs to be strings');
          }
          return { name: name.replace(/\/+$/, ''), client };
        });
      } catch (e) {
        console.log('Invalid REACT_APP_CLIENT_ID_MAP:', e);
      }
    }
    const urlSearchString = window.location.search;
    const params = new URLSearchParams(urlSearchString);
    const iss = params.get('iss');
    if (iss) {
      const normalizedIss = iss.replace(/\/+$/, '');
      const configuredClient = configuredClients.find(e => e.name === normalizedIss);
      if (configuredClients.length > 0 && !configuredClient) {
        setContent(<div>This EHR ({iss}) is not registered for this app.</div>);
        return;
      }
      const storedClient =
        configuredClient ||
        clients.find(e => {
          return e.name == iss;
        });

      if (storedClient) {
        // found matching iss
        const clientId = storedClient.client;
        FHIR.oauth2
          .authorize({
            clientId: clientId,
            scope: env.get('REACT_APP_CLIENT_SCOPES').asString(),
            redirectUri: env.get('REACT_APP_REDIRECT_URI').asString() || '/index'
          })
          .catch(e => {
            console.log(e);
          });
      } else {
        setContent(<Register callback={smartLaunch} fhirUrl={iss} />);
      }
    } else {
      setContent(<div>iss not found</div>);
    }
  };

  return <div>{content}</div>;
};

export default memo(Launch);
