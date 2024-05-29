import {
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
  DialogActions,
  Button
} from '@mui/material';
import { RxAlert } from '../QuestionnaireForm';

type AlertDialogProps = {
  title: string;
  setRxAlert: (e: RxAlert) => void;
  rxAlert: RxAlert;
};

function AlertDialog({ title, rxAlert, setRxAlert }: AlertDialogProps) {
  const handleClose = () => {
    setRxAlert({ open: false });
  };
  return (
    <div>
      <Dialog
        open={rxAlert.open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{title}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">{rxAlert.description}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
          {rxAlert.callback ? (
            <Button onClick={rxAlert.callback} autoFocus>
              Yes
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </div>
  );
}

export { AlertDialog };
