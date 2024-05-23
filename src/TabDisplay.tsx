import Box from '@mui/material/Box';
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
      <Box sx={{ p: { xs: 0, sm: 3 } }}>
        <div>{children}</div>
      </Box>
    </div>
  );
}

export const MemoizedTabPanel = React.memo(TabPanel);
