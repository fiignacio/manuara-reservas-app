import { useEffect, useState } from 'react';
import { Plus, Loader2, Users } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Referrer } from '@/types/referrer';
import { getAllReferrers, createReferrer } from '@/lib/referrers';

interface ReferrerSelectorProps {
  value?: { referrerId?: string; referrerName?: string };
  onChange: (val: { referrerId?: string; referrerName?: string }) => void;
}

const ReferrerSelector = ({ value, onChange }: ReferrerSelectorProps) => {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(!!value?.referrerId);
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const list = await getAllReferrers();
      setReferrers(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled && referrers.length === 0) load();
  }, [enabled]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast({ title: 'Nombre requerido', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const id = await createReferrer({ name: newName.trim(), phone: newPhone.trim() });
      await load();
      onChange({ referrerId: id, referrerName: newName.trim() });
      setShowCreate(false);
      setNewName('');
      setNewPhone('');
      toast({ title: '✅ Cliente referente creado' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-accent/50 p-4 rounded-lg border space-y-3">
      <div className="flex items-center gap-2">
        <Checkbox
          id="hasReferrer"
          checked={enabled}
          onCheckedChange={(checked) => {
            const on = !!checked;
            setEnabled(on);
            if (!on) onChange({ referrerId: undefined, referrerName: undefined });
          }}
        />
        <Users className="w-4 h-4 text-primary" />
        <Label htmlFor="hasReferrer" className="text-sm font-medium cursor-pointer">
          Reserva referida por un cliente
        </Label>
      </div>

      {enabled && (
        <>
          <p className="text-xs text-muted-foreground">
            Asocia esta reserva a un cliente referente para incluirla en el cuadre mensual de cobros.
          </p>

          {!showCreate && (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-xs">Cliente referente</Label>
                <Select
                  value={value?.referrerId || ''}
                  onValueChange={(id) => {
                    const r = referrers.find((x) => x.id === id);
                    onChange({ referrerId: id, referrerName: r?.name });
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={loading ? 'Cargando...' : 'Selecciona un cliente'} />
                  </SelectTrigger>
                  <SelectContent>
                    {referrers.length === 0 && !loading && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        Sin clientes. Crea uno nuevo.
                      </div>
                    )}
                    {referrers.map((r) => (
                      <SelectItem key={r.id} value={r.id!}>
                        {r.name}
                        {r.phone ? ` — ${r.phone}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="w-4 h-4 mr-1" /> Nuevo
              </Button>
            </div>
          )}

          {showCreate && (
            <div className="space-y-2 border rounded-md p-3 bg-background">
              <Label className="text-xs">Nombre del cliente</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: Juan Pérez"
              />
              <Label className="text-xs">Teléfono (opcional)</Label>
              <Input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Ej: +56 9 ..."
              />
              <div className="flex gap-2 pt-1">
                <Button type="button" size="sm" onClick={handleCreate} disabled={creating}>
                  {creating && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  Crear
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowCreate(false);
                    setNewName('');
                    setNewPhone('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReferrerSelector;
