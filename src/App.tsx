import ContentPasteIcon from '@mui/icons-material/ContentPaste';import { Button } from '@mui/material';
import Box from '@mui/material/Box';
import { Container } from '@mui/system';
import './App.css';



function App() {
  return (
    <Box >
        <div className='App'>
          <Container className='NavContainer' maxWidth='xl'>
            <div className='containerg'>
              <div className='logo'>
                <ContentPasteIcon sx={{ color: 'white', fontSize: 40, paddingTop: 2.5, paddingRight: 2.5 }} />
                <h1>REMS SMART on FHIR App</h1>
              </div>
            </div>
          </Container>
        </div>
    </Box >
  );
}

export default App;
