import Client from 'fhirclient/lib/Client';
import { Card as HooksCard } from '../../../../cds-hooks/resources/HookTypes';
import CdsHooksCard from './cdsHooksCard';
import { ReactElement } from 'react';

interface CdsHooksCardsProps {
  cards: HooksCard[];
  client: Client;
  name: string;
  tabIndex: number;
  setTabIndex: (n: number) => void;
  tabCallback: (n: ReactElement, m: string, o: string) => void;
}

const CdsHooksCards = (props: CdsHooksCardsProps) => {
  return (
    <div>
      {props.cards.map((card: HooksCard) => (
        <CdsHooksCard
          key={card?.summary}
          card={card}
          name={props.name}
          client={props.client}
          tabCallback={props.tabCallback}
          tabIndex={props.tabIndex}
          setTabIndex={props.setTabIndex}
        ></CdsHooksCard>
      ))}
    </div>
  );
};

export default CdsHooksCards;
