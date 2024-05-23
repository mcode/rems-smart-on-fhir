import Client from 'fhirclient/lib/Client';
import { Card as HooksCard } from '../../../../cds-hooks/resources/HookTypes';
import { ReactElement } from 'react';
import { Grid } from '@mui/material';
import { CdsHooksCard } from './CdsHooksCard';

interface CdsHooksCardsProps {
  cards: HooksCard[];
  client: Client;
  name: string;
  tabIndex: number;
  setTabIndex: (n: number) => void;
  tabCallback: (n: ReactElement, m: string, o: string) => void;
}

export const CdsHooksCards = (props: CdsHooksCardsProps) => {
  return (
    <Grid item container spacing={2} maxWidth={'600px'} margin={'0 auto 0'}>
      {props.cards.map((card: HooksCard, cardInd) => (
        <CdsHooksCard
          key={card?.summary}
          card={card}
          name={props.name}
          client={props.client}
          tabCallback={props.tabCallback}
          tabIndex={props.tabIndex}
          setTabIndex={props.setTabIndex}
          cardInd={cardInd}
          selectionBehavior={card.selectionBehavior}
        />
      ))}
    </Grid>
  );
};
