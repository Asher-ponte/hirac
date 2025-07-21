
'use server';

import { db } from '@/lib/db';
import type { HiracEntry } from '@/lib/types';
import { getHiracEntries } from '@/app/(app)/hirac/actions';

const getRiskLevelDetails = (level: number) => {
  if (level <= 6) return { label: 'Low', color: 'var(--color-low)' };
  if (level <= 12) return { label: 'Medium', color: 'var(--color-medium)' };
  return { label: 'High', color: 'var(--color-high)' };
};

export async function getDashboardData() {
  const hiracEntries = await getHiracEntries();

  const totalHazards = hiracEntries.length;

  let lowRiskCount = 0;
  let mediumRiskCount = 0;
  let highRiskCount = 0;

  hiracEntries.forEach(entry => {
    const hasResidual = entry.residualLikelihood != null && entry.residualSeverity != null;
    const likelihood = hasResidual ? entry.residualLikelihood! : entry.initialLikelihood;
    const severity = hasResidual ? entry.residualSeverity! : entry.initialSeverity;
    const riskLevel = likelihood * severity;

    if (riskLevel <= 6) {
      lowRiskCount++;
    } else if (riskLevel <= 12) {
      mediumRiskCount++;
    } else {
      highRiskCount++;
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
  
  const riskMap = hiracEntries.reduce((acc, entry) => {
    const riskLevelLabel = getRiskLevelDetails(entry.initialLikelihood * entry.initialSeverity).label;
    acc[riskLevelLabel] = (acc[riskLevelLabel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const riskChartData = [
    { risk: 'Low', value: riskMap['Low'] || 0, fill: 'var(--color-low)' },
    { risk: 'Medium', value: riskMap['Medium'] || 0, fill: 'var(--color-medium)' },
    { risk: 'High', value: riskMap['High'] || 0, fill: 'var(--color-high)' },
  ];

  return {
    kpiData,
    statusChartData,
    riskChartData,
  };
}
