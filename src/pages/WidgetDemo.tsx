import React, { useState } from 'react';
import { AvailabilityWidget, CabinInfo } from '@/components/public';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Code, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const WidgetDemo: React.FC = () => {
  const [selectedData, setSelectedData] = useState<{
    checkIn: string;
    checkOut: string;
    cabin?: CabinInfo;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleDateRangeSelect = (checkIn: string, checkOut: string) => {
    setSelectedData({ checkIn, checkOut });
  };

  const handleCabinSelect = (cabin: CabinInfo, checkIn: string, checkOut: string) => {
    setSelectedData({ checkIn, checkOut, cabin });
    toast.success(`Cabaña seleccionada: ${cabin.displayName}`);
  };

  const integrationCode = `import { AvailabilityWidget } from './components/public';
import { initializeApp } from 'firebase/app';

// Configuración de Firebase (usa tu configuración)
const firebaseConfig = {
  apiKey: "AIzaSyA49rKxFV1Sr-zFsR6GASKLc0Hd5GBXYc0",
  authDomain: "gestion-reservas-manuara.firebaseapp.com",
  projectId: "gestion-reservas-manuara",
  storageBucket: "gestion-reservas-manuara.firebasestorage.app",
  messagingSenderId: "977714534745",
  appId: "1:977714534745:web:f64d41df6f79f8ee405448"
};

initializeApp(firebaseConfig);

function ReservationsPage() {
  return (
    <AvailabilityWidget
      onDateRangeSelect={(checkIn, checkOut) => {
        console.log('Fechas:', checkIn, checkOut);
      }}
      onCabinSelect={(cabin, checkIn, checkOut) => {
        // Abrir formulario de solicitud
        console.log('Cabaña:', cabin, checkIn, checkOut);
      }}
      showLegend={true}
      showCabinSelector={true}
      maxMonthsAhead={6}
    />
  );
}`;

  const copyCode = () => {
    navigator.clipboard.writeText(integrationCode);
    setCopied(true);
    toast.success('Código copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Widget de Disponibilidad</h1>
          <p className="text-muted-foreground">
            Calendario en tiempo real para mostrar disponibilidad de cabañas en tu página web
          </p>
          <Badge variant="outline" className="mt-2">
            <ExternalLink className="w-3 h-3 mr-1" />
            Embebible en cualquier web React
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Widget Demo */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Demo en Vivo
            </h2>
            
            <AvailabilityWidget
              onDateRangeSelect={handleDateRangeSelect}
              onCabinSelect={handleCabinSelect}
              showLegend={true}
              showCabinSelector={true}
              maxMonthsAhead={6}
            />

            {/* Selection result */}
            {selectedData && (
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Selección Actual</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><strong>Check-in:</strong> {selectedData.checkIn}</p>
                  <p><strong>Check-out:</strong> {selectedData.checkOut}</p>
                  {selectedData.cabin && (
                    <p><strong>Cabaña:</strong> {selectedData.cabin.displayName} (Max {selectedData.cabin.maxCapacity}p)</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Integration code */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Code className="w-5 h-5" />
              Código de Integración
            </h2>

            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Para tu web React</CardTitle>
                <Button variant="ghost" size="sm" onClick={copyCode}>
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                  <code>{integrationCode}</code>
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Archivos necesarios</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p className="text-muted-foreground">Copia estos archivos a tu proyecto:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><code className="text-xs bg-muted px-1 rounded">src/components/public/*</code></li>
                  <li><code className="text-xs bg-muted px-1 rounded">src/hooks/usePublicAvailability.ts</code></li>
                  <li><code className="text-xs bg-muted px-1 rounded">src/lib/firebase.ts</code></li>
                  <li><code className="text-xs bg-muted px-1 rounded">src/lib/availabilityHelpers.ts</code></li>
                  <li><code className="text-xs bg-muted px-1 rounded">src/lib/dateUtils.ts</code></li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Dependencias npm</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-3 rounded-lg text-xs">
                  <code>npm install firebase date-fns lucide-react</code>
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features */}
        <div className="grid sm:grid-cols-3 gap-4 pt-4">
          <Card className="text-center p-4">
            <div className="text-2xl mb-2">⚡</div>
            <h3 className="font-medium">Tiempo Real</h3>
            <p className="text-sm text-muted-foreground">
              Actualización instantánea con Firebase onSnapshot
            </p>
          </Card>
          <Card className="text-center p-4">
            <div className="text-2xl mb-2">🎨</div>
            <h3 className="font-medium">Personalizable</h3>
            <p className="text-sm text-muted-foreground">
              Temas claro/oscuro, leyenda opcional, selector de cabañas
            </p>
          </Card>
          <Card className="text-center p-4">
            <div className="text-2xl mb-2">📱</div>
            <h3 className="font-medium">Responsive</h3>
            <p className="text-sm text-muted-foreground">
              Diseñado para móvil y escritorio
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WidgetDemo;
