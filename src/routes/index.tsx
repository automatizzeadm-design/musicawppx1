import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, ListOrdered, Loader2, Music, RefreshCw, XCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

interface Diag {
  ok: boolean;
  ready: boolean;
  db_ok?: boolean;
  env?: {
    openai: boolean;
    evolution_url: boolean;
    evolution_key: boolean;
    supabase: boolean;
    cron_secret: boolean;
    exemplos_audio: boolean;
    owner_whatsapp: boolean;
  };
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm">{label}</span>
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500" />
      )}
    </div>
  );
}

function Home() {
  const [key, setKey] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["status"],
    queryFn: async () => (await fetch("/api/webhook/evolution")).json() as Promise<Diag>,
    refetchInterval: 30000,
  });

  const env = data?.env;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Music className="h-7 w-7 text-primary" /> Sua Música Personalizada
            </h1>
            <p className="text-muted-foreground">Painel do agente de WhatsApp</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status do sistema</CardTitle>
            <CardDescription>O agente responde automaticamente no WhatsApp conectado.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : env ? (
              <div className="grid sm:grid-cols-2 sm:gap-x-10">
                <StatusRow label="Webhook online" ok={Boolean(data?.ready)} />
                <StatusRow label="Banco de dados" ok={Boolean(data?.db_ok)} />
                <StatusRow label="OpenAI" ok={env.openai} />
                <StatusRow label="Evolution API" ok={env.evolution_url && env.evolution_key} />
                <StatusRow label="Memória (Supabase)" ok={env.supabase} />
                <StatusRow label="WhatsApp do dono" ok={env.owner_whatsapp} />
              </div>
            ) : (
              <p className="text-sm text-red-500">Não consegui ler o status do servidor.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ListOrdered className="h-5 w-5" /> Pedidos
            </CardTitle>
            <CardDescription>Veja os pedidos pagos e marque como produzidos.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (key) window.location.href = `/pedidos?key=${encodeURIComponent(key)}`;
              }}
            >
              <Input
                type="password"
                placeholder="Chave de acesso (CRON_SECRET)"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
              <Button type="submit" disabled={!key}>
                Abrir Pedidos
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
