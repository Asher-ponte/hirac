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

export type Hirac = {
  id: string;
  hazard: string;
  consequence: string;
  likelihood: 'Rare' | 'Unlikely' | 'Possible' | 'Likely' | 'Almost Certain';
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  control_measures: string;
  residual_risk: 'Low' | 'Medium' | 'High' | 'Critical';
};
