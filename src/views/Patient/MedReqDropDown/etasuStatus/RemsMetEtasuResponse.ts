import MetRequirements from './MetRequirements';

export interface RemsMetEtasuResponse {
  case_number: string;
  drugCode: string;
  drugName: string;
  patientFirstName: string;
  patientLastName: string;
  patientDOB: string;
  status: string;
  metRequirements: MetRequirements[];
}

export default RemsMetEtasuResponse;
