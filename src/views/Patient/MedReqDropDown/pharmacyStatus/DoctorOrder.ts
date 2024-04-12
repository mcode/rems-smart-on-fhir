import MetRequirements from '../etasuStatus/MetRequirements';

export type DoctorOrder = {
  _id: string;
  caseNumber: string;
  patientName: string;
  patientFirstName: string;
  patientLastName: string;
  patientDOB: string;
  patientCity: string;
  patientStateProvince: string;
  patientPostalCode: string;
  patientCountry: string;
  doctorName: string;
  doctorContact: string;
  doctorID: string;
  doctorEmail: string;
  drugNames: string;
  simpleDrugName: string;
  rxDate: string;
  drugPrice: number;
  drugNdcCode: string;
  quantities: string;
  total: number;
  pickupDate: string;
  dispenseStatus: string;
  metRequirements: MetRequirements[];
};
