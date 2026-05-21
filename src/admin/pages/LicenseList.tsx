import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Loader2, Plus, Search, Shield, UserPlus, XCircle } from "lucide-react";
import { AdminLayout } from "@/admin/components/AdminLayout";
import { useAdminAuth } from "@/admin/hooks/useAdminAuth";
import { createManagerAccess, subscribeAccessUsers, updateAccessUserStatus } from "@/admin/services/accessService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/utils/dateFormat";
import type { AppUser } from "@/types/auth";

const LicenseList = () => {
  const { requireAuth, isLoading: authLoading, isAuthenticated } = useAdminAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "gestor" as "gestor" | "lider_garagem",
  });

  useEffect(() => {
    requireAuth();
  }, [requireAuth]);

  useEffect(() => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    return subscribeAccessUsers(
      (nextUsers) => {
        setUsers(nextUsers);
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
        toast({
          title: "Erro",
          description: "Nao foi possivel carregar os acessos",
          variant: "destructive",
        });
      },
    );
  }, [isAuthenticated, toast]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term),
    );
  }, [searchTerm, users]);

  const handleCreateAccess = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;

    if (!formData.email.trim() || !formData.password.trim()) {
      toast({
        title: "Erro",
        description: "Informe email e senha",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha precisa ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await createManagerAccess(formData);
      setFormData({ name: "", email: "", password: "", role: "gestor" });
      toast({
        title: "Acesso criado",
        description: "Envie este email e senha para o usuario acessar o painel.",
      });
    } catch (error) {
      toast({
        title: "Erro ao criar acesso",
        description: error instanceof Error ? error.message : "Nao foi possivel criar o usuario",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (user: AppUser, status: AppUser["status"]) => {
    setIsSaving(true);
    try {
      await updateAccessUserStatus(user.id, status);
      toast({
        title: "Acesso atualizado",
        description: `${user.email} foi ${status === "active" ? "ativado" : "bloqueado"}.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: error instanceof Error ? error.message : "Nao foi possivel atualizar o acesso",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: AppUser["status"]) => {
    if (status === "active") return <Badge className="bg-success text-success-foreground">Ativo</Badge>;
    if (status === "blocked") return <Badge variant="destructive">Bloqueado</Badge>;
    return <Badge variant="secondary">Pendente</Badge>;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Acessos</h1>
          <p className="text-muted-foreground">Crie emails e senhas para gestores e lideres de garagem.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Novo Acesso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAccess} className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Cargo</label>
                  <Select value={formData.role} onValueChange={(role: "gestor" | "lider_garagem") => setFormData({ ...formData, role })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gestor">Gestor</SelectItem>
                      <SelectItem value="lider_garagem">Lider de garagem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Nome</label>
                  <Input
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    placeholder="Nome do gestor"
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                    placeholder="gestor@empresa.com"
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Senha</label>
                  <Input
                    type="text"
                    value={formData.password}
                    onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                    placeholder="Senha de acesso"
                    disabled={isSaving}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar acesso
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Gestores cadastrados ({filteredUsers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    Nenhum acesso de gestor cadastrado
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredUsers.map((user) => (
                      <div key={user.id} className="rounded-lg border border-border p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-medium">{user.name}</div>
                              {getStatusBadge(user.status)}
                              <Badge variant="outline">{user.role === "lider_garagem" ? "Lider de garagem" : "Gestor"}</Badge>
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">{user.email}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Criado em: {user.createdAt ? formatDateTime(user.createdAt) : "Data pendente"}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {user.status === "blocked" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(user, "active")}
                                disabled={isSaving}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Ativar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(user, "blocked")}
                                disabled={isSaving}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Bloquear
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default LicenseList;
