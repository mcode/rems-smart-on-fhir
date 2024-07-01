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

        <ListItemButton autoFocus onClick={handleClose}>
          <ListItemText primary={finalOption} />
        </ListItemButton>
      </List>
    </Dialog>
  );
}

interface SelectPopupProps {
  selectedValue: string;
  selectedCallback: (n: string) => void;
  open: boolean;
  close: () => void;
  title: string;
  options: string[];
  finalOption: string;
}

function SelectPopup(props: SelectPopupProps) {
  const { title, options, finalOption, selectedCallback, selectedValue } = props;

  const handleClose = (value: string) => {
    props.close();
    selectedCallback(value);
  };
  return (
    <div>
      <SimpleDialog
        selectedValue={selectedValue}
        open={props.open}
        onClose={handleClose}
        title={title}
        options={options}
        finalOption={finalOption}
      />
    </div>
  );
}

export { SelectPopup };
