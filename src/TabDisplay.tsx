import Stack from '@mui/material/Stack';
import React from 'react';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  name: string;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, name, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      key={name}
      {...other}
    >
      <Stack sx={{ p: { xs: 0, sm: 3 } }}>
        <div>{children}</div>
      </Stack>
    </div>
  );
}

export const MemoizedTabPanel = React.memo(TabPanel);
