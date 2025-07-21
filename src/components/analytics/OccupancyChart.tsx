
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { MonthlyStats } from '@/lib/analyticsService';

interface OccupancyChartProps {
  data: MonthlyStats[];
}

const chartConfig = {
  occupancyRate: {
    label: "Ocupación",
    color: "hsl(var(--chart-1))",
  },
  reservations: {
    label: "Reservas",
    color: "hsl(var(--chart-2))",
  },
};

const OccupancyChart = ({ data }: OccupancyChartProps) => {
  const formattedData = data.map(item => ({
    month: new Date(item.month + '-01').toLocaleDateString('es-ES', { 
      month: 'short', 
      year: '2-digit' 
    }),
    occupancyRate: item.occupancyRate,
    reservations: item.reservations
  }));

  return (
    <Card className="card-cabin">
      <CardHeader>
        <CardTitle>Ocupación por Mes</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formattedData}>
              <XAxis 
                dataKey="month" 
                className="text-xs"
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                className="text-xs"
                axisLine={false}
                tickLine={false}
              />
              <ChartTooltip
                content={<ChartTooltipContent />}
                cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
              />
              <Bar
                dataKey="occupancyRate"
                fill="var(--color-occupancyRate)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default OccupancyChart;
