
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { MonthlyStats, formatCurrency } from '@/lib/analyticsService';

interface RevenueChartProps {
  data: MonthlyStats[];
}

const chartConfig = {
  revenue: {
    label: "Ingresos",
    color: "hsl(var(--chart-3))",
  },
};

const RevenueChart = ({ data }: RevenueChartProps) => {
  const formattedData = data.map(item => ({
    month: new Date(item.month + '-01').toLocaleDateString('es-ES', { 
      month: 'short', 
      year: '2-digit' 
    }),
    revenue: item.revenue
  }));

  return (
    <Card className="card-cabin">
      <CardHeader>
        <CardTitle>Ingresos por Mes</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedData}>
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
                tickFormatter={(value) => formatCurrency(value)}
              />
              <ChartTooltip
                content={<ChartTooltipContent />}
                labelFormatter={(label) => `Mes: ${label}`}
                formatter={(value) => [formatCurrency(value as number), 'Ingresos']}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-revenue)"
                strokeWidth={2}
                dot={{ fill: 'var(--color-revenue)', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default RevenueChart;
