import Client from 'fhirclient/lib/Client';
import { Card as HooksCard } from '../../../../cds-hooks/resources/HookTypes';
import CdsHooksCard from './cdsHooksCard';
import { ReactElement } from 'react';

interface CdsHooksCardsProps {
    cards: HooksCard[],
    client: Client,
    tabCallback: (n: ReactElement, m: string) => void

}

const CdsHooksCards = (props: CdsHooksCardsProps) => {
    return (
        <div>
            {props.cards.map((card: HooksCard) => 
                <CdsHooksCard key={card?.summary} card={card} client={props.client} tabCallback={props.tabCallback}></CdsHooksCard>
            )}
        </div>
    );
};

export default CdsHooksCards;