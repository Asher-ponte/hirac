'use server';

import { db } from '@/lib/db';
import type { HiracEntry } from '@/lib/types';
import { getHiracEntries } from '@/app/(app)/hirac/actions';

const getRiskLevelDetails = (level: number) => {
  if (level <= 6) return 'Low';
  if (level <= 12) return 'Medium';
  return 'High';
};

export async function getDashboardData() {
  const hiracEntries = await getHiracEntries();

  const totalHazards = hiracEntries.length;
  const resolved = hiracEntries.filter(e => e.status === 'Implemented').length;
  const openIssues = hiracEntries.filter(e => e.status === 'Ongoing' || e.status === 'For Implementation').length;
  const highRiskHazards = hiracEntries.filter(e => (e.initialLikelihood * e.initialSeverity) > 12).length;

  const kpiData = [
    { title: 'Total Hazards', value: totalHazards.toString(), description: '' },
    { title: 'Open Issues', value: openIssues.toString(), description: '' },
    { title: 'Resolved', value: resolved.toString(), description: '' },
    { title: 'High-Risk Hazards', value: highRiskHazards.toString(), description: 'Based on initial assessment' },
  ];

  const statusMap = hiracEntries.reduce((acc, entry) => {
    const status = entry.status === 'For Implementation' ? 'Open' : entry.status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusChartData = [
    { status: 'Open', count: statusMap['Open'] || 0, fill: 'var(--color-open)' },
    { status: 'Ongoing', count: statusMap['Ongoing'] || 0, fill: 'var(--color-in-progress)' },
    { status: 'Implemented', count: statusMap['Implemented'] || 0, fill: 'var(--color-resolved)' },
  ];
  
  const riskMap = hiracEntries.reduce((acc, entry) => {
    const riskLevel = getRiskLevelDetails(entry.initialLikelihood * entry.initialSeverity);
    acc[riskLevel] = (acc[riskLevel] || 0) + 1;
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
