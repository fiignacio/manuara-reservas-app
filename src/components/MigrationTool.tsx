import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Database, ArrowRight, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { migrateReservationsToReservas, getMigrationPreview, MigrationResult } from '@/lib/migrationService';
import { toast } from 'sonner';

export function MigrationTool() {
  const [preview, setPreview] = useState<{
    reservasCount: number;
    reservationsCount: number;
    duplicateCount: number;
    toMigrateCount: number;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [deleteAfterMigration, setDeleteAfterMigration] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);

  useEffect(() => {
    loadPreview();
  }, []);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const data = await getMigrationPreview();
      setPreview(data);
    } catch (error) {
      console.error('Error loading migration preview:', error);
      toast.error(`Error al cargar datos de migración: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMigrate = async () => {
    if (!preview || preview.toMigrateCount === 0) {
      toast.info('No hay datos para migrar');
      return;
    }

    setMigrating(true);
    setResult(null);
    
    try {
      const migrationResult = await migrateReservationsToReservas(deleteAfterMigration);
      setResult(migrationResult);
      
      if (migrationResult.success) {
        toast.success(`Migración completada: ${migrationResult.migrated} reservas migradas`);
        await loadPreview(); // Refresh preview
      } else {
        toast.error(`Migración con errores: ${migrationResult.errors.length} errores`);
      }
    } catch (error) {
      toast.error('Error durante la migración');
    } finally {
      setMigrating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Migración de Colecciones
        </CardTitle>
        <CardDescription>
          Consolida todas las reservas de la colección legacy "reservations" a la colección principal "reservas"
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview Stats */}
        {preview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{preview.reservasCount}</div>
              <div className="text-xs text-muted-foreground">En "reservas"</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{preview.reservationsCount}</div>
              <div className="text-xs text-muted-foreground">En "reservations"</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{preview.duplicateCount}</div>
              <div className="text-xs text-muted-foreground">Duplicados</div>
            </div>
            <div className="text-center p-3 bg-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-primary">{preview.toMigrateCount}</div>
              <div className="text-xs text-muted-foreground">A migrar</div>
            </div>
          </div>
        )}

        {/* Migration Flow Visualization */}
        <div className="flex items-center justify-center gap-2 py-4">
          <Badge variant="outline" className="text-sm">reservations</Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant="default" className="text-sm">reservas</Badge>
        </div>

        {/* Options */}
        <div className="flex items-center space-x-2 p-3 border rounded-lg">
          <Checkbox 
            id="delete" 
            checked={deleteAfterMigration}
            onCheckedChange={(checked) => setDeleteAfterMigration(checked === true)}
          />
          <label htmlFor="delete" className="text-sm cursor-pointer">
            Eliminar documentos de "reservations" después de migrar
          </label>
        </div>

        {/* Warning */}
        {deleteAfterMigration && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Precaución</AlertTitle>
            <AlertDescription>
              Esta acción eliminará los documentos originales de la colección "reservations" después de migrarlos. Esta operación no se puede deshacer.
            </AlertDescription>
          </Alert>
        )}

        {/* Result */}
        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
            {result.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertTitle>
              {result.success ? 'Migración Exitosa' : 'Migración con Errores'}
            </AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 text-sm">
                <li>Migrados: {result.migrated}</li>
                <li>Omitidos (duplicados): {result.skipped}</li>
                {result.deleted > 0 && <li>Eliminados: {result.deleted}</li>}
                {result.errors.length > 0 && (
                  <li className="text-destructive">Errores: {result.errors.length}</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Button */}
        <Button 
          onClick={handleMigrate}
          disabled={migrating || (preview?.toMigrateCount === 0)}
          className="w-full"
        >
          {migrating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Migrando...
            </>
          ) : preview?.toMigrateCount === 0 ? (
            'No hay datos para migrar'
          ) : (
            `Migrar ${preview?.toMigrateCount} reservas`
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
