import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download, Calendar, Home } from 'lucide-react';
import { 
  generateReportData, 
  exportToCSV, 
  exportToPDF, 
  getCabinTypes,
  getAvailableYears,
  ReportData, 
  ReportFilters 
} from '@/lib/reportsService';
import { useToast } from '@/hooks/use-toast';

const Reports = () => {
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    year: new Date().getFullYear(),
  });
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadAvailableYears();
  }, []);

  const loadAvailableYears = async () => {
    try {
      const years = await getAvailableYears();
      setAvailableYears(years);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los años disponibles",
      });
    }
  };

  const loadReportData = async () => {
    try {
      setLoading(true);
      const data = await generateReportData(filters);
      setReportData(data);
      
      if (data.length === 0) {
        toast({
          title: "Sin resultados",
          description: "No se encontraron reservas para los filtros seleccionados",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al generar el reporte",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      if (reportData.length === 0) {
        await loadReportData();
        return;
      }
      exportToCSV(reportData, filters);
      toast({
        title: "Exportación exitosa",
        description: "El archivo CSV se ha descargado correctamente",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al exportar a CSV",
      });
    }
  };

  const handleExportPDF = async () => {
    try {
      if (reportData.length === 0) {
        await loadReportData();
        return;
      }
      exportToPDF(reportData, filters);
      toast({
        title: "Exportación exitosa",
        description: "El archivo PDF se ha descargado correctamente",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al exportar a PDF",
      });
    }
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <FileText className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reportes de Uso</h1>
          <p className="text-muted-foreground">
            Genera reportes detallados de uso por mes y tipo de cabaña
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Filtros de Reporte</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Year Filter */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Año
              </label>
              <Select
                value={filters.year.toString()}
                onValueChange={(value) => setFilters({ ...filters, year: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar año" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month Filter */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Mes (Opcional)
              </label>
              <Select
                value={filters.month?.toString() || "all"}
                onValueChange={(value) => 
                  setFilters({ 
                    ...filters, 
                    month: value === "all" ? undefined : parseInt(value) 
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los meses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los meses</SelectItem>
                  {monthNames.map((month, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cabin Type Filter */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Tipo de Cabaña (Opcional)
              </label>
              <Select
                value={filters.cabinType || "all"}
                onValueChange={(value) => 
                  setFilters({ 
                    ...filters, 
                    cabinType: value === "all" ? undefined : value 
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las cabañas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las cabañas</SelectItem>
                  {getCabinTypes().map((cabin) => (
                    <SelectItem key={cabin} value={cabin}>
                      {cabin}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Generate Button */}
            <div className="flex items-end">
              <Button 
                onClick={loadReportData} 
                disabled={loading}
                className="w-full"
              >
                {loading ? "Generando..." : "Generar Reporte"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Actions */}
      {reportData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="w-5 h-5" />
              <span>Exportar Reporte</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <Button onClick={handleExportCSV} variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
              <Button onClick={handleExportPDF} variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Se encontraron {reportData.length} reservas que coinciden con los filtros
            </p>
          </CardContent>
        </Card>
      )}

      {/* Report Data Table */}
      {reportData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Home className="w-5 h-5" />
              <span>Datos del Reporte</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pasajero</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Vuelo Llegada</TableHead>
                    <TableHead>Vuelo Salida</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Adultos</TableHead>
                    <TableHead>Niños</TableHead>
                    <TableHead>Bebés</TableHead>
                    <TableHead>Cabaña</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.passengerName}</TableCell>
                      <TableCell>{row.checkIn}</TableCell>
                      <TableCell>{row.checkOut}</TableCell>
                      <TableCell>{row.arrivalFlight}</TableCell>
                      <TableCell>{row.departureFlight}</TableCell>
                      <TableCell>{row.totalGuests}</TableCell>
                      <TableCell>{row.adults}</TableCell>
                      <TableCell>{row.children}</TableCell>
                      <TableCell>{row.babies}</TableCell>
                      <TableCell className="text-xs">{row.cabinType}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reports;