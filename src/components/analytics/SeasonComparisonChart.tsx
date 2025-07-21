
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { SeasonStats, formatCurrency } from '@/lib/analyticsService';

interface SeasonComparisonChartProps {
  data: SeasonStats[];
}

const chartConfig = {
  Alta: {
    label: "Temporada Alta",
    color: "hsl(var(--chart-1))",
  },
  Baja: {
    label: "Temporada Baja",
    color: "hsl(var(--chart-2))",
  },
};

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))'];

const SeasonComparisonChart = ({ data }: SeasonComparisonChartProps) => {
  const pieData = data.map(item => ({
    name: `Temporada ${item.season}`,
    value: item.revenue,
    reservations: item.reservations,
    averagePrice: item.averagePrice
  }));

  return (
    <Card className="card-cabin">
      <CardHeader>
        <CardTitle>Comparación por Temporada</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Ingresos: {formatCurrency(data.value)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Reservas: {data.reservations}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Precio promedio: {formatCurrency(data.averagePrice)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
          
          <div className="space-y-4">
            {data.map((season, index) => (
              <div key={season.season} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <div>
                    <p className="font-medium">Temporada {season.season}</p>
                    <p className="text-sm text-muted-foreground">
                      {season.reservations} reservas
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(season.revenue)}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(season.averagePrice)} promedio
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SeasonComparisonChart;
