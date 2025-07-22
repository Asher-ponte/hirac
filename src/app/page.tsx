
'use client';

import * as React from 'react';
import { Sigma, ShieldAlert, ShieldCheck, Flame, Shield, ShieldQuestion } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Pie, PieChart, Cell, Legend, LabelList } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { getDashboardData } from './(app)/dashboard/actions';
import AppLayout from './(app)/layout';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type KpiData = {
    title: string;
    value: string;
    description: string;
};

type StatusChartData = {
    status: string;
    count: number;
    fill: string;
};

type RiskChartData = {
    risk: string;
    value: number;
    fill: string;
};

type RiskByDepartmentData = {
    department: string;
    Low: number;
    Medium: number;
    High: number;
}

const statusChartConfig = {
    count: { label: 'Count' },
    "For Implementation": { label: 'For Implementation', color: 'hsl(var(--chart-1))' },
    Implemented: { label: 'Implemented', color: 'hsl(var(--chart-2))' },
}

const riskChartConfig = {
    value: { label: 'Hazards' },
    Low: { label: 'Low', color: 'hsl(120 76% 61%)' },
    Medium: { label: 'Medium', color: 'hsl(12 76% 61%)' },
    High: { label: 'High', color: 'hsl(12 76% 61%)' },
    critical: { label: 'Critical', color: 'hsl(var(--destructive))' },
};

const riskByDeptChartConfig = {
    Low: { label: 'Low', color: 'hsl(var(--chart-2))' },
    Medium: { label: 'Medium', color: 'hsl(var(--chart-3))' },
    High: { label: 'High', color: 'hsl(var(--chart-1))' },
}

const kpiIcons = {
    'Total Hazards': Sigma,
    'Low Risk': ShieldCheck,
    'Medium Risk': ShieldQuestion,
    'High Risk': ShieldAlert,
} as const;

const kpiCardConfig: { [key: string]: { iconColor: string; cardClasses: string } } = {
    'Low Risk': { iconColor: 'text-green-500', cardClasses: 'border-green-500/50 bg-green-500/10' },
    'Medium Risk': { iconColor: 'text-red-500', cardClasses: 'border-red-500/50 bg-red-500/10' },
    'High Risk': { iconColor: 'text-red-500', cardClasses: 'border-red-500/50 bg-red-500/10' },
};


export default function DashboardPage() {
  const [loading, setLoading] = React.useState(true);
  const [kpiData, setKpiData] = React.useState<KpiData[]>([]);
  const [statusChartData, setStatusChartData] = React.useState<StatusChartData[]>([]);
  const [riskChartData, setRiskChartData] = React.useState<RiskChartData[]>([]);
  const [riskByDepartmentData, setRiskByDepartmentData] = React.useState<RiskByDepartmentData[]>([]);
  
  React.useEffect(() => {
    async function loadData() {
        setLoading(true);
        try {
            const data = await getDashboardData();
            setKpiData(data.kpiData);
            setStatusChartData(data.statusChartData);
            setRiskChartData(data.riskChartData);
            setRiskByDepartmentData(data.riskByDepartmentData);
        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setLoading(false);
        }
    }
    loadData();
  }, []);

  return (
    <AppLayout>
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-4 w-24" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-16 mb-2" />
                                <Skeleton className="h-3 w-32" />
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    kpiData.map((kpi) => {
                        const config = kpiCardConfig[kpi.title];
                        const Icon = kpiIcons[kpi.title as keyof typeof kpiIcons];
                        return (
                            <Card key={kpi.title} className={cn(config?.cardClasses)}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                                    {Icon && <Icon className={cn("h-4 w-4 text-muted-foreground", config?.iconColor)} />}
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{kpi.value}</div>
                                    <p className="text-xs text-muted-foreground">{kpi.description}</p>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                <Card className="md:col-span-3">
                <CardHeader>
                    <CardTitle>Status Distribution</CardTitle>
                    <CardDescription>Breakdown of HIRAC entry statuses.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? <Skeleton className="h-[250px] w-full" /> : (
                        <ChartContainer config={statusChartConfig} className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statusChartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }} accessibilityLayer>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="status" tickLine={false} axisLine={false} />
                                    <YAxis tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted))' }}
                                        content={<ChartTooltipContent />}
                                    />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                        {statusChartData.map((entry) => (
                                            <Cell key={entry.status} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    )}
                </CardContent>
                </Card>

                <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle>Hazard Risk Level</CardTitle>
                    <CardDescription>Overall distribution of hazards by current risk level.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                    {loading ? <Skeleton className="h-[250px] w-full" /> : (
                        <ChartContainer config={riskChartConfig} className="mx-auto aspect-square h-full w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Tooltip content={<ChartTooltipContent nameKey="risk" hideLabel />} />
                                    <Pie data={riskChartData} dataKey="value" nameKey="risk" innerRadius={60} strokeWidth={5} labelLine={false} label>
                                        {riskChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <ChartLegend
                                        content={<ChartLegendContent nameKey="risk" />}
                                        className="-translate-y-2"
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    )}
                </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Risk Distribution by Department</CardTitle>
                    <CardDescription>Breakdown of current risk levels for each department.</CardDescription>
                </CardHeader>
                <CardContent>
                     {loading ? <Skeleton className="h-[350px] w-full" /> : (
                        <ChartContainer config={riskByDeptChartConfig} className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={riskByDepartmentData} layout="vertical" margin={{ left: 10, right: 40 }}>
                                    <CartesianGrid horizontal={false} />
                                    <YAxis 
                                        dataKey="department" 
                                        type="category" 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tick={{ fontSize: 12 }} 
                                        width={100}
                                    />
                                    <XAxis dataKey="total" type="number" hide />
                                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                                    <Legend content={<ChartLegendContent />} />
                                    <Bar dataKey="Low" stackId="a" fill="var(--color-Low)" radius={[0, 4, 4, 0]}>
                                        <LabelList dataKey="Low" position="right" offset={8} className="fill-foreground" fontSize={12} formatter={(value: number) => value > 0 ? value : ''} />
                                    </Bar>
                                    <Bar dataKey="Medium" stackId="a" fill="var(--color-Medium)" >
                                        <LabelList dataKey="Medium" position="right" offset={8} className="fill-foreground" fontSize={12} formatter={(value: number) => value > 0 ? value : ''} />
                                    </Bar>
                                    <Bar dataKey="High" stackId="a" fill="var(--color-High)" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="High" position="right" offset={8} className="fill-foreground" fontSize={12} formatter={(value: number) => value > 0 ? value : ''} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                     )}
                </CardContent>
            </Card>
        </div>
    </AppLayout>
  );
}
