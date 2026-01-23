import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Key, CheckCircle, XCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { AdminLayout } from '@/admin/components/AdminLayout';
import { useAdminAuth } from '@/admin/hooks/useAdminAuth';
import { getLicenseStats, listLicenses, type LicenseStats } from '@/admin/services/adminService';
import type { License } from '@/types/license';
import { formatDate } from '@/utils/dateFormat';

const AdminDashboard = () => {
  const { requireAuth, isLoading: authLoading, isAuthenticated } = useAdminAuth();
  const [stats, setStats] = useState<LicenseStats | null>(null);
  const [recentLicenses, setRecentLicenses] = useState<License[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    requireAuth();
  }, [requireAuth]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      setIsLoading(true);
      
      const [statsResult, licensesResult] = await Promise.all([
        getLicenseStats(),
        listLicenses(),
      ]);

      setStats(statsResult);
      
      if (licensesResult.success && licensesResult.licenses) {
        // Ordena por data de criação e pega as 5 mais recentes
        const sorted = [...licensesResult.licenses].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setRecentLicenses(sorted.slice(0, 5));
      }

      setIsLoading(false);
    };

    loadData();
  }, [isAuthenticated]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const statCards = [
    { title: 'Total de Licenças', value: stats?.total || 0, icon: Key, color: 'text-primary' },
    { title: 'Ativas', value: stats?.active || 0, icon: CheckCircle, color: 'text-success' },
    { title: 'Expiradas', value: stats?.expired || 0, icon: Clock, color: 'text-warning' },
    { title: 'Bloqueadas', value: stats?.blocked || 0, icon: XCircle, color: 'text-destructive' },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-success/20 text-success',
      expired: 'bg-warning/20 text-warning',
      blocked: 'bg-destructive/20 text-destructive',
      pending: 'bg-muted text-muted-foreground',
    };
    const labels: Record<string, string> = {
      active: 'Ativa',
      expired: 'Expirada',
      blocked: 'Bloqueada',
      pending: 'Pendente',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do sistema de licenciamento</p>
        </div>

        {/* Stats Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Card key={card.title}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{card.title}</p>
                          <p className="text-3xl font-bold mt-1">{card.value}</p>
                        </div>
                        <Icon className={`h-8 w-8 ${card.color}`} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Recent Licenses */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Licenças Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                {recentLicenses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma licença encontrada</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Chave</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Expira em</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Criada em</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentLicenses.map((license) => (
                          <tr key={license.id} className="border-b border-border/50 hover:bg-accent/50">
                            <td className="py-3 px-4 font-mono text-sm">{license.key}</td>
                            <td className="py-3 px-4">{getStatusBadge(license.status)}</td>
                            <td className="py-3 px-4 text-sm">{formatDate(license.expires_at)}</td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">{formatDate(license.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
