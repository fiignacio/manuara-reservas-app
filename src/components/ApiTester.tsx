import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Calendar, Home } from 'lucide-react';
import { toast } from 'sonner';

interface ApiTestResponse {
  available: boolean;
  cabinType: string;
  checkIn: string;
  checkOut: string;
  nextAvailableDate?: string;
}

const CABIN_TYPES = [
  'pequeña',
  'mediana1', 
  'mediana2',
  'grande'
];

const CABIN_TYPE_LABELS = {
  'pequeña': 'Cabaña Pequeña (Max 3p)',
  'mediana1': 'Cabaña Mediana 1 (Max 4p)',
  'mediana2': 'Cabaña Mediana 2 (Max 4p)', 
  'grande': 'Cabaña Grande (Max 6p)'
};

export default function ApiTester() {
  const [cabinType, setCabinType] = useState<string>('pequeña');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ApiTestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testApi = async () => {
    if (!cabinType || !checkIn || !checkOut || !apiKey) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const url = new URL('https://ewaetndthowtdjpxvsvg.supabase.co/functions/v1/cabin-availability');
      url.searchParams.set('cabinType', cabinType);
      url.searchParams.set('checkIn', checkIn);
      url.searchParams.set('checkOut', checkOut);

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      setResponse(data);
      
      if (data.available) {
        toast.success('✅ Cabaña disponible');
      } else {
        toast.error('❌ Cabaña no disponible');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Probador de API de Disponibilidad
          </CardTitle>
          <CardDescription>
            Prueba la API de disponibilidad de cabañas en tiempo real
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cabinType">Tipo de Cabaña</Label>
              <Select value={cabinType} onValueChange={setCabinType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo de cabaña" />
                </SelectTrigger>
                <SelectContent>
                  {CABIN_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {CABIN_TYPE_LABELS[type as keyof typeof CABIN_TYPE_LABELS]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Ingresa tu API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkIn">Fecha de Check-in</Label>
              <Input
                id="checkIn"
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkOut">Fecha de Check-out</Label>
              <Input
                id="checkOut"
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                min={checkIn || new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <Button 
            onClick={testApi} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Consultando disponibilidad...
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                Consultar Disponibilidad
              </>
            )}
          </Button>

          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">Error:</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              </CardContent>
            </Card>
          )}

          {response && (
            <Card className={response.available ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  {response.available ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Disponible
                      </Badge>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-600" />
                      <Badge variant="destructive">
                        No Disponible
                      </Badge>
                    </>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Cabaña:</span> {CABIN_TYPE_LABELS[response.cabinType as keyof typeof CABIN_TYPE_LABELS] || response.cabinType}
                  </div>
                  <div>
                    <span className="font-medium">Check-in:</span> {formatDate(response.checkIn)}
                  </div>
                  <div>
                    <span className="font-medium">Check-out:</span> {formatDate(response.checkOut)}
                  </div>
                  {response.nextAvailableDate && (
                    <div className="pt-2 border-t">
                      <span className="font-medium text-blue-600">Próxima fecha disponible:</span>{' '}
                      {formatDate(response.nextAvailableDate)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h4 className="font-medium mb-2">Información de la API</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div><span className="font-medium">Endpoint:</span> https://ewaetndthowtdjpxvsvg.supabase.co/functions/v1/cabin-availability</div>
                <div><span className="font-medium">Método:</span> GET</div>
                <div><span className="font-medium">Autenticación:</span> x-api-key header</div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}