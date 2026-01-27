import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Download, 
  Calendar, 
  Home, 
  Info, 
  Users, 
  TrendingUp,
  BarChart3,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';
import { 
  generateReportData, 
  exportToCSV, 
  exportToPDF, 
  getCabinTypes,
  getAvailableYears,
  ReportData, 
  ReportFilters,
  exportCabinGroupToCSV,
  exportCabinGroupToPDF
} from '@/lib/reportsService';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { useReservationsQuery } from '@/hooks/useReservations';
import { CABIN_TYPES } from '@/lib/cabinConfig';

const Reports = () => {
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    year: new Date().getFullYear(),
    includeOverlaps: false,
  });
  const { toast } = useToast();
  
  // Use React Query for reservations data
  const { data: reservations = [] } = useReservationsQuery();

  // Calculate available years from reservations
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    
    reservations.forEach(r => {
      if (r.checkIn) {
        const year = new Date(r.checkIn).getFullYear();
        if (!isNaN(year)) years.add(year);
      }
    });
    
    return Array.from(years).sort((a, b) => b - a);
  }, [reservations]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (reportData.length === 0) return null;
    
    const totalGuests = reportData.reduce((sum, r) => sum + r.totalGuests, 0);
    const totalAdults = reportData.reduce((sum, r) => sum + r.adults, 0);
    const totalChildren = reportData.reduce((sum, r) => sum + r.children, 0);
    const totalBabies = reportData.reduce((sum, r) => sum + r.babies, 0);
    
    // Count by cabin type
    const byCabin = CABIN_TYPES.reduce((acc, cabin) => {
      acc[cabin] = reportData.filter(r => r.cabinType === cabin).length;
      return acc;
    }, {} as Record<string, number>);
    
    // Average guests per reservation
    const avgGuests = totalGuests / reportData.length;
    
    return {
      totalReservations: reportData.length,
      totalGuests,
      totalAdults,
      totalChildren,
      totalBabies,
      avgGuests: avgGuests.toFixed(1),
      byCabin
    };
  }, [reportData]);

  const loadReportData = async () => {
    logger.info('reports.loadReportData.start', { filters });
    
    try {
      setLoading(true);
      const data = await generateReportData(filters);
      setReportData(data);
      
      if (data.length === 0) {
        toast({
          title: "Sin resultados",
          description: "No se encontraron reservas para los filtros seleccionados",
        });
      } else {
        toast({
          title: "Reporte generado",
          description: `Se encontraron ${data.length} reservas`,
        });
      }
    } catch (error) {
      logger.error('reports.loadReportData.error', { error: String(error), filters });
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
      const dataToExport = reportData.length === 0
        ? await generateReportData(filters)
        : reportData;
      exportToCSV(dataToExport, filters);
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
      const dataToExport = reportData.length === 0
        ? await generateReportData(filters)
        : reportData;
      exportToPDF(dataToExport, filters);
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

  const handleGroupExport = async (group: 'small-large' | 'mediums', format: 'csv' | 'pdf') => {
    try {
      if (format === 'csv') {
        await exportCabinGroupToCSV(filters, group);
      } else {
        await exportCabinGroupToPDF(filters, group);
      }
      toast({
        title: 'Exportación exitosa',
        description: `El archivo ${format.toUpperCase()} del grupo se ha descargado correctamente`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Error al exportar el grupo a ${format.toUpperCase()}`,
      });
    }
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reportes de Uso</h1>
            <p className="text-muted-foreground">
              Genera reportes detallados de uso por mes y tipo de cabaña
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Generar Reporte
          </TabsTrigger>
          <TabsTrigger value="export-group" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Exportar por Grupo
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2" disabled={reportData.length === 0}>
            <Home className="h-4 w-4" />
            Datos ({reportData.length})
          </TabsTrigger>
        </TabsList>

        {/* Generate Report Tab */}
        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Filtros de Reporte</span>
              </CardTitle>
              <CardDescription>
                Selecciona el período y tipo de cabaña para generar el reporte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Year Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Año</label>
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
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Mes (Opcional)</label>
                  <Select
                    value={filters.month?.toString() || "all"}
                    onValueChange={(value) => {
                      setFilters({ 
                        ...filters, 
                        month: value === "all" ? undefined : parseInt(value)
                      });
                    }}
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
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Tipo de Cabaña</label>
                  <Select
                    value={filters.cabinType || "all"}
                    onValueChange={(value) => {
                      setFilters({ 
                        ...filters, 
                        cabinType: value === "all" ? undefined : value
                      });
                    }}
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
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Generar Reporte
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Advanced Options */}
              {filters.month && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeOverlaps"
                      checked={filters.includeOverlaps || false}
                      onCheckedChange={(checked) => {
                        setFilters({ ...filters, includeOverlaps: checked as boolean });
                      }}
                    />
                    <label htmlFor="includeOverlaps" className="text-sm font-medium text-foreground cursor-pointer">
                      Incluir reservas que se extienden fuera del mes
                    </label>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    Incluye reservas que comienzan antes del mes o terminan después del mes seleccionado
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Stats */}
          {summaryStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Reservas</p>
                      <p className="text-2xl font-bold">{summaryStats.totalReservations}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-primary/50" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Huéspedes</p>
                      <p className="text-2xl font-bold">{summaryStats.totalGuests}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500/50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Adultos</p>
                      <p className="text-2xl font-bold">{summaryStats.totalAdults}</p>
                    </div>
                    <Users className="h-8 w-8 text-green-500/50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Niños</p>
                      <p className="text-2xl font-bold">{summaryStats.totalChildren}</p>
                    </div>
                    <Users className="h-8 w-8 text-amber-500/50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Bebés</p>
                      <p className="text-2xl font-bold">{summaryStats.totalBabies}</p>
                    </div>
                    <Users className="h-8 w-8 text-pink-500/50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Prom. Huéspedes</p>
                      <p className="text-2xl font-bold">{summaryStats.avgGuests}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-500/50" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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
                <div className="flex flex-wrap gap-4">
                  <Button onClick={handleExportCSV} variant="outline">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Exportar CSV
                  </Button>
                  <Button onClick={handleExportPDF} variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Exportar PDF
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  Se encontraron <Badge variant="secondary">{reportData.length}</Badge> reservas que coinciden con los filtros
                </p>
              </CardContent>
            </Card>
          )}

          {/* Cabin Type Distribution */}
          {summaryStats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Home className="w-5 h-5" />
                  <span>Distribución por Cabaña</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {CABIN_TYPES.map((cabin) => {
                    const count = summaryStats.byCabin[cabin] || 0;
                    const percentage = summaryStats.totalReservations > 0 
                      ? ((count / summaryStats.totalReservations) * 100).toFixed(1)
                      : 0;
                    
                    return (
                      <div key={cabin} className="p-4 rounded-lg bg-accent/50 space-y-2">
                        <p className="font-medium text-sm">{cabin.split(' (')[0]}</p>
                        <div className="flex items-end justify-between">
                          <p className="text-2xl font-bold">{count}</p>
                          <Badge variant="outline">{percentage}%</Badge>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary rounded-full h-2 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Export by Group Tab */}
        <TabsContent value="export-group" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5" />
                <span>Exportar por Grupo de Cabañas</span>
              </CardTitle>
              <CardDescription>
                Exporta reportes agrupando cabañas según su configuración
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Year/Month selector for group exports */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Año para exportación</label>
                  <Select
                    value={filters.year.toString()}
                    onValueChange={(value) => setFilters({ ...filters, year: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mes (Opcional)</label>
                  <Select
                    value={filters.month?.toString() || "all"}
                    onValueChange={(value) => {
                      setFilters({ 
                        ...filters, 
                        month: value === "all" ? undefined : parseInt(value)
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
              </div>

              {/* Group export cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-2 border-dashed">
                  <CardContent className="pt-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Home className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold">Pequeña + Grande</p>
                          <p className="text-sm text-muted-foreground">
                            Cabaña Pequeña y Cabaña Grande
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleGroupExport('small-large', 'csv')}
                        >
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          CSV
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleGroupExport('small-large', 'pdf')}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-dashed">
                  <CardContent className="pt-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <Home className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-semibold">Medianas (1 & 2)</p>
                          <p className="text-sm text-muted-foreground">
                            Cabaña Mediana 1 y Cabaña Mediana 2
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleGroupExport('mediums', 'csv')}
                        >
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          CSV
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleGroupExport('mediums', 'pdf')}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Table Tab */}
        <TabsContent value="data" className="space-y-6">
          {reportData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <Home className="w-5 h-5" />
                    <span>Datos del Reporte</span>
                  </span>
                  <Badge variant="secondary">{reportData.length} registros</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto max-h-[500px] rounded-lg border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead className="font-semibold">Pasajero</TableHead>
                        <TableHead>Check-in</TableHead>
                        <TableHead>Check-out</TableHead>
                        <TableHead>Vuelo Llegada</TableHead>
                        <TableHead>Vuelo Salida</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Adultos</TableHead>
                        <TableHead className="text-center">Niños</TableHead>
                        <TableHead className="text-center">Bebés</TableHead>
                        <TableHead>Cabaña</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{row.passengerName}</TableCell>
                          <TableCell>{row.checkIn}</TableCell>
                          <TableCell>{row.checkOut}</TableCell>
                          <TableCell className="text-muted-foreground">{row.arrivalFlight}</TableCell>
                          <TableCell className="text-muted-foreground">{row.departureFlight}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{row.totalGuests}</Badge>
                          </TableCell>
                          <TableCell className="text-center">{row.adults}</TableCell>
                          <TableCell className="text-center">{row.children}</TableCell>
                          <TableCell className="text-center">{row.babies}</TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate">
                            {row.cabinType}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
