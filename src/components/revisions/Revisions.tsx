import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Revisions = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Revisões</h2>
        <p className="text-muted-foreground">
          Gerencie as revisões agendadas e em andamento dos veículos.
        </p>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Agendadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-sm text-muted-foreground mt-1">Revisões marcadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Em Andamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-sm text-muted-foreground mt-1">Revisões em progresso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atrasadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-sm text-muted-foreground mt-1">Revisões vencidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de revisões */}
      <Card>
        <CardHeader>
          <CardTitle>Próximas Revisões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="text-left border-b">
                  <th className="pb-2">Veículo</th>
                  <th className="pb-2">Data</th>
                  <th className="pb-2">Tipo</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Ônibus 001</td>
                  <td>2025-04-10</td>
                  <td>Troca de óleo</td>
                  <td><span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">Pendente</span></td>
                </tr>
                <tr>
                  <td>Ônibus 007</td>
                  <td>2025-04-12</td>
                  <td>Revisão geral</td>
                  <td><span className="px-2 py-1 bg-green-100 text-green-800 rounded">Em andamento</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};