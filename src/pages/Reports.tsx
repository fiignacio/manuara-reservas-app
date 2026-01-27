import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  
  const { data: reservations = [] } = useReservationsQuery();

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

  const summaryStats = useMemo(() => {
    if (reportData.length === 0) return null;
    
    const totalGuests = reportData.reduce((sum, r) => sum + r.totalGuests, 0);
    const totalAdults = reportData.reduce((sum, r) => sum + r.adults, 0);
    const totalChildren = reportData.reduce((sum, r) => sum + r.children, 0);
    const totalBabies = reportData.reduce((sum, r) => sum + r.babies, 0);
    
    const byCabin = CABIN_TYPES.reduce((acc, cabin) => {
      acc[cabin] = reportData.filter(r => r.cabinType === cabin).length;
      return acc;
    }, {} as Record<string, number>);
    
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
        description: `Archivo ${format.toUpperCase()} descargado`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Error al exportar a ${format.toUpperCase()}`,
      });
    }
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 sm:p-3 bg-primary/10 rounded-lg">
          <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Reportes</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Genera reportes detallados de uso
          </p>
        </div>
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="w-full h-auto flex flex-wrap">
          <TabsTrigger value="generate" className="flex-1 min-w-[100px] text-xs sm:text-sm py-2">
            <BarChart3 className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Generar</span>
          </TabsTrigger>
          <TabsTrigger value="export-group" className="flex-1 min-w-[100px] text-xs sm:text-sm py-2">
            <FileSpreadsheet className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Grupos</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex-1 min-w-[100px] text-xs sm:text-sm py-2" disabled={reportData.length === 0}>
            <Home className="h-4 w-4 mr-1 sm:mr-2" />
            <span>({reportData.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Generate Report Tab */}
        <TabsContent value="generate" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Year */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Año</label>
                  <Select
                    value={filters.year.toString()}
                    onValueChange={(value) => setFilters({ ...filters, year: parseInt(value) })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Month */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Mes</label>
                  <Select
                    value={filters.month?.toString() || "all"}
                    onValueChange={(value) => {
                      setFilters({ 
                        ...filters, 
                        month: value === "all" ? undefined : parseInt(value)
                      });
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {monthNames.map((month, index) => (
                        <SelectItem key={index + 1} value={(index + 1).toString()}>
                          {month.substring(0, 3)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cabin */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Cabaña</label>
                  <Select
                    value={filters.cabinType || "all"}
                    onValueChange={(value) => {
                      setFilters({ 
                        ...filters, 
                        cabinType: value === "all" ? undefined : value
                      });
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {getCabinTypes().map((cabin) => (
                        <SelectItem key={cabin} value={cabin}>
                          {cabin.split(' (')[0]}
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
                    className="w-full h-10"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <BarChart3 className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Generar</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Include overlaps option */}
              {filters.month && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Checkbox
                    id="includeOverlaps"
                    checked={filters.includeOverlaps || false}
                    onCheckedChange={(checked) => {
                      setFilters({ ...filters, includeOverlaps: checked as boolean });
                    }}
                  />
                  <label htmlFor="includeOverlaps" className="text-xs text-muted-foreground cursor-pointer">
                    Incluir reservas que se extienden fuera del mes
                  </label>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Stats */}
          {summaryStats && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <p className="text-xs text-muted-foreground">Reservas</p>
                  <p className="text-xl sm:text-2xl font-bold">{summaryStats.totalReservations}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <p className="text-xs text-muted-foreground">Huéspedes</p>
                  <p className="text-xl sm:text-2xl font-bold">{summaryStats.totalGuests}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <p className="text-xs text-muted-foreground">Adultos</p>
                  <p className="text-xl sm:text-2xl font-bold">{summaryStats.totalAdults}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <p className="text-xs text-muted-foreground">Niños</p>
                  <p className="text-xl sm:text-2xl font-bold">{summaryStats.totalChildren}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <p className="text-xs text-muted-foreground">Bebés</p>
                  <p className="text-xl sm:text-2xl font-bold">{summaryStats.totalBabies}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <p className="text-xs text-muted-foreground">Prom.</p>
                  <p className="text-xl sm:text-2xl font-bold">{summaryStats.avgGuests}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Export Actions */}
          {reportData.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <Button onClick={handleExportCSV} variant="outline" size="sm" className="flex-1 sm:flex-none">
                    <FileSpreadsheet className="w-4 h-4 mr-1" />
                    CSV
                  </Button>
                  <Button onClick={handleExportPDF} variant="outline" size="sm" className="flex-1 sm:flex-none">
                    <FileText className="w-4 h-4 mr-1" />
                    PDF
                  </Button>
                  <Badge variant="secondary" className="ml-auto">
                    {reportData.length} registros
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cabin Distribution */}
          {summaryStats && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Por Cabaña
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {CABIN_TYPES.map((cabin) => {
                    const count = summaryStats.byCabin[cabin] || 0;
                    const percentage = summaryStats.totalReservations > 0 
                      ? ((count / summaryStats.totalReservations) * 100).toFixed(0)
                      : 0;
                    
                    return (
                      <div key={cabin} className="p-3 rounded-lg bg-accent/50">
                        <p className="text-xs text-muted-foreground truncate">{cabin.split(' (')[0]}</p>
                        <div className="flex items-end justify-between mt-1">
                          <p className="text-lg font-bold">{count}</p>
                          <Badge variant="outline" className="text-xs">{percentage}%</Badge>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                          <div 
                            className="bg-primary rounded-full h-1.5 transition-all"
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
        <TabsContent value="export-group" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Exportar por Grupo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Year/Month selectors */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Año</label>
                  <Select
                    value={filters.year.toString()}
                    onValueChange={(value) => setFilters({ ...filters, year: parseInt(value) })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Mes</label>
                  <Select
                    value={filters.month?.toString() || "all"}
                    onValueChange={(value) => {
                      setFilters({ 
                        ...filters, 
                        month: value === "all" ? undefined : parseInt(value)
                      });
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {monthNames.map((month, index) => (
                        <SelectItem key={index + 1} value={(index + 1).toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Group cards */}
              <div className="grid gap-3">
                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Home className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Pequeña + Grande</p>
                          <p className="text-xs text-muted-foreground">Cabañas individuales</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1"
                          onClick={() => handleGroupExport('small-large', 'csv')}
                        >
                          CSV
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1"
                          onClick={() => handleGroupExport('small-large', 'pdf')}
                        >
                          PDF
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <Home className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Medianas (1 & 2)</p>
                          <p className="text-xs text-muted-foreground">Cabañas pareadas</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1"
                          onClick={() => handleGroupExport('mediums', 'csv')}
                        >
                          CSV
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1"
                          onClick={() => handleGroupExport('mediums', 'pdf')}
                        >
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
        <TabsContent value="data" className="mt-4">
          {reportData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    Datos
                  </CardTitle>
                  <Badge variant="secondary">{reportData.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px] sm:h-[500px]">
                  <div className="min-w-[600px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead className="font-semibold">Pasajero</TableHead>
                          <TableHead>Check-in</TableHead>
                          <TableHead>Check-out</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                          <TableHead className="text-center">A/N/B</TableHead>
                          <TableHead>Cabaña</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.map((row, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium max-w-[150px] truncate">{row.passengerName}</TableCell>
                            <TableCell className="text-xs">{row.checkIn}</TableCell>
                            <TableCell className="text-xs">{row.checkOut}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{row.totalGuests}</Badge>
                            </TableCell>
                            <TableCell className="text-center text-xs text-muted-foreground">
                              {row.adults}/{row.children}/{row.babies}
                            </TableCell>
                            <TableCell className="text-xs max-w-[120px] truncate">
                              {row.cabinType.split(' (')[0]}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;