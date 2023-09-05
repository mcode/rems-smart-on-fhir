import Box from '@mui/material/Box';
import Client from 'fhirclient/lib/Client';
import './App.css';
import Patient from './views/Patient/PatientView';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CloseIcon from '@mui/icons-material/CloseOutlined';

import { ReactElement, useCallback, useEffect, useState, MouseEvent } from 'react';
import { MemoizedTabPanel } from './TabDisplay';
import { IconButton } from '@mui/material';
import { SmartApp } from './views/Questionnaire/SmartApp';
import { AppContext, getAppContext } from './views/Questionnaire/questionnaireUtil';

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
  groupName?: string;
  id: string;
  closeable: boolean;
}
function App(props: AppProps) {
  const client = props.client;
  const [value, setValue] = useState('');
  const [tabs, setTabs] = useState<SmartTab[]>([]);
  const [staticContent, setStaticContent] = useState<ReactElement>();
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(tabs[newValue].id);
  };
  const addTab = (element: ReactElement, tabName: string, groupName: string, tabIndex = 0) => {
    const tabId = `${tabName}-${tabIndex}`;
    setTabs(oldTabs => [
      ...oldTabs,
      { element: element, name: tabName, id: tabId, closeable: true, groupName: groupName }
    ]);
    setValue(tabId);
  };

  useEffect(() => {
    const homeName = 'Home';
    let appContext: AppContext | null = null;
    if (client.state.tokenResponse?.appContext) {
      appContext = getAppContext(client.state.tokenResponse?.appContext);
      // launched with an app context already available
    }
    if (appContext && (appContext.questionnaire || appContext.response)) {
      const smartApp = (
        <SmartApp
          smartClient={props.client}
          standalone={false}
          appContext={appContext}
          patientId={client.getPatientId() || ''}
          tabIndex={0}
        />
      );
      setStaticContent(smartApp);
    } else {
      setTabs([
        {
          element: <Patient client={client} tabCallback={addTab} />,
          name: homeName,
          id: homeName,
          closeable: false
        }
      ]);
    }
    setValue(homeName);
  }, []);

  const handleClose = useCallback(
    (event: MouseEvent, tabToDelete: SmartTab) => {
      event.stopPropagation();
      const tabToDeleteIndex = tabs.findIndex(tab => {
        return tab.id === tabToDelete.id;
      });
      if (tabToDeleteIndex > 0 && value === tabToDelete.id) {
        setValue(tabs[tabToDeleteIndex - 1].id);
      }
      const newTabs = tabs.filter((tab, index) => {
        return index !== tabToDeleteIndex;
      });
      setTabs(newTabs);
    },
    [tabs]
  );

  return (
    <Box className="main">
      {staticContent ? (
        staticContent
      ) : (
        <div>
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
              value={tabs.findIndex(tab => {
                return tab.id === value;
              })}
              onChange={handleChange}
              aria-label="tabs"
            >
              {tabs.map((tab, i) => {
                return (
                  <Tab
                    style={{ maxWidth: '500px' }}
                    label={
                      typeof tab.name === 'string' ? (
                        <span>
                          {tab.groupName ? <span> {tab.groupName} </span> : null} {tab.name}
                          {tab.closeable && (
                            <IconButton
                              component="div"
                              onClick={event => handleClose(event, tab)}
                              style={{ padding: '0px 5px 0px 5px' }}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          )}
                        </span>
                      ) : (
                        tab.name
                      )
                    }
                    {...tabProps(i)}
                    key={i}
                  />
                );
              })}
            </Tabs>
          </Box>
          <div style={{ paddingTop: '48px' }}>
            {tabs.map((tab, i) => {
              return (
                <MemoizedTabPanel
                  value={tabs.findIndex(tab => {
                    return tab.id === value;
                  })}
                  index={i}
                  key={i}
                  name={tab.name}
                >
                  {tab.element}
                </MemoizedTabPanel>
              );
            })}
          </div>
        </div>
      )}
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
