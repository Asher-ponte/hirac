

export type Inspection = {
  id: string;
  hazard_description: string;
  location: string;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  control_measures: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  inspection_date: string;
  assigned_user: string;
};

export type User = {
    id: string;
    name: string;
    email: string;
    role: 'Admin' | 'Safety Officer' | 'Viewer';
    last_login: string;
};

export type ControlStatus = 'Ongoing' | 'Implemented' | 'Not Implemented';

export type HiracEntry = {
  id: string;
  task: string;
  hazard: string;
  hazardPhotoUrl?: string | null;
  hazardClass: 'Physical' | 'Chemical' | 'Biological' | 'Mechanical' | 'Electrical';
  hazardousEvent: string;
  impact: string;
  initialLikelihood: number;
  initialSeverity: number;
  
  engineeringControls?: string | null;
  engineeringControlsPic?: string | null;
  engineeringControlsStatus?: ControlStatus | null;
  engineeringControlsCompletionDate?: string | null;

  administrativeControls?: string | null;
  administrativeControlsPic?: string | null;
  administrativeControlsStatus?: ControlStatus | null;
  administrativeControlsCompletionDate?: string | null;

  ppe?: string | null;
  ppePic?: string | null;
  ppeStatus?: ControlStatus | null;
  ppeCompletionDate?: string | null;

  residualLikelihood: number;
  residualSeverity: number;
};
