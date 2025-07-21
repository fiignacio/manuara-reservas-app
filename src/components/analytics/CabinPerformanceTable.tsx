
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CabinStats, formatCurrency, formatPercentage } from '@/lib/analyticsService';

interface CabinPerformanceTableProps {
  data: CabinStats[];
}

const CabinPerformanceTable = ({ data }: CabinPerformanceTableProps) => {
  const getOccupancyColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-100 text-green-800';
    if (rate >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card className="card-cabin">
      <CardHeader>
        <CardTitle>Rendimiento por Cabaña</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cabaña</TableHead>
              <TableHead className="text-right">Reservas</TableHead>
              <TableHead className="text-right">Ingresos</TableHead>
              <TableHead className="text-right">Ocupación</TableHead>
              <TableHead className="text-right">Huéspedes Promedio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((cabin) => (
              <TableRow key={cabin.cabinType}>
                <TableCell className="font-medium">
                  {cabin.cabinType.replace(' (Max ', ' (').replace('p)', 'p)')}
                </TableCell>
                <TableCell className="text-right">{cabin.totalReservations}</TableCell>
                <TableCell className="text-right">{formatCurrency(cabin.totalRevenue)}</TableCell>
                <TableCell className="text-right">
                  <Badge className={getOccupancyColor(cabin.occupancyRate)}>
                    {formatPercentage(cabin.occupancyRate)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {cabin.averageGuests.toFixed(1)} personas
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CabinPerformanceTable;
