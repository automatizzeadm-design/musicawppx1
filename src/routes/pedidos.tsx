import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, CheckCircle2, Music } from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  phone: string;
  customer_name: string | null;
  choice: "musica" | "musica_site" | null;
  story: {
    homenageado_nome?: string;
    onde_se_conheceram?: string;
    filhos?: string;
    momento_marcante?: string;
    detalhes_extra?: string;
    estilo?: string;
  };
  letra: string | null;
  produced: boolean;
  updated_at: string;
}

export const Route = createFileRoute("/pedidos")({
  validateSearch: (s: Record<string, unknown>) => ({
    key: typeof s.key === "string" ? s.key : "",
  }),
  component: PedidosPage,
});

function choiceLabel(c: Order["choice"]): string {
  if (c === "musica_site") return "Música + site";
  if (c === "musica") return "Só música";
  return "—";
}

function PedidosPage() {
  const { key } = Route.useSearch();
  const queryClient = useQueryClient();
  const [showProduced, setShowProduced] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["pedidos", key],
    queryFn: async () => {
      const resp = await fetch(`/api/pedidos?key=${encodeURIComponent(key)}`);
      return resp.json() as Promise<{ ok: boolean; error?: string; orders?: Order[] }>;
    },
    enabled: Boolean(key),
  });

  const produceMutation = useMutation({
    mutationFn: async (id: string) => {
      const resp = await fetch(`/api/pedidos?key=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!resp.ok) throw new Error("falhou");
      return resp.json();
    },
    onSuccess: () => {
      toast.success("Marcado como produzido!");
      queryClient.invalidateQueries({ queryKey: ["pedidos", key] });
    },
    onError: () => toast.error("Não consegui marcar. Tente de novo."),
  });

  if (!key) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-2">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-muted-foreground">
          Acesso protegido. Abra com <code>?key=SUA_CHAVE</code> na URL (o valor de CRON_SECRET).
        </p>
      </div>
    );
  }

  if (data && !data.ok && data.error === "unauthorized") {
    return (
      <div className="p-8 max-w-xl mx-auto text-center text-destructive">
        Chave inválida. Confira o <code>?key=</code>.
      </div>
    );
  }

  const allOrders = data?.orders ?? [];
  const orders = showProduced ? allOrders : allOrders.filter((o) => !o.produced);
  const pendingCount = allOrders.filter((o) => !o.produced).length;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <header className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Music className="h-7 w-7 text-primary" /> Pedidos
          </h1>
          <p className="text-muted-foreground">
            {pendingCount} pendente{pendingCount === 1 ? "" : "s"} · {allOrders.length} no total
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowProduced((v) => !v)}>
            {showProduced ? "Ver só pendentes" : "Ver todos"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>
      </header>

      {data && !data.ok && data.error === "supabase_nao_configurado" && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
          Banco (Supabase) não configurado ainda — sem persistência, não há pedidos pra mostrar.
          Configure <code>AGENT_DB_URL</code> e <code>AGENT_DB_KEY</code>.
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center text-muted-foreground p-12 border border-dashed rounded-lg">
          Nenhum pedido {showProduced ? "" : "pendente"} por aqui.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {orders.map((o) => (
            <Card key={o.id} className={o.produced ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex justify-between items-center gap-2">
                  <span>{o.customer_name || "Cliente"}</span>
                  {o.produced ? (
                    <Badge variant="secondary">Produzido</Badge>
                  ) : (
                    <Badge>Pendente</Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {o.phone} · {choiceLabel(o.choice)}
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="space-y-0.5">
                  {o.story.homenageado_nome && <p><b>Homenageado(a):</b> {o.story.homenageado_nome}</p>}
                  {o.story.onde_se_conheceram && <p><b>Onde se conheceram:</b> {o.story.onde_se_conheceram}</p>}
                  {o.story.filhos && <p><b>Filhos:</b> {o.story.filhos}</p>}
                  {o.story.momento_marcante && <p><b>Momento:</b> {o.story.momento_marcante}</p>}
                  {o.story.estilo && <p><b>Estilo:</b> {o.story.estilo}</p>}
                  {o.story.detalhes_extra && <p><b>Detalhes:</b> {o.story.detalhes_extra}</p>}
                </div>
                {o.letra && (
                  <div>
                    <p className="font-semibold mb-1">Letra aprovada</p>
                    <pre className="whitespace-pre-wrap text-xs bg-muted p-3 rounded max-h-48 overflow-auto font-sans">
                      {o.letra}
                    </pre>
                  </div>
                )}
                {!o.produced && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => produceMutation.mutate(o.id)}
                    disabled={produceMutation.isPending}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Marcar como produzido
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
