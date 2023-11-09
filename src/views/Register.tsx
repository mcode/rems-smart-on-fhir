import { Button, IconButton } from '@mui/material';
import React, { memo, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';

const Register = () => {
    const [clientId, setClientId] = useState<string>('');
    const [fhirUrl, setFhirUrl] = useState<string>('');

    const [currentClients, setCurrentClients] = useState(JSON.parse(localStorage.getItem('clients') || '[]'));
    const selectedClient = JSON.parse(localStorage.getItem('selectedClient') || '{}');

    function submit() {
        console.log('new selection add to LS');
        currentClients.push({name: fhirUrl, client: clientId });
        localStorage.setItem('clients', JSON.stringify(currentClients));
        window.location.reload();
    }

    function deleteClient(client: any) {
        const newClients = currentClients.filter((c: { name: any; client: any; }) => !(c.name === client.name && c.client === client.client));
        localStorage.setItem('clients', JSON.stringify(newClients));
        setCurrentClients(newClients);
    }

    function selectClient(client: any) {
        localStorage.setItem('selectedClient', JSON.stringify({ name: client.name, client: client.client }));
        window.location.reload();
    }

    function useDefault() {
        localStorage.setItem('selectedClient', JSON.stringify({}));
        window.location.reload();
    }

    return (
        <div>
            <div className='register-page'>
                <h2 style={{marginBottom: '25px'}}>Register</h2>
                <p>Client Id</p>
                <input className="client-id" value={clientId} onChange={(e)=> {setClientId(e.target.value);}}></input>

                <p>Fhir Server (iss)</p>
                <input className="client-id" value={fhirUrl} onChange={(e)=>{setFhirUrl(e.target.value);}}></input>
                <div style={{display: 'flex', paddingTop: '25px'}}>
                    <Button variant='outlined' disabled={clientId === '' || fhirUrl === ''} onClick={submit}>{'Submit'}</Button>
                </div>
                <hr style={{ color: '#000000', width: '80%'}}/>
                <div className="current-selection">
                    <h4>Existing Client Ids</h4>
                    { currentClients.map((client: any, index: React.Key | null | undefined)=>{ 
                        return (
                            <div key={index} style={{display: 'flex', alignItems: 'center'}}>
                                <span style={{marginRight: '35px'}}><b>{client.name}</b>: {client.client}</span>
                                <Button variant='outlined' style={{marginRight: '5px'}} onClick={ () => { selectClient(client); }}>Use</Button>
                                <IconButton style={{marginRight: '5px'}} onClick={ () => { deleteClient(client); }}>
                                    <CloseIcon />
                                </IconButton>
                            </div>);
                    })}
                </div>
                <hr style={{ color: '#000000', width: '80%'}}/>
                <div className="current-selection" style={{alignItems: 'center', display: 'flex', 'flexDirection': 'column'}}>
                    <h4>Selected Client Id</h4>
                    <p><i>The selected client id will be used when opening a smart application in the future. To change, select an existing client id above.</i></p>
                    <div style={{display: 'flex', alignItems: 'center'}}>
                        {selectedClient.name ?  
                        (<>
                            <span style={{marginRight: '35px'}}><b>{selectedClient.name}</b>: {selectedClient.client}</span>
                            <Button variant='outlined' style={{marginRight: '5px'}} onClick={ () => { useDefault(); }}>Use default</Button>
                        </>)
                        : <span>Using default client id from environment variable</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(Register);