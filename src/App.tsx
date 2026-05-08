import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Activation from "./pages/Activation";
import AdminDashboard from "./admin/pages/AdminDashboard";
import LicenseList from "./admin/pages/LicenseList";
import ActivityLogs from "./admin/pages/ActivityLogs";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { DeviceRedirect } from "@/components/auth/DeviceRedirect";
import { MobileApp } from "../mobile-app/src/MobileApp";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/activation" element={<Activation />} />
            <Route path="/" element={<DeviceRedirect />} />

            <Route
              path="/admin"
              element={
                <AuthGuard>
                  <RoleGuard roles={["admin", "gestor"]}>
                    <AdminDashboard />
                  </RoleGuard>
                </AuthGuard>
              }
            />
            <Route
              path="/admin/licenses"
              element={
                <AuthGuard>
                  <RoleGuard roles={["admin", "gestor"]}>
                    <LicenseList />
                  </RoleGuard>
                </AuthGuard>
              }
            />
            <Route
              path="/admin/logs"
              element={
                <AuthGuard>
                  <RoleGuard roles={["admin", "gestor"]}>
                    <ActivityLogs />
                  </RoleGuard>
                </AuthGuard>
              }
            />
            <Route
              path="/desktop"
              element={
                <AuthGuard>
                  <RoleGuard roles={["admin", "gestor"]}>
                    <Index />
                  </RoleGuard>
                </AuthGuard>
              }
            />
            <Route
              path="/mobile"
              element={
                <AuthGuard>
                  <MobileApp />
                </AuthGuard>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
