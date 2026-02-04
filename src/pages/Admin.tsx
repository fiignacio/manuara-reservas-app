import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Save, Plus, Trash2, GripVertical, RotateCcw, DollarSign, Home, Calendar, Cloud, CloudOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { 
  getAdminConfig, 
  saveAdminConfig, 
  resetToDefaults,
  CabinConfig,
  PricingConfig,
  AdminConfig
} from '@/lib/adminConfig';

const CABIN_COLORS = [
  { value: 'bg-blue-500', label: 'Azul', preview: 'bg-blue-500' },
  { value: 'bg-purple-500', label: 'Morado', preview: 'bg-purple-500' },
  { value: 'bg-amber-500', label: 'Ámbar', preview: 'bg-amber-500' },
  { value: 'bg-pink-500', label: 'Rosa', preview: 'bg-pink-500' },
  { value: 'bg-green-500', label: 'Verde', preview: 'bg-green-500' },
  { value: 'bg-red-500', label: 'Rojo', preview: 'bg-red-500' },
  { value: 'bg-indigo-500', label: 'Índigo', preview: 'bg-indigo-500' },
  { value: 'bg-teal-500', label: 'Turquesa', preview: 'bg-teal-500' },
  { value: 'bg-orange-500', label: 'Naranja', preview: 'bg-orange-500' },
  { value: 'bg-cyan-500', label: 'Cian', preview: 'bg-cyan-500' },
];

const Admin = () => {
  const { toast } = useToast();
  const { isOnline, isSyncing, pendingCount, pendingOperations, syncNow } = useOfflineSync();
  
  const [config, setConfig] = useState<AdminConfig>(getAdminConfig());
  const [hasChanges, setHasChanges] = useState(false);
  const [editingCabin, setEditingCabin] = useState<string | null>(null);
  
  // New cabin form state
  const [newCabin, setNewCabin] = useState({
    displayName: '',
    maxCapacity: 4,
    color: 'bg-green-500',
  });

  const updateConfig = useCallback((updates: Partial<AdminConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  const updatePricing = useCallback((updates: Partial<PricingConfig>) => {
    setConfig(prev => ({
      ...prev,
      pricing: { ...prev.pricing, ...updates },
    }));
    setHasChanges(true);
  }, []);

  const updateCabin = useCallback((id: string, updates: Partial<CabinConfig>) => {
    setConfig(prev => ({
      ...prev,
      cabins: prev.cabins.map(c => c.id === id ? { ...c, ...updates } : c),
    }));
    setHasChanges(true);
  }, []);

  const addCabin = useCallback(() => {
    if (!newCabin.displayName.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre de la cabaña es requerido.',
        variant: 'destructive',
      });
      return;
    }

    const cabin: CabinConfig = {
      id: `cabin-${Date.now()}`,
      name: `${newCabin.displayName} (Max ${newCabin.maxCapacity}p)`,
      displayName: newCabin.displayName,
      maxCapacity: newCabin.maxCapacity,
      color: newCabin.color,
      isActive: true,
      order: config.cabins.length + 1,
    };

    setConfig(prev => ({
      ...prev,
      cabins: [...prev.cabins, cabin],
    }));
    setHasChanges(true);
    setNewCabin({ displayName: '', maxCapacity: 4, color: 'bg-green-500' });
    
    toast({
      title: 'Cabaña agregada',
      description: `Se agregó "${cabin.displayName}" correctamente.`,
    });
  }, [newCabin, config.cabins.length, toast]);

  const deleteCabin = useCallback((id: string) => {
    setConfig(prev => ({
      ...prev,
      cabins: prev.cabins.map(c => c.id === id ? { ...c, isActive: false } : c),
    }));
    setHasChanges(true);
    
    toast({
      title: 'Cabaña eliminada',
      description: 'La cabaña fue marcada como inactiva.',
    });
  }, [toast]);

  const restoreCabin = useCallback((id: string) => {
    setConfig(prev => ({
      ...prev,
      cabins: prev.cabins.map(c => c.id === id ? { ...c, isActive: true } : c),
    }));
    setHasChanges(true);
  }, []);

  const saveChanges = useCallback(() => {
    saveAdminConfig(config);
    setHasChanges(false);
    
    toast({
      title: 'Configuración guardada',
      description: 'Los cambios se aplicarán en las nuevas reservas.',
    });
  }, [config, toast]);

  const handleReset = useCallback(() => {
    const defaultConfig = resetToDefaults();
    setConfig(defaultConfig);
    setHasChanges(false);
    
    toast({
      title: 'Configuración restaurada',
      description: 'Se restauró la configuración por defecto.',
    });
  }, [toast]);

  const activeCabins = config.cabins.filter(c => c.isActive);
  const inactiveCabins = config.cabins.filter(c => !c.isActive);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in pb-24 sm:pb-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-7 w-7" />
            Administración
          </h1>
          <p className="text-sm text-muted-foreground">
            Configura cabañas, precios y preferencias del sistema
          </p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button onClick={saveChanges} className="w-full sm:w-auto">
              <Save className="w-4 h-4 mr-2" />
              Guardar cambios
            </Button>
          )}
        </div>
      </div>

      {/* Offline Sync Status */}
      {pendingCount > 0 && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <CloudOff className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">{pendingCount} operación(es) pendiente(s)</span>
              {!isOnline && <Badge variant="outline">Offline</Badge>}
            </div>
            {isOnline && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={syncNow}
                disabled={isSyncing}
                className="h-7"
              >
                {isSyncing ? (
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Cloud className="w-3 h-3 mr-1" />
                )}
                Sincronizar ahora
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="cabins" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="cabins" className="text-xs sm:text-sm">
            <Home className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Cabañas</span>
            <span className="sm:hidden">Cabañas</span>
          </TabsTrigger>
          <TabsTrigger value="pricing" className="text-xs sm:text-sm">
            <DollarSign className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Precios</span>
            <span className="sm:hidden">Precios</span>
          </TabsTrigger>
          <TabsTrigger value="sync" className="text-xs sm:text-sm">
            <Cloud className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Sincronización</span>
            <span className="sm:hidden">Sync</span>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Cabins Tab */}
        <TabsContent value="cabins" className="space-y-4 mt-4">
          {/* Add New Cabin */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Agregar Nueva Cabaña
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="cabinName">Nombre</Label>
                  <Input
                    id="cabinName"
                    placeholder="Ej: Cabaña Familiar"
                    value={newCabin.displayName}
                    onChange={(e) => setNewCabin(prev => ({ ...prev, displayName: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="maxCapacity">Capacidad Máx.</Label>
                  <Select 
                    value={String(newCabin.maxCapacity)} 
                    onValueChange={(v) => setNewCabin(prev => ({ ...prev, maxCapacity: parseInt(v) }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5, 6, 7, 8, 10].map(n => (
                        <SelectItem key={n} value={String(n)}>{n} personas</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Color</Label>
                  <Select 
                    value={newCabin.color} 
                    onValueChange={(v) => setNewCabin(prev => ({ ...prev, color: v }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded ${newCabin.color}`}></div>
                          <span>{CABIN_COLORS.find(c => c.value === newCabin.color)?.label}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CABIN_COLORS.map(color => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded ${color.preview}`}></div>
                            <span>{color.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={addCabin} className="mt-4 w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Cabaña
              </Button>
            </CardContent>
          </Card>

          {/* Active Cabins */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Cabañas Activas ({activeCabins.length})</CardTitle>
              <CardDescription>Arrastra para reordenar. Haz clic para editar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeCabins.map((cabin) => (
                <div
                  key={cabin.id}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                  <div className={`w-4 h-4 rounded ${cabin.color}`}></div>
                  
                  {editingCabin === cabin.id ? (
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input
                        value={cabin.displayName}
                        onChange={(e) => updateCabin(cabin.id, { 
                          displayName: e.target.value,
                          name: `${e.target.value} (Max ${cabin.maxCapacity}p)`
                        })}
                        className="h-9"
                      />
                      <Select 
                        value={String(cabin.maxCapacity)} 
                        onValueChange={(v) => updateCabin(cabin.id, { 
                          maxCapacity: parseInt(v),
                          name: `${cabin.displayName} (Max ${v}p)`
                        })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[2, 3, 4, 5, 6, 7, 8, 10].map(n => (
                            <SelectItem key={n} value={String(n)}>{n}p</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select 
                        value={cabin.color} 
                        onValueChange={(v) => updateCabin(cabin.id, { color: v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CABIN_COLORS.map(color => (
                            <SelectItem key={color.value} value={color.value}>
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded ${color.preview}`}></div>
                                <span className="text-xs">{color.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <p className="font-medium">{cabin.displayName}</p>
                      <p className="text-xs text-muted-foreground">Máx. {cabin.maxCapacity} personas</p>
                    </div>
                  )}
                  
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingCabin(editingCabin === cabin.id ? null : cabin.id)}
                    >
                      {editingCabin === cabin.id ? 'Listo' : 'Editar'}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar cabaña?</AlertDialogTitle>
                          <AlertDialogDescription>
                            La cabaña "{cabin.displayName}" será marcada como inactiva. Las reservas existentes no se verán afectadas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteCabin(cabin.id)}>
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
              
              {activeCabins.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No hay cabañas activas. Agrega una nueva arriba.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Inactive Cabins */}
          {inactiveCabins.length > 0 && (
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-muted-foreground">
                  Cabañas Inactivas ({inactiveCabins.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {inactiveCabins.map((cabin) => (
                  <div
                    key={cabin.id}
                    className="flex items-center justify-between p-3 border border-dashed rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded ${cabin.color} opacity-50`}></div>
                      <span className="text-muted-foreground">{cabin.displayName}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => restoreCabin(cabin.id)}>
                      Restaurar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Tarifas por Persona por Noche
              </CardTitle>
              <CardDescription>
                Configura los precios según temporada y tipo de huésped
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Adult Rates */}
              <div className="space-y-4">
                <h4 className="font-medium">Adultos</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="adultHigh">Temporada Alta (CLP)</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="adultHigh"
                        type="number"
                        min="0"
                        step="1000"
                        value={config.pricing.adultHighSeason}
                        onChange={(e) => updatePricing({ adultHighSeason: parseInt(e.target.value) || 0 })}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="adultLow">Temporada Baja (CLP)</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="adultLow"
                        type="number"
                        min="0"
                        step="1000"
                        value={config.pricing.adultLowSeason}
                        onChange={(e) => updatePricing({ adultLowSeason: parseInt(e.target.value) || 0 })}
                        className="pl-8"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Children Rate */}
              <div className="space-y-4">
                <h4 className="font-medium">Niños (cualquier temporada)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="childRate">Tarifa Niños (CLP)</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="childRate"
                        type="number"
                        min="0"
                        step="1000"
                        value={config.pricing.childRate}
                        onChange={(e) => updatePricing({ childRate: parseInt(e.target.value) || 0 })}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="babyRate">Tarifa Bebés (CLP)</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="babyRate"
                        type="number"
                        min="0"
                        step="1000"
                        value={config.pricing.babyRate}
                        onChange={(e) => updatePricing({ babyRate: parseInt(e.target.value) || 0 })}
                        className="pl-8"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Generalmente $0</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Price Preview */}
              <div className="bg-accent/50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Vista Previa de Precios</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">2 Adultos, 1 Noche (Alta)</p>
                    <p className="font-bold text-lg">${(config.pricing.adultHighSeason * 2).toLocaleString('es-CL')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">2 Adultos, 1 Noche (Baja)</p>
                    <p className="font-bold text-lg">${(config.pricing.adultLowSeason * 2).toLocaleString('es-CL')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">2 Adultos + 2 Niños, 3 Noches (Alta)</p>
                    <p className="font-bold text-lg">
                      ${((config.pricing.adultHighSeason * 2 + config.pricing.childRate * 2) * 3).toLocaleString('es-CL')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">2 Adultos + 2 Niños, 3 Noches (Baja)</p>
                    <p className="font-bold text-lg">
                      ${((config.pricing.adultLowSeason * 2 + config.pricing.childRate * 2) * 3).toLocaleString('es-CL')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seasons Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Temporadas
              </CardTitle>
              <CardDescription>
                Define los períodos de temporada alta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {config.seasons.high.map((season, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Badge variant="destructive">{season.name}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {season.startDay}/{season.startMonth} - {season.endDay}/{season.endMonth}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Los períodos fuera de temporada alta se consideran temporada baja.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Tab */}
        <TabsContent value="sync" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {isOnline ? <Cloud className="w-5 h-5 text-green-500" /> : <CloudOff className="w-5 h-5 text-yellow-500" />}
                Estado de Conexión
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></div>
                <span className="font-medium">{isOnline ? 'Conectado' : 'Sin conexión'}</span>
              </div>
              {!isOnline && (
                <p className="text-sm text-muted-foreground mt-2">
                  Los cambios se guardarán localmente y se sincronizarán cuando vuelvas a conectarte.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Cola de Sincronización
              </CardTitle>
              <CardDescription>
                {pendingCount > 0 
                  ? `${pendingCount} operación(es) pendiente(s) de sincronizar`
                  : 'No hay operaciones pendientes'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingOperations.length > 0 ? (
                <div className="space-y-2">
                  {pendingOperations.map((op) => (
                    <div key={op.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                      <div className="flex items-center gap-3">
                        <Badge variant={op.type === 'delete' ? 'destructive' : 'secondary'}>
                          {op.type === 'create' && 'Crear'}
                          {op.type === 'update' && 'Actualizar'}
                          {op.type === 'delete' && 'Eliminar'}
                          {op.type === 'status_update' && 'Estado'}
                        </Badge>
                        <span className="text-muted-foreground">
                          {new Date(op.timestamp).toLocaleString('es-CL')}
                        </span>
                      </div>
                      {op.error && (
                        <Badge variant="outline" className="text-red-500">
                          Error: {op.retryCount} intento(s)
                        </Badge>
                      )}
                    </div>
                  ))}
                  
                  <Button 
                    onClick={syncNow} 
                    disabled={!isOnline || isSyncing}
                    className="w-full mt-4"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <Cloud className="w-4 h-4 mr-2" />
                        Sincronizar Ahora
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Cloud className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Todo está sincronizado</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reset Settings */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Zona de Peligro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full sm:w-auto">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restaurar Configuración por Defecto
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Restaurar configuración?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción restaurará todas las cabañas y precios a los valores por defecto. Las reservas existentes no se verán afectadas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset}>
                      Restaurar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
