import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Reservations from "./pages/Reservations";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import Solicitudes from "./pages/Solicitudes";
import WidgetDemo from "./pages/WidgetDemo";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Widget demo - sin layout */}
          <Route path="/widget-demo" element={<WidgetDemo />} />
          
          {/* Rutas principales con layout */}
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/calendar" element={<Layout><Calendar /></Layout>} />
          <Route path="/reservations" element={<Layout><Reservations /></Layout>} />
          <Route path="/solicitudes" element={<Layout><Solicitudes /></Layout>} />
          <Route path="/analytics" element={<Layout><Analytics /></Layout>} />
          <Route path="/reports" element={<Layout><Reports /></Layout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
