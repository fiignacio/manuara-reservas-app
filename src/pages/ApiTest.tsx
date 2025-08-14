import ApiTester from "@/components/ApiTester";

export default function ApiTest() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Prueba de API</h1>
        <p className="text-muted-foreground">
          Interfaz para probar la API de disponibilidad de cabañas
        </p>
      </div>
      <ApiTester />
    </div>
  );
}