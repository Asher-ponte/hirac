
'use server';

import { db } from '@/lib/db';
import { getHiracEntries } from '@/app/(app)/hirac/actions';
import { getDepartments as getAllDepartments } from '@/app/(app)/admin/actions';

const getRiskLevelDetails = (level: number) => {
  if (level <= 6) return { label: 'Low', color: 'var(--color-low)' };
  if (level <= 12) return { label: 'Medium', color: 'var(--color-medium)' };
  return { label: 'High', color: 'var(--color-high)' };
};

export async function getDashboardData() {
  const [hiracEntries, departments] = await Promise.all([
    getHiracEntries(),
    getAllDepartments({ withSupervisor: false }),
  ]);
  
  const totalHazards = hiracEntries.length;

  let lowRiskCount = 0;
  let mediumRiskCount = 0;
  let highRiskCount = 0;

  const riskByDepartmentMap = new Map<string, { Low: number, Medium: number, High: number }>();

  departments.forEach(dept => {
    riskByDepartmentMap.set(dept.name, { Low: 0, Medium: 0, High: 0 });
  });

  hiracEntries.forEach(entry => {
    const hasResidual = entry.residualLikelihood != null && entry.residualSeverity != null;
    const likelihood = hasResidual ? entry.residualLikelihood! : entry.initialLikelihood;
    const severity = hasResidual ? entry.residualSeverity! : entry.initialSeverity;
    const riskLevel = likelihood * severity;
    const riskDetails = getRiskLevelDetails(riskLevel);
    
    // Overall Counts
    if (riskDetails.label === 'Low') lowRiskCount++;
    else if (riskDetails.label === 'Medium') mediumRiskCount++;
    else highRiskCount++;

    // Per Department Counts
    const deptName = entry.department?.name;
    if (deptName && riskByDepartmentMap.has(deptName)) {
        const currentCounts = riskByDepartmentMap.get(deptName)!;
        currentCounts[riskDetails.label as 'Low' | 'Medium' | 'High']++;
    }
  });

  const kpiData = [
    { title: 'Total Hazards', value: totalHazards.toString(), description: `${totalHazards} risks identified` },
    { title: 'Low Risk', value: lowRiskCount.toString(), description: 'Currently low-risk hazards' },
    { title: 'Medium Risk', value: mediumRiskCount.toString(), description: 'Currently medium-risk hazards' },
    { title: 'High Risk', value: highRiskCount.toString(), description: 'Currently high-risk hazards' },
  ];

  const statusMap = hiracEntries.reduce((acc, entry) => {
    const status = entry.status ?? 'For Implementation';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusChartData = [
    { status: 'For Implementation', count: statusMap['For Implementation'] || 0, fill: 'var(--color-open)' },
    { status: 'Implemented', count: statusMap['Implemented'] || 0, fill: 'var(--color-resolved)' },
  ];
  
  const riskMap = { 'Low': lowRiskCount, 'Medium': mediumRiskCount, 'High': highRiskCount };

  const riskChartData = [
    { risk: 'Low', value: riskMap['Low'] || 0, fill: 'hsl(120 76% 61%)' },
    { risk: 'Medium', value: riskMap['Medium'] || 0, fill: 'hsl(43 74% 66%)' },
    { risk: 'High', value: riskMap['High'] || 0, fill: 'hsl(12 76% 61%)' },
  ];

  const riskByDepartmentData = Array.from(riskByDepartmentMap.entries()).map(([name, counts]) => ({
    department: name,
    total: counts.Low + counts.Medium + counts.High,
    breakdown: [
      { name: 'Low', value: counts.Low, fill: 'hsl(120 76% 61%)' },
      { name: 'Medium', value: counts.Medium, fill: 'hsl(43 74% 66%)' },
      { name: 'High', value: counts.High, fill: 'hsl(12 76% 61%)' },
    ]
  }));

  return {
    kpiData,
    statusChartData,
    riskChartData,
    riskByDepartmentData,
  };
}
