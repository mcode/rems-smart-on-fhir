import Client from 'fhirclient/lib/Client';
import { Card as HooksCard } from 'smart-typescript-support/types/cds-hooks';
import CdsHooksCard from './cdsHooksCard';

interface CdsHooksCardsProps {
    cards: HooksCard[],
    client: Client
}

const CdsHooksCards = (props: CdsHooksCardsProps) => {
    return (
        <div>
            {props.cards.map((card: HooksCard) => 
                <CdsHooksCard key={card?.summary} card={card} client={props.client}></CdsHooksCard>
            )}
        </div>
    );
}

export default CdsHooksCards;