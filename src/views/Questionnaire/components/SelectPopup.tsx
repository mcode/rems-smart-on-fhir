import React, { useEffect, useState } from 'react';
import { List, ListItemButton, ListItemText, DialogTitle, Dialog } from '@mui/material';

interface SimpleDialogProps {
  onClose: (n: string) => void;
  open: boolean;
  selectedValue: string;
  title: string;
  options: string[];
  finalOption: string;
}

function SimpleDialog(props: SimpleDialogProps) {
  const { onClose, selectedValue, open, title, options, finalOption } = props;

  const handleClose = () => {
    onClose(selectedValue);
  };

  const handleListItemClick = (value: string) => {
    onClose(value);
  };

  return (
    <Dialog onClose={handleClose} aria-labelledby="simple-dialog-title" open={open}>
      <DialogTitle id="simple-dialog-title">{title}</DialogTitle>
      <List>
        {options.map(option => (
          <ListItemButton onClick={() => handleListItemClick(option)} key={option}>
            <ListItemText primary={option} />
          </ListItemButton>
        ))}

        <ListItemButton autoFocus onClick={() => handleListItemClick('New')}>
          <ListItemText primary={finalOption} />
        </ListItemButton>
      </List>
    </Dialog>
  );
}

interface SelectPopupProps {
  selectedCallback: (n: string) => void;
  open: boolean;
  title: string;
  options: string[];
  finalOption: string;
}

function SelectPopup(props: SelectPopupProps) {
  const propOpen = props.open;
  const selectedCallback = props.selectedCallback;
  const { title, options, finalOption } = props;
  const [open, setOpen] = useState<boolean>(false);
  const [selectedValue, setSelectedValue] = useState<string>('');

  useEffect(() => {
    setOpen(propOpen);
  }, [propOpen]);

  const handleClose = (value: string) => {
    setOpen(false);
    setSelectedValue(value);
    selectedCallback(value);
  };
  return (
    <div>
      <SimpleDialog
        selectedValue={selectedValue}
        open={open}
        onClose={handleClose}
        title={title}
        options={options}
        finalOption={finalOption}
      />
    </div>
  );
}

export { SelectPopup };
