

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

export type UserRole = 'Admin' | 'Safety Officer' | 'Viewer';

export type User = {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    last_login?: string; // This is mock data for now
};

export type Department = {
    id: number;
    name: string;
    supervisorId?: number | null;
    supervisor?: User | null;
};

export type ControlStatus = 'Ongoing' | 'Implemented' | 'For Implementation';
export type ControlType = 'Engineering' | 'Administrative' | 'PPE';

export type ControlMeasure = {
  id?: number;
  type: ControlType;
  description: string;
  pic?: string | null;
  status?: ControlStatus | null;
  completionDate?: string | null;
};

export type HiracEntry = {
  id: string;
  departmentId: number;
  department?: Department; // Added for relation
  task: string;
  hazard: string;
  hazardPhotoUrl?: string | null;
  hazardClass: 'Physical' | 'Chemical' | 'Biological' | 'Mechanical' | 'Electrical';
  hazardousEvent: string;
  impact: string;
  initialLikelihood: number;
  initialSeverity: number;
  residualLikelihood?: number | null;
  residualSeverity?: number | null;
  controlMeasures: ControlMeasure[];
  status?: 'Ongoing' | 'Implemented' | 'For Implementation' | null;
};
