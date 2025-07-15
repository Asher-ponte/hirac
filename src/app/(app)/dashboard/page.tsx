"use client"

import { FileText, ShieldAlert, ShieldCheck, Sigma } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Pie, PieChart, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';

const kpiData = [
  { title: 'Total Hazards', value: '1,254', icon: Sigma, description: '+20.1% from last month' },
  { title: 'Open Issues', value: '87', icon: ShieldAlert, description: '-12 since last week' },
  { title: 'Resolved', value: '1,167', icon: ShieldCheck, description: '+180 this month' },
  { title: 'Inspections', value: '312', icon: FileText, description: '+35 this month' },
];

const statusChartData = [
  { status: 'Open', count: 87, fill: 'var(--color-open)'},
  { status: 'In Progress', count: 45, fill: 'var(--color-in-progress)' },
  { status: 'Resolved', count: 210, fill: 'var(--color-resolved)' },
];
const statusChartConfig = {
    count: { label: 'Count' },
    open: { label: 'Open', color: 'hsl(var(--chart-4))' },
    "in-progress": { label: 'In Progress', color: 'hsl(var(--chart-1))' },
    resolved: { label: 'Resolved', color: 'hsl(var(--chart-2))' },
}

const riskChartData = [
    { risk: 'Low', value: 400, fill: 'var(--color-low)' },
    { risk: 'Medium', value: 300, fill: 'var(--color-medium)' },
    { risk: 'High', value: 300, fill: 'var(--color-high)' },
    { risk: 'Critical', value: 200, fill: 'var(--color-critical)' },
];

const riskChartConfig = {
    value: { label: 'Hazards' },
    low: { label: 'Low', color: 'hsl(var(--chart-2))' },
    medium: { label: 'Medium', color: 'hsl(var(--chart-3))' },
    high: { label: 'High', color: 'hsl(var(--chart-1))' },
    critical: { label: 'Critical', color: 'hsl(var(--destructive))' },
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground">{kpi.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
            <CardDescription>Breakdown of inspection statuses for the current month.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={statusChartConfig} className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusChartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="status" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--muted))' }}
                            content={<ChartTooltipContent />}
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Hazards by Risk Level</CardTitle>
            <CardDescription>Overall distribution of hazards.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center pt-4">
            <ChartContainer config={riskChartConfig} className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Tooltip content={<ChartTooltipContent nameKey="risk" hideLabel />} />
                        <Pie data={riskChartData} dataKey="value" nameKey="risk" innerRadius={60} labelLine={false} label>
                             {riskChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                             ))}
                        </Pie>
                         <ChartLegend
                            content={<ChartLegendContent nameKey="risk" />}
                            className="-translate-y-[20px]"
                        />
                    </PieChart>
                </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
