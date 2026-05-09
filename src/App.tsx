import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Activation from "./pages/Activation";
import AdminDashboard from "./admin/pages/AdminDashboard";
import LicenseList from "./admin/pages/LicenseList";
import ActivityLogs from "./admin/pages/ActivityLogs";
import MobileGateAnswers from "./admin/pages/MobileGateAnswers";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DeviceRedirect } from "@/components/auth/DeviceRedirect";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { ManagerRoute } from "@/components/auth/ManagerRoute";
import { MobileRoute } from "@/components/auth/MobileRoute";
import { MobileApp } from "../mobile-app/src/MobileApp";
import { resetLegacySessionsOnce } from "@/utils/sessionReset";

resetLegacySessionsOnce();

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
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/admin/licenses"
              element={
                <AuthGuard>
                  <AdminRoute>
                    <LicenseList />
                  </AdminRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/admin/logs"
              element={
                <AuthGuard>
                  <AdminRoute>
                    <ActivityLogs />
                  </AdminRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/admin/mobile-gate"
              element={
                <AuthGuard>
                  <AdminRoute>
                    <MobileGateAnswers />
                  </AdminRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/gestor"
              element={
                <AuthGuard>
                  <ManagerRoute>
                    <Index />
                  </ManagerRoute>
                </AuthGuard>
              }
            />
            <Route path="/desktop" element={<Navigate to="/gestor" replace />} />
            <Route
              path="/mobile"
              element={
                <MobileRoute>
                  <MobileApp />
                </MobileRoute>
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
