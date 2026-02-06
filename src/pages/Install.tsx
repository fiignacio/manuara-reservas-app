import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Download, 
  CheckCircle2, 
  Smartphone, 
  Monitor, 
  Wifi, 
  WifiOff,
  Share,
  MoreVertical,
  PlusSquare,
  ArrowLeft,
  Chrome,
  Apple
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Install() {
  const {
    isInstalled,
    isInstallable,
    isIOS,
    isAndroid,
    isDesktop,
    isSafari,
    platform,
    promptInstall
  } = usePWAInstall();
  
  const navigate = useNavigate();

  const handleInstall = async () => {
    if (isInstallable) {
      await promptInstall();
    }
  };

  const benefits = [
    {
      icon: Smartphone,
      title: 'Acceso rápido',
      description: 'Icono en tu pantalla de inicio, como una app nativa'
    },
    {
      icon: WifiOff,
      title: 'Funciona sin internet',
      description: 'Consulta reservas y datos incluso offline'
    },
    {
      icon: Monitor,
      title: 'Pantalla completa',
      description: 'Sin barras del navegador, experiencia inmersiva'
    },
    {
      icon: Wifi,
      title: 'Actualizaciones automáticas',
      description: 'Siempre tendrás la última versión'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container flex items-center gap-4 h-14 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">Instalar Manuara Reservas</h1>
        </div>
      </header>

      <main className="container px-4 py-6 max-w-2xl mx-auto space-y-6">
        {/* Status Card */}
        {isInstalled ? (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">¡App instalada!</h2>
                <p className="text-muted-foreground">
                  Manuara Reservas ya está en tu dispositivo
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <img
                src="/icons/icon-192x192.png"
                alt="Manuara Reservas"
                className="w-16 h-16 rounded-xl shadow-md"
                onError={(e) => {
                  e.currentTarget.src = '/icons/icon-512x512.png';
                }}
              />
              <div className="flex-1">
                <h2 className="font-semibold text-lg">Manuara Reservas</h2>
                <p className="text-sm text-muted-foreground">
                  Sistema de gestión de cabañas
                </p>
                {isInstallable && (
                  <Button onClick={handleInstall} className="mt-3 gap-2">
                    <Download className="h-4 w-4" />
                    Instalar ahora
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Beneficios de instalar</CardTitle>
            <CardDescription>
              Disfruta de una experiencia mejorada
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <benefit.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Platform-specific Instructions */}
        {!isInstalled && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {isIOS && <Apple className="h-5 w-5" />}
                {(isAndroid || isDesktop) && <Chrome className="h-5 w-5" />}
                Instrucciones para {
                  isIOS ? 'iPhone/iPad' :
                  isAndroid ? 'Android' :
                  'Escritorio'
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isIOS ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Safari no muestra el botón de instalar automáticamente. Sigue estos pasos:
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                        1
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Toca el botón Compartir</p>
                        <p className="text-sm text-muted-foreground">
                          El icono de cuadrado con flecha hacia arriba
                        </p>
                        <div className="mt-2 p-3 bg-muted rounded-lg flex items-center justify-center">
                          <Share className="h-8 w-8 text-primary" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                        2
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Desplázate y selecciona "Añadir a inicio"</p>
                        <p className="text-sm text-muted-foreground">
                          Puede que necesites deslizar hacia abajo en el menú
                        </p>
                        <div className="mt-2 p-3 bg-muted rounded-lg flex items-center gap-3">
                          <PlusSquare className="h-6 w-6 text-primary" />
                          <span className="font-medium">Añadir a pantalla de inicio</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                        3
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Confirma tocando "Añadir"</p>
                        <p className="text-sm text-muted-foreground">
                          ¡Listo! Encontrarás el icono en tu pantalla de inicio
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : isAndroid ? (
                <div className="space-y-4">
                  {isInstallable ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Toca el botón "Instalar ahora" de arriba, o sigue estos pasos:
                      </p>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                            1
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">Abre el menú del navegador</p>
                            <p className="text-sm text-muted-foreground">
                              Los tres puntos verticales arriba a la derecha
                            </p>
                            <div className="mt-2 p-3 bg-muted rounded-lg flex items-center justify-center">
                              <MoreVertical className="h-8 w-8 text-primary" />
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                            2
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">Selecciona "Instalar aplicación"</p>
                            <p className="text-sm text-muted-foreground">
                              O "Añadir a pantalla de inicio"
                            </p>
                            <div className="mt-2 p-3 bg-muted rounded-lg flex items-center gap-3">
                              <Download className="h-6 w-6 text-primary" />
                              <span className="font-medium">Instalar aplicación</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground">
                      Abre esta página en Chrome o Edge para instalar la aplicación.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {isInstallable ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Toca el botón "Instalar ahora" de arriba, o busca el icono de instalación en la barra de direcciones del navegador.
                      </p>
                      <div className="p-4 bg-muted rounded-lg flex items-center gap-3">
                        <Download className="h-6 w-6 text-primary" />
                        <div>
                          <p className="font-medium">Instalar Manuara Reservas</p>
                          <p className="text-sm text-muted-foreground">
                            Busca este icono en la barra de direcciones
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground">
                      Abre esta página en Chrome, Edge o Safari para instalar la aplicación.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Back to app */}
        <div className="text-center pt-4">
          <Button variant="outline" onClick={() => navigate('/')}>
            Volver al Dashboard
          </Button>
        </div>
      </main>
    </div>
  );
}
