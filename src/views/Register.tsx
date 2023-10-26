import { Button, IconButton } from '@mui/material';
import React, { memo, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';

interface RegisterProps {
    onSubmit: any;
}
const Register = (props: RegisterProps) => {

    const [clientId, setClientId] = useState<string>('');
    const [fhirUrl, setFhirUrl] = useState<string>('');
    const [newSelection, setNewSelection] = useState<boolean>(true);

    const currentClients = JSON.parse(localStorage.getItem('clients') || '[]');
    console.log('current clients -- > ', currentClients);

    function submit() {
        console.log('wants to submit --> ', { name: fhirUrl, client: clientId });
        if (newSelection) {
            currentClients.push({name: fhirUrl, client: clientId });
            localStorage.setItem('clients', JSON.stringify(currentClients));
        }
        props.onSubmit(clientId, fhirUrl);
    }

    function clear () {
        setNewSelection(true);
        setClientId('');
        setFhirUrl('');
    }

    function deleteClient(client: any) {
        console.log('client to delete is-- > ', client);

    }

    function selectClient(client: any) {
        setNewSelection(false);
        setClientId(client.client);
        setFhirUrl(client.name);
    }

    return (
        <div>
            <div className='register-page'>
                <h2 style={{marginBottom: '25px'}}>Register</h2>
                <p>Client Id</p>
                <input className="client-id" value={clientId} onChange={(e)=> {setClientId(e.target.value);}}></input>

                <p>Fhir Server (iss)</p>
                <input className="client-id" value={fhirUrl} onChange={(e)=>{setFhirUrl(e.target.value);}}></input>
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
                <div style={{display: 'flex'}}>
                    { !newSelection ?  <Button variant='outlined' onClick={clear}>Clear</Button> : <div/> }
                    <Button variant='outlined' onClick={submit}>{newSelection ? 'Submit' : 'Sign in'}</Button>
                </div>
            </div>
        </div>
    );
};

export default memo(Register);