
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Reservations from "./pages/Reservations";
import Quotes from "./pages/Quotes";
import Analytics from "./pages/Analytics";
import { Notifications } from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import { useNotificationProcessor } from "./hooks/useNotificationProcessor";

const queryClient = new QueryClient();

const AppContent = () => {
  // Activar el procesador de notificaciones automático
  useNotificationProcessor();

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/reservations" element={<Reservations />} />
        <Route path="/quotes" element={<Quotes />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/notifications" element={<Notifications />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
