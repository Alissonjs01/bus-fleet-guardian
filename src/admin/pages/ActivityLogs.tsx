import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw, Loader2, ScrollText } from 'lucide-react';
import { AdminLayout } from '@/admin/components/AdminLayout';
import { useAdminAuth } from '@/admin/hooks/useAdminAuth';
import { getActivityLogs } from '@/admin/services/adminService';
import type { ActivityLog } from '@/types/license';
import { formatDate } from '@/utils/dateFormat';

const ActivityLogs = () => {
  const { requireAuth, isLoading: authLoading, isAuthenticated } = useAdminAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  useEffect(() => {
    requireAuth();
  }, [requireAuth]);

  const loadLogs = async () => {
    setIsLoading(true);
    const result = await getActivityLogs();
    if (result.success && result.logs) {
      setLogs(result.logs);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadLogs();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    let filtered = [...logs];

    // Filtro por ação
    if (actionFilter !== 'all') {
      filtered = filtered.filter(l => l.action === actionFilter);
    }

    // Filtro por termo de busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(l => 
        l.action.toLowerCase().includes(term) ||
        l.ip_address?.toLowerCase().includes(term) ||
        l.license_id?.toLowerCase().includes(term) ||
        JSON.stringify(l.details).toLowerCase().includes(term)
      );
    }

    setFilteredLogs(filtered);
  }, [logs, actionFilter, searchTerm]);

  const getActionBadge = (action: string) => {
    const styles: Record<string, string> = {
      activation: 'bg-success/20 text-success',
      validation: 'bg-info/20 text-info',
      blocked: 'bg-destructive/20 text-destructive',
      reset: 'bg-warning/20 text-warning',
      created: 'bg-primary/20 text-primary',
      updated: 'bg-muted text-muted-foreground',
    };
    const labels: Record<string, string> = {
      activation: 'Ativação',
      validation: 'Validação',
      blocked: 'Bloqueio',
      reset: 'Reset',
      created: 'Criação',
      updated: 'Atualização',
    };
    
    const style = styles[action] || styles.updated;
    const label = labels[action] || action;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>
        {label}
      </span>
    );
  };

  // Extrai ações únicas para o filtro
  const uniqueActions = [...new Set(logs.map(l => l.action))];

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

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Logs de Atividade</h1>
          <p className="text-muted-foreground">Histórico de ações do sistema</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar nos logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-3 py-2 rounded-md border border-input bg-background text-foreground"
              >
                <option value="all">Todas as ações</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
              <Button variant="outline" onClick={loadLogs}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              Registros ({filteredLogs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum log encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Data/Hora</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Ação</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Licença</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">IP</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="border-b border-border/50 hover:bg-accent/50">
                        <td className="py-3 px-4 text-sm">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="py-3 px-4">{getActionBadge(log.action)}</td>
                        <td className="py-3 px-4 font-mono text-sm text-muted-foreground">
                          {log.license_id?.substring(0, 8) || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {log.ip_address || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground max-w-xs truncate">
                          {log.details ? JSON.stringify(log.details) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default ActivityLogs;
