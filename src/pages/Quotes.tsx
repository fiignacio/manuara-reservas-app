
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Quote, QuoteFormData } from '@/types/quote';
import { createQuote, calculateQuotePrice } from '@/lib/quoteService';
import { generateQuotePDF } from '@/lib/pdfService';
import { formatDateRange, calculateNights } from '@/lib/dateUtils';
import { FileText, Calculator, Download } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const Quotes = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generatedQuote, setGeneratedQuote] = useState<Quote | null>(null);
  const [formData, setFormData] = useState<QuoteFormData>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    checkIn: '',
    checkOut: '',
    adults: 1,
    children: 0,
    season: 'Alta',
    cabinType: 'Cabaña Pequeña (Max 3p)',
    arrivalFlight: 'LA841',
    departureFlight: 'LA842',
    notes: '',
  });

  const [calculatedPrice, setCalculatedPrice] = useState<{ totalPrice: number; nights: number; pricePerNight: number } | null>(null);

  const handleInputChange = (field: keyof QuoteFormData, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    // Calcular precio automáticamente si tenemos fechas válidas
    if (newFormData.checkIn && newFormData.checkOut) {
      try {
        const priceData = calculateQuotePrice(newFormData);
        setCalculatedPrice(priceData);
      } catch (error) {
        setCalculatedPrice(null);
      }
    }
  };

  const handleGenerateQuote = () => {
    try {
      if (!formData.customerName || !formData.customerEmail || !formData.checkIn || !formData.checkOut) {
        toast({
          title: "Error",
          description: "Por favor completa todos los campos obligatorios",
          variant: "destructive",
        });
        return;
      }

      const quote = createQuote(formData);
      setGeneratedQuote(quote);
      
      toast({
        title: "Cotización generada",
        description: "La cotización ha sido creada exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al generar la cotización",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async () => {
    if (!generatedQuote) return;

    setLoading(true);
    try {
      await generateQuotePDF(generatedQuote);
      toast({
        title: "PDF descargado",
        description: "La cotización ha sido descargada exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al generar el PDF",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewQuote = () => {
    setGeneratedQuote(null);
    setFormData({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      checkIn: '',
      checkOut: '',
      adults: 1,
      children: 0,
      season: 'Alta',
      cabinType: 'Cabaña Pequeña (Max 3p)',
      arrivalFlight: 'LA841',
      departureFlight: 'LA842',
      notes: '',
    });
    setCalculatedPrice(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cotizaciones</h1>
          <p className="text-muted-foreground">Genera cotizaciones para potenciales huéspedes</p>
        </div>
        {generatedQuote && (
          <Button onClick={handleNewQuote} variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Nueva Cotización
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                {generatedQuote ? 'Cotización Generada' : 'Datos de la Cotización'}
              </CardTitle>
              <CardDescription>
                {generatedQuote ? 'Revisa los detalles de la cotización' : 'Completa la información para generar una cotización'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!generatedQuote ? (
                <>
                  {/* Datos del Cliente */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Datos del Cliente</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="customerName">Nombre Completo *</Label>
                        <Input
                          id="customerName"
                          value={formData.customerName}
                          onChange={(e) => handleInputChange('customerName', e.target.value)}
                          placeholder="Nombre del cliente"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customerPhone">Teléfono</Label>
                        <Input
                          id="customerPhone"
                          value={formData.customerPhone}
                          onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                          placeholder="+56 9 XXXX XXXX"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerEmail">Email *</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        value={formData.customerEmail}
                        onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                        placeholder="email@ejemplo.com"
                      />
                    </div>
                  </div>

                  {/* Datos de la Estadía */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Detalles de la Estadía</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="checkIn">Check-in *</Label>
                        <Input
                          id="checkIn"
                          type="date"
                          value={formData.checkIn}
                          onChange={(e) => handleInputChange('checkIn', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="checkOut">Check-out *</Label>
                        <Input
                          id="checkOut"
                          type="date"
                          value={formData.checkOut}
                          onChange={(e) => handleInputChange('checkOut', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="adults">Adultos</Label>
                        <Input
                          id="adults"
                          type="number"
                          min="1"
                          value={formData.adults}
                          onChange={(e) => handleInputChange('adults', parseInt(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="children">Niños</Label>
                        <Input
                          id="children"
                          type="number"
                          min="0"
                          value={formData.children}
                          onChange={(e) => handleInputChange('children', parseInt(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="season">Temporada</Label>
                        <Select value={formData.season} onValueChange={(value: 'Alta' | 'Baja') => handleInputChange('season', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Alta">Temporada Alta</SelectItem>
                            <SelectItem value="Baja">Temporada Baja</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cabinType">Tipo de Cabaña</Label>
                      <Select 
                        value={formData.cabinType} 
                        onValueChange={(value: any) => handleInputChange('cabinType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cabaña Pequeña (Max 3p)">Cabaña Pequeña (Max 3p)</SelectItem>
                          <SelectItem value="Cabaña Mediana 1 (Max 4p)">Cabaña Mediana 1 (Max 4p)</SelectItem>
                          <SelectItem value="Cabaña Mediana 2 (Max 4p)">Cabaña Mediana 2 (Max 4p)</SelectItem>
                          <SelectItem value="Cabaña Grande (Max 6p)">Cabaña Grande (Max 6p)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="arrivalFlight">Vuelo de Llegada</Label>
                        <Select 
                          value={formData.arrivalFlight} 
                          onValueChange={(value: 'LA841' | 'LA843') => handleInputChange('arrivalFlight', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LA841">LA841</SelectItem>
                            <SelectItem value="LA843">LA843</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="departureFlight">Vuelo de Salida</Label>
                        <Select 
                          value={formData.departureFlight} 
                          onValueChange={(value: 'LA842' | 'LA844') => handleInputChange('departureFlight', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LA842">LA842</SelectItem>
                            <SelectItem value="LA844">LA844</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Notas */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Notas Adicionales</h3>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Comentarios (Opcional)</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        placeholder="Información adicional, descuentos especiales, etc."
                        rows={3}
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Vista de cotización generada */
                <div className="space-y-6">
                  <div className="bg-gradient-secondary p-6 rounded-lg border">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-foreground">Cotización N° {generatedQuote.id}</h3>
                        <p className="text-sm text-muted-foreground">
                          Generada el {format(new Date(generatedQuote.createdAt!), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Válida hasta:</p>
                        <p className="font-semibold text-orange-600">
                          {format(new Date(generatedQuote.validUntil), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Cliente</h4>
                        <p>{generatedQuote.customerName}</p>
                        <p className="text-sm text-muted-foreground">{generatedQuote.customerEmail}</p>
                        {generatedQuote.customerPhone && (
                          <p className="text-sm text-muted-foreground">{generatedQuote.customerPhone}</p>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Estadía</h4>
                        <p>{formatDateRange(generatedQuote.checkIn, generatedQuote.checkOut)}</p>
                        <p className="text-sm text-muted-foreground">{generatedQuote.cabinType}</p>
                        <p className="text-sm text-muted-foreground">{generatedQuote.adults} adultos{generatedQuote.children > 0 && `, ${generatedQuote.children} niños`}</p>
                        <p className="text-sm text-muted-foreground">{calculateNights(generatedQuote.checkIn, generatedQuote.checkOut)} noches</p>
                      </div>
                    </div>

                    {generatedQuote.notes && (
                      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Notas:</p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">{generatedQuote.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Panel lateral */}
        <div className="space-y-6">
          {/* Resumen de precio */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent>
              {calculatedPrice || generatedQuote ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Precio Total:</span>
                    <span className="text-2xl font-bold text-primary">
                      ${(generatedQuote?.totalPrice || calculatedPrice?.totalPrice || 0).toLocaleString('es-CL')}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Temporada:</span>
                      <span>{generatedQuote?.season || formData.season}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tipo:</span>
                      <span>{generatedQuote?.cabinType || formData.cabinType}</span>
                    </div>
                    {(formData.checkIn && formData.checkOut) && (
                      <>
                        <div className="flex justify-between">
                          <span>Noches:</span>
                          <span>{generatedQuote ? calculateNights(generatedQuote.checkIn, generatedQuote.checkOut) : calculatedPrice?.nights}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Precio por noche:</span>
                          <span>${(generatedQuote ? (generatedQuote.totalPrice / calculateNights(generatedQuote.checkIn, generatedQuote.checkOut)) : calculatedPrice?.pricePerNight || 0).toLocaleString('es-CL')}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Completa las fechas para ver el precio</p>
              )}
            </CardContent>
          </Card>

          {/* Acciones */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!generatedQuote ? (
                <Button 
                  onClick={handleGenerateQuote} 
                  className="w-full"
                  disabled={!formData.customerName || !formData.customerEmail || !formData.checkIn || !formData.checkOut}
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  Generar Cotización
                </Button>
              ) : (
                <Button 
                  onClick={handleDownloadPDF} 
                  className="w-full"
                  disabled={loading}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {loading ? 'Generando PDF...' : 'Descargar PDF'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Quotes;
