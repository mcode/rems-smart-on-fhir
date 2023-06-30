import Box from '@mui/material/Box';
import Client from 'fhirclient/lib/Client';
import './App.css';
import Patient from './views/Patient/PatientView';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { ReactElement, useEffect, useState } from 'react';
import { MemoizedTabPanel } from './TabDisplay';

function tabProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`
  };
}
interface AppProps {
  client: Client;
}
interface SmartTab {
  element: ReactElement;
  name: string;
}
function App(props: AppProps) {
  const client = props.client;
  const [value, setValue] = useState(0);
  const [tabs, setTabs] = useState<SmartTab[]>([]);
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };
  const addTab = (element: ReactElement, tabName: string) => {
    setTabs(oldTabs => [...oldTabs, { element: element, name: tabName }]);
  };
  useEffect(() => {
    setTabs([
      { element: <Patient client={client} tabCallback={addTab} />, name: 'Home' }
      // { element: <p>henlo</p>, name: 'Patient Enrollment Form' }
    ]);
  }, []);

  return (
    <Box className="main">
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          position: 'fixed',
          zIndex: '100',
          width: '100%',
          bgcolor: 'background.paper'
        }}
      >
        <Tabs
          orientation="horizontal"
          variant="scrollable"
          value={value}
          onChange={handleChange}
          aria-label="tabs"
        >
          {tabs.map((tab, i) => {
            return <Tab label={tab.name} {...tabProps(i)} key={i} />;
          })}
        </Tabs>
      </Box>
      <div style={{ paddingTop: '48px' }}>
        {tabs.map((tab, i) => {
          return (
            <MemoizedTabPanel value={value} index={i} key={i} name={tab.name}>
              {tab.element}
            </MemoizedTabPanel>
          );
        })}
      </div>
      {/* <div className='App'>
        <Container className='NavContainer' maxWidth='xl'>
          <div className='containerg'>
            <div className='logo'>
              <ContentPasteIcon sx={{ color: 'white', fontSize: 50, paddingTop: .5, paddingRight: 2.5 }} />
              <h1>REMS SMART on FHIR App</h1>
            </div>
          </div>
        </Container>
      </div> */}
    </Box>
  );
}

export default App;
