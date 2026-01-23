import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Ban, 
  CheckCircle, 
  RotateCcw,
  Loader2,
  Copy,
  Check,
  Calendar
} from 'lucide-react';
import { AdminLayout } from '@/admin/components/AdminLayout';
import { useAdminAuth } from '@/admin/hooks/useAdminAuth';
import { 
  listLicenses, 
  createLicense, 
  updateLicenseStatus, 
  resetLicenseActivation,
  updateLicenseExpiration
} from '@/admin/services/adminService';
import type { License } from '@/types/license';
import { formatDate } from '@/utils/dateFormat';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const LicenseList = () => {
  const { requireAuth, isLoading: authLoading, isAuthenticated } = useAdminAuth();
  const { toast } = useToast();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [filteredLicenses, setFilteredLicenses] = useState<License[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newExpirationDate, setNewExpirationDate] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [newExpDate, setNewExpDate] = useState('');

  useEffect(() => {
    requireAuth();
  }, [requireAuth]);

  const loadLicenses = async () => {
    setIsLoading(true);
    const result = await listLicenses();
    if (result.success && result.licenses) {
      setLicenses(result.licenses);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadLicenses();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    let filtered = [...licenses];

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(l => l.status === statusFilter);
    }

    // Filtro por termo de busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(l => 
        l.key.toLowerCase().includes(term) ||
        l.id.toLowerCase().includes(term)
      );
    }

    setFilteredLicenses(filtered);
  }, [licenses, statusFilter, searchTerm]);

  const handleCreateLicense = async () => {
    if (!newExpirationDate) {
      toast({ title: 'Erro', description: 'Selecione a data de expiração', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    const result = await createLicense(new Date(newExpirationDate).toISOString());
    
    if (result.success) {
      toast({ title: 'Sucesso', description: 'Licença criada com sucesso' });
      setCreateDialogOpen(false);
      setNewExpirationDate('');
      loadLicenses();
    } else {
      toast({ title: 'Erro', description: result.error || 'Erro ao criar licença', variant: 'destructive' });
    }
    setIsCreating(false);
  };

  const handleStatusChange = async (licenseId: string, newStatus: 'active' | 'blocked') => {
    const result = await updateLicenseStatus(licenseId, newStatus);
    if (result.success) {
      toast({ title: 'Sucesso', description: `Licença ${newStatus === 'active' ? 'ativada' : 'bloqueada'}` });
      loadLicenses();
    } else {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' });
    }
  };

  const handleResetActivation = async (licenseId: string) => {
    const result = await resetLicenseActivation(licenseId);
    if (result.success) {
      toast({ title: 'Sucesso', description: 'Ativação resetada com sucesso' });
      loadLicenses();
    } else {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' });
    }
  };

  const handleUpdateExpiration = async () => {
    if (!editingLicense || !newExpDate) return;

    const result = await updateLicenseExpiration(editingLicense.id, new Date(newExpDate).toISOString());
    if (result.success) {
      toast({ title: 'Sucesso', description: 'Data de expiração atualizada' });
      setEditingLicense(null);
      setNewExpDate('');
      loadLicenses();
    } else {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' });
    }
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Licenças</h1>
            <p className="text-muted-foreground">Gerenciamento de licenças do sistema</p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Licença
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Licença</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Data de Expiração
                  </label>
                  <Input
                    type="date"
                    value={newExpirationDate}
                    onChange={(e) => setNewExpirationDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <Button onClick={handleCreateLicense} disabled={isCreating} className="w-full">
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Licença'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por chave..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-md border border-input bg-background text-foreground"
              >
                <option value="all">Todos os status</option>
                <option value="active">Ativas</option>
                <option value="pending">Pendentes</option>
                <option value="expired">Expiradas</option>
                <option value="blocked">Bloqueadas</option>
              </select>
              <Button variant="outline" onClick={loadLicenses}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredLicenses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhuma licença encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Chave</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Expira em</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Criada em</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLicenses.map((license) => (
                      <tr key={license.id} className="border-b border-border/50 hover:bg-accent/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{license.key}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(license.key)}
                            >
                              {copiedKey === license.key ? (
                                <Check className="h-3 w-3 text-success" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(license.status)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{formatDate(license.expires_at)}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                setEditingLicense(license);
                                setNewExpDate(license.expires_at.split('T')[0]);
                              }}
                            >
                              <Calendar className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {formatDate(license.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            {license.status === 'blocked' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStatusChange(license.id, 'active')}
                                className="text-success hover:text-success"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            ) : license.status === 'active' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStatusChange(license.id, 'blocked')}
                                className="text-destructive hover:text-destructive"
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetActivation(license.id)}
                              title="Resetar ativação"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Expiration Dialog */}
        <Dialog open={!!editingLicense} onOpenChange={() => setEditingLicense(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Data de Expiração</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Licença: <span className="font-mono">{editingLicense?.key}</span>
              </p>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Nova Data de Expiração
                </label>
                <Input
                  type="date"
                  value={newExpDate}
                  onChange={(e) => setNewExpDate(e.target.value)}
                />
              </div>
              <Button onClick={handleUpdateExpiration} className="w-full">
                Atualizar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default LicenseList;
