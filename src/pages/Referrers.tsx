import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Plus,
  Loader2,
  Download,
  FileText,
  CheckCircle2,
  CircleDashed,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Reservation } from '@/types/reservation';
import { Referrer } from '@/types/referrer';
import { getAllReservations } from '@/lib/reservations';
import {
  getAllReferrers,
  createReferrer,
  updateReferrer,
  deleteReferrer,
  setReservationReferrerPayment,
} from '@/lib/referrers';
import { formatDateForDisplay, parseDate, getTodayDate } from '@/lib/dateUtils';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const Referrers = () => {
  const { toast } = useToast();
  const today = new Date();

  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<number>(today.getMonth());
  const [year, setYear] = useState<number>(today.getFullYear());

  // Referrer dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Referrer | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [refs, res] = await Promise.all([getAllReferrers(), getAllReservations()]);
      setReferrers(refs);
      setReservations(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Group reservations by referrer for the selected month
  const grouped = useMemo(() => {
    const filtered = reservations.filter((r) => {
      if (!r.referrerId) return false;
      const ci = parseDate(r.checkIn);
      return ci.getMonth() === month && ci.getFullYear() === year;
    });

    const map = new Map<string, { referrer: Referrer | null; items: Reservation[] }>();
    for (const r of filtered) {
      const key = r.referrerId!;
      if (!map.has(key)) {
        const referrer = referrers.find((x) => x.id === key) || null;
        map.set(key, { referrer, items: [] });
      }
      map.get(key)!.items.push(r);
    }
    return Array.from(map.entries()).map(([id, val]) => ({
      id,
      referrer: val.referrer,
      name: val.referrer?.name || val.items[0]?.referrerName || 'Cliente eliminado',
      items: val.items.sort((a, b) => a.checkIn.localeCompare(b.checkIn)),
      total: val.items.reduce((s, r) => s + (r.totalPrice || 0), 0),
      pending: val.items
        .filter((r) => r.referrerPaymentStatus !== 'paid')
        .reduce((s, r) => s + (r.totalPrice || 0), 0),
      paid: val.items
        .filter((r) => r.referrerPaymentStatus === 'paid')
        .reduce((s, r) => s + (r.totalPrice || 0), 0),
    }));
  }, [reservations, referrers, month, year]);

  const togglePaid = async (r: Reservation) => {
    const next = r.referrerPaymentStatus === 'paid' ? 'pending' : 'paid';
    try {
      await setReservationReferrerPayment(r.id!, next);
      setReservations((prev) =>
        prev.map((x) =>
          x.id === r.id
            ? { ...x, referrerPaymentStatus: next, referrerPaidAt: next === 'paid' ? new Date().toISOString() : undefined }
            : x
        )
      );
      toast({ title: next === 'paid' ? '✅ Marcado como cobrado' : '🕓 Marcado como pendiente' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', phone: '', email: '', notes: '' });
    setDialogOpen(true);
  };

  const openEdit = (r: Referrer) => {
    setEditing(r);
    setForm({ name: r.name, phone: r.phone || '', email: r.email || '', notes: r.notes || '' });
    setDialogOpen(true);
  };

  const saveReferrer = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Nombre requerido', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editing?.id) {
        await updateReferrer(editing.id, form);
        toast({ title: '✅ Cliente actualizado' });
      } else {
        await createReferrer(form);
        toast({ title: '✅ Cliente creado' });
      }
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const removeReferrer = async (id: string) => {
    if (!confirm('¿Eliminar este cliente? Las reservas asociadas mantendrán el nombre histórico.')) return;
    try {
      await deleteReferrer(id);
      toast({ title: 'Cliente eliminado' });
      await load();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const periodLabel = `${MONTH_NAMES[month]} ${year}`;

  const exportCSV = () => {
    const rows: any[] = [];
    grouped.forEach((g) => {
      g.items.forEach((r) => {
        rows.push({
          Cliente: g.name,
          Pasajero: r.passengerName,
          Cabaña: r.cabinType,
          'Check-in': formatDateForDisplay(r.checkIn),
          'Check-out': formatDateForDisplay(r.checkOut),
          Personas: (r.adults || 0) + (r.children || 0) + (r.babies || 0),
          Total: r.totalPrice || 0,
          'Estado cobro': r.referrerPaymentStatus === 'paid' ? 'Cobrado' : 'Pendiente',
        });
      });
    });
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `referentes-${year}-${String(month + 1).padStart(2, '0')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Cuadre de Clientes Referentes — ${periodLabel}`, 14, 18);
    let y = 26;
    grouped.forEach((g) => {
      doc.setFontSize(12);
      doc.text(
        `${g.name} — Total: $${g.total.toLocaleString('es-CL')} | Pendiente: $${g.pending.toLocaleString('es-CL')}`,
        14,
        y
      );
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Pasajero', 'Cabaña', 'Check-in', 'Check-out', 'Total', 'Estado']],
        body: g.items.map((r) => [
          r.passengerName,
          r.cabinType,
          formatDateForDisplay(r.checkIn),
          formatDateForDisplay(r.checkOut),
          `$${(r.totalPrice || 0).toLocaleString('es-CL')}`,
          r.referrerPaymentStatus === 'paid' ? 'Cobrado' : 'Pendiente',
        ]),
        styles: { fontSize: 9 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
    doc.save(`referentes-${year}-${String(month + 1).padStart(2, '0')}.pdf`);
  };

  const yearOptions = useMemo(() => {
    const ys = new Set<number>([today.getFullYear()]);
    reservations.forEach((r) => {
      if (r.checkIn) ys.add(parseDate(r.checkIn).getFullYear());
    });
    return Array.from(ys).sort((a, b) => b - a);
  }, [reservations]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Clientes Referentes</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={openCreate} variant="default" size="sm">
            <Plus className="w-4 h-4 mr-1" /> Nuevo cliente
          </Button>
        </div>
      </div>

      {/* Filtros + export */}
      <Card>
        <CardContent className="pt-6 flex flex-wrap gap-3 items-end">
          <div>
            <Label className="text-xs">Mes</Label>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-40 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Año</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={grouped.length === 0}>
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportPDF} disabled={grouped.length === 0}>
              <FileText className="w-4 h-4 mr-1" /> PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Catálogo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catálogo de clientes ({referrers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {referrers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no tienes clientes referentes. Crea uno con el botón "Nuevo cliente".
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {referrers.map((r) => (
                <div key={r.id} className="flex items-center gap-2 border rounded-md px-3 py-2 bg-card">
                  <div className="text-sm">
                    <div className="font-medium">{r.name}</div>
                    {r.phone && <div className="text-xs text-muted-foreground">{r.phone}</div>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeReferrer(r.id!)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cuadre del mes */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Cuadre — {periodLabel}</h2>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6" /></div>
        ) : grouped.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              No hay reservas asociadas a clientes referentes en este período.
            </CardContent>
          </Card>
        ) : (
          grouped.map((g) => (
            <Card key={g.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{g.name}</CardTitle>
                  <div className="flex gap-2 text-xs">
                    <Badge variant="outline">Reservas: {g.items.length}</Badge>
                    <Badge variant="outline">Total: ${g.total.toLocaleString('es-CL')}</Badge>
                    <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                      Pendiente: ${g.pending.toLocaleString('es-CL')}
                    </Badge>
                    <Badge className="bg-green-100 text-green-800 border-green-300">
                      Cobrado: ${g.paid.toLocaleString('es-CL')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {g.items.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 border rounded-md p-3 bg-card"
                  >
                    <div className="text-sm">
                      <div className="font-medium">{r.passengerName}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.cabinType} · {formatDateForDisplay(r.checkIn)} → {formatDateForDisplay(r.checkOut)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-semibold">
                        ${(r.totalPrice || 0).toLocaleString('es-CL')}
                      </div>
                      <Button
                        size="sm"
                        variant={r.referrerPaymentStatus === 'paid' ? 'default' : 'outline'}
                        onClick={() => togglePaid(r)}
                      >
                        {r.referrerPaymentStatus === 'paid' ? (
                          <><CheckCircle2 className="w-4 h-4 mr-1" /> Cobrado</>
                        ) : (
                          <><CircleDashed className="w-4 h-4 mr-1" /> Pendiente</>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente referente'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nombre *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Notas</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveReferrer} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Referrers;
