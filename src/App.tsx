import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Activation from "./pages/Activation";
import AdminLogin from "./admin/pages/AdminLogin";
import AdminDashboard from "./admin/pages/AdminDashboard";
import LicenseList from "./admin/pages/LicenseList";
import ActivityLogs from "./admin/pages/ActivityLogs";
import { LicenseGuard } from "./components/auth/LicenseGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/activation" element={<Activation />} />
          
          {/* Rotas do admin (ocultas) */}
          <Route path="/admin-panel-secure" element={<AdminLogin />} />
          <Route path="/admin-panel-secure/dashboard" element={<AdminDashboard />} />
          <Route path="/admin-panel-secure/licenses" element={<LicenseList />} />
          <Route path="/admin-panel-secure/logs" element={<ActivityLogs />} />
          
          {/* Rota principal protegida por licença */}
          <Route path="/" element={
            <LicenseGuard>
              <Index />
            </LicenseGuard>
          } />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;