import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const Probability = [
  { level: 5, label: 'Almost Certain' },
  { level: 4, label: 'Likely' },
  { level: 3, label: 'Possible' },
  { level: 2, label: 'Unlikely' },
  { level: 1, label: 'Rare' },
];

const severities = [
  { level: 1, label: 'Negligible' },
  { level: 2, label: 'Minor First aid' },
  { level: 3, label: 'Minor Lost Time' },
  { level: 4, label: 'Major' },
  { level: 5, label: 'Catastrophic' },
];

const getRiskColor = (risk: number) => {
  if (risk <= 6) return 'bg-green-600/80 text-white';
  if (risk >= 8 && risk <= 12) return 'bg-yellow-500/80 text-black';
  if (risk >= 15) return 'bg-red-600/80 text-white';
  return '';
};

const actionLevels = [
    { risk: '1 to 6', level: 'Low Risk', action: 'May be acceptable but review task to see if risk can be reduced further.', color: 'bg-green-600/80 text-white' },
    { risk: '8 to 12', level: 'Medium Risk', action: 'Task should only be undertaken with appropriate management, authorization and proper control.', color: 'bg-yellow-500/80 text-black' },
    { risk: '15 to 25', level: 'High Risk', action: 'Job/Activity must not proceed, control measure shall be provided before commencement of activity.', color: 'bg-red-600/80 text-white' },
]

export default function HiracGuidelinesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">HIRAC Guidelines</h1>
        <p className="text-muted-foreground">Risk assessment matrix and action levels.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Risk Assessment Matrix</CardTitle>
          <CardDescription>
            The risk level is calculated by multiplying the Probability and Severity (P x S).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="border">
              <TableHeader>
                <TableRow>
                  <TableHead className="border-r font-bold text-center align-middle" rowSpan={2}>Probability</TableHead>
                  <TableHead className="text-center font-bold" colSpan={5}>SEVERITY</TableHead>
                </TableRow>
                <TableRow>
                  {severities.map(s => (
                    <TableHead key={s.level} className="text-center border-t">
                      <p>{s.level}</p>
                      <p className="font-semibold">{s.label}</p>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Probability.map(l => (
                  <TableRow key={l.level}>
                    <TableCell className="border-r">
                        <div className="text-center">
                            <p className="font-semibold">{l.label}</p>
                            <p>{l.level}</p>
                        </div>
                    </TableCell>
                    {severities.map(s => {
                      const risk = l.level * s.level;
                      return (
                        <TableCell key={`${l.level}-${s.level}`} className={cn("text-center font-bold text-lg", getRiskColor(risk))}>
                          {risk}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Risk Level & Action</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
                <Table className="border">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="font-bold text-center border-r">RISK</TableHead>
                            <TableHead className="font-bold text-center border-r">RISK LEVEL</TableHead>
                            <TableHead className="font-bold text-center">ACTION</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {actionLevels.map(level => (
                            <TableRow key={level.risk}>
                                <TableCell className={cn("text-center font-bold border-r", level.color)}>{level.risk}</TableCell>
                                <TableCell className={cn("text-center font-bold border-r", level.color)}>{level.level}</TableCell>
                                <TableCell className="border-r">{level.action}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-muted-foreground">
            <p>1. Risk Assessment for each job/activity shall be calculated as follows: Determine the value Risk Level (RL) using "Risk Assessment Matrix", then multiply the Probability and Severity [LxS].</p>
            <p>2. All new and modified activity must undergo HAZARD IDENTIFICATION, RISK ASSESSMENT AND CONTROL (HIRAC) before commencement.</p>
        </CardContent>
      </Card>

    </div>
  );
}
