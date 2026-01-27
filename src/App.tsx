import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { OfflineIndicator } from "./components/OfflineIndicator";

// Lazy load pages for better initial load performance
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Reservations = lazy(() => import("./pages/Reservations"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Reports = lazy(() => import("./pages/Reports"));
const Solicitudes = lazy(() => import("./pages/Solicitudes"));
const WidgetDemo = lazy(() => import("./pages/WidgetDemo"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <OfflineIndicator />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
