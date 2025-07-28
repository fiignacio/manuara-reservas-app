import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface Passenger {
  id: string;
  name: string;
  rut: string;
}

interface PassengerManagementProps {
  passengers: Passenger[];
  onPassengersChange: (passengers: Passenger[]) => void;
}

export const PassengerManagement: React.FC<PassengerManagementProps> = ({
  passengers,
  onPassengersChange,
}) => {
  const [individualName, setIndividualName] = useState('');
  const [individualRut, setIndividualRut] = useState('');
  const [bulkText, setBulkText] = useState('');
  const { toast } = useToast();

  const formatRut = (rut: string): string => {
    // Remove all non-numeric characters except 'k' or 'K'
    const cleaned = rut.replace(/[^0-9kK]/g, '').toLowerCase();
    
    if (cleaned.length <= 1) return cleaned;
    
    // Add dots and hyphen
    const body = cleaned.slice(0, -1);
    const verifier = cleaned.slice(-1);
    
    // Add dots every 3 digits from right to left
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    return `${formattedBody}-${verifier}`;
  };

  const validateRut = (rut: string): boolean => {
    const cleaned = rut.replace(/[^0-9kK]/g, '').toLowerCase();
    if (cleaned.length < 8 || cleaned.length > 9) return false;
    
    const body = cleaned.slice(0, -1);
    const verifier = cleaned.slice(-1);
    
    if (!/^\d+$/.test(body)) return false;
    if (!/^[0-9k]$/.test(verifier)) return false;
    
    return true;
  };

  const addIndividualPassenger = () => {
    if (!individualName.trim() || !individualRut.trim()) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos",
        variant: "destructive",
      });
      return;
    }

    if (!validateRut(individualRut)) {
      toast({
        title: "RUT inválido",
        description: "Por favor ingrese un RUT válido",
        variant: "destructive",
      });
      return;
    }

    const formattedRut = formatRut(individualRut);
    const newPassenger: Passenger = {
      id: Date.now().toString(),
      name: individualName.trim(),
      rut: formattedRut,
    };

    onPassengersChange([...passengers, newPassenger]);
    setIndividualName('');
    setIndividualRut('');
    
    toast({
      title: "Pasajero agregado",
      description: `${newPassenger.name} ha sido agregado a la lista`,
    });
  };

  const processBulkPassengers = () => {
    if (!bulkText.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingrese la lista de pasajeros",
        variant: "destructive",
      });
      return;
    }

    const lines = bulkText.trim().split('\n');
    const newPassengers: Passenger[] = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      const parts = trimmedLine.split(',');
      if (parts.length !== 2) {
        errors.push(`Línea ${index + 1}: Formato incorrecto`);
        return;
      }

      const name = parts[0].trim();
      const rut = parts[1].trim();

      if (!name || !rut) {
        errors.push(`Línea ${index + 1}: Nombre o RUT vacío`);
        return;
      }

      if (!validateRut(rut)) {
        errors.push(`Línea ${index + 1}: RUT inválido (${rut})`);
        return;
      }

      const formattedRut = formatRut(rut);
      newPassengers.push({
        id: `${Date.now()}-${index}`,
        name,
        rut: formattedRut,
      });
    });

    if (errors.length > 0) {
      toast({
        title: "Errores encontrados",
        description: errors.join(', '),
        variant: "destructive",
      });
      return;
    }

    if (newPassengers.length === 0) {
      toast({
        title: "Error",
        description: "No se encontraron pasajeros válidos",
        variant: "destructive",
      });
      return;
    }

    onPassengersChange([...passengers, ...newPassengers]);
    setBulkText('');
    
    toast({
      title: "Pasajeros agregados",
      description: `${newPassengers.length} pasajero(s) agregado(s) exitosamente`,
    });
  };

  const removePassenger = (id: string) => {
    onPassengersChange(passengers.filter(p => p.id !== id));
    toast({
      title: "Pasajero eliminado",
      description: "El pasajero ha sido eliminado de la lista",
    });
  };

  return (
    <div className="space-y-6">
      {/* Bulk Paste Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Pegado Rápido de Pasajeros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pegue aquí la lista de pasajeros. Use una línea por persona, separando nombre y RUT con una coma (,).
          </p>
          <Textarea
            placeholder={`Ejemplo:\nPaula Acevedo, 19.898.916-9\nSoledad Gutiérrez, 15.362.425-9`}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className="min-h-[120px] font-mono text-sm"
          />
          <Button onClick={processBulkPassengers} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Procesar y Agregar
          </Button>
        </CardContent>
      </Card>

      {/* Individual Passenger Section */}
      <Card>
        <CardHeader>
          <CardTitle>Agregar Pasajero Individual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="passenger-name">Nombre Completo</Label>
              <Input
                id="passenger-name"
                placeholder="Ej: Juan Pérez"
                value={individualName}
                onChange={(e) => setIndividualName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="passenger-rut">RUT</Label>
              <Input
                id="passenger-rut"
                placeholder="Ej: 12.345.678-9"
                value={individualRut}
                onChange={(e) => setIndividualRut(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={addIndividualPassenger} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Agregar
          </Button>
        </CardContent>
      </Card>

      {/* Passengers List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pasajeros ({passengers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {passengers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aún no se han agregado pasajeros.
            </p>
          ) : (
            <div className="space-y-2">
              {passengers.map((passenger) => (
                <div
                  key={passenger.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{passenger.name}</p>
                    <p className="text-sm text-muted-foreground">{passenger.rut}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePassenger(passenger.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};