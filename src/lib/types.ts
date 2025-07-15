

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

export type HiracEntry = {
  id: string;
  task: string;
  hazard: string;
  cause: string;
  effect: string;
  initialLikelihood: number;
  initialSeverity: number;
  engineeringControls: string;
  administrativeControls: string;
  ppe: string;
  responsiblePerson: string;
  residualLikelihood: number;
  residualSeverity: number;
  status: 'Ongoing' | 'Implemented' | 'Not Implemented';
};
