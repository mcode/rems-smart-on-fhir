import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import Box from '@mui/material/Box';
import { Container } from '@mui/system';
import Client from 'fhirclient/lib/Client';
import './App.css';
import Patient from './views/Patient/PatientView';

interface AppProps {
  client: Client
}
function App(props: AppProps) {
  const client = props.client;

  return (
    <Box className='main'>
      <div className='App'>
        <Container className='NavContainer' maxWidth='xl'>
          <div className='containerg'>
            <div className='logo'>
              <ContentPasteIcon sx={{ color: 'white', fontSize: 50, paddingTop: .5, paddingRight: 2.5 }} />
              <h1>REMS SMART on FHIR App</h1>
            </div>
          </div>
        </Container>
      </div>
      <Patient client={client} />
    </Box >
  );
}

export default App;
