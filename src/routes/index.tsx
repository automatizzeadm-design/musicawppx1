import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  ListOrdered,
  Loader2,
  Music,
  Power,
  RefreshCw,
  XCircle,
  MessageSquare,
} from "lucide-react";

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
  const [adminKey, setAdminKey] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["status"],
    queryFn: async () => (await fetch("/api/webhook/evolution")).json() as Promise<Diag>,
    refetchInterval: 30000,
  });

  const env = data?.env;

  async function setPause(paused: boolean) {
    if (!adminKey) {
      setResult({ ok: false, msg: "Informe a chave de acesso." });
      return;
    }
    if (!phone.replace(/\D/g, "")) {
      setResult({ ok: false, msg: "Informe o número." });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const resp = await fetch(`/api/agent/pause?key=${encodeURIComponent(adminKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, paused }),
      });
      const json = (await resp.json().catch(() => ({}))) as { ok?: boolean; affected?: number; error?: string };
      if (resp.ok && json.ok) {
        setResult({
          ok: true,
          msg: paused
            ? `Bot DESATIVADO para ${phone} (${json.affected} conversa[s]).`
            : `Bot REATIVADO para ${phone} (${json.affected} conversa[s]).`,
        });
        setPhone("");
      } else if (resp.status === 401) {
        setResult({ ok: false, msg: "Chave de acesso inválida." });
      } else {
        setResult({ ok: false, msg: `Erro: ${json.error ?? resp.status}` });
      }
    } catch {
      setResult({ ok: false, msg: "Falha de conexão. Tente de novo." });
    } finally {
      setBusy(false);
    }
  }

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
          <div className="flex gap-2">
            <Link to="/chat">
              <Button variant="outline" size="sm">
                <MessageSquare className="mr-2 h-4 w-4" /> Chats
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          </div>
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
              <Power className="h-5 w-5" /> Ativar / Desativar o bot por número
            </CardTitle>
            <CardDescription>
              Desative pra assumir uma conversa manualmente. Reative quando quiser que o bot volte.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="password"
              placeholder="Chave de acesso (CRON_SECRET)"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
            />
            <Input
              type="tel"
              placeholder="Número com DDD (ex: 86981058357)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1"
                disabled={busy}
                onClick={() => setPause(true)}
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Desativar bot
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={busy}
                onClick={() => setPause(false)}
              >
                Reativar bot
              </Button>
            </div>
            {result && (
              <p className={`text-sm ${result.ok ? "text-green-600" : "text-red-500"}`}>{result.msg}</p>
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
            <Button
              disabled={!adminKey}
              onClick={() => {
                if (adminKey) window.location.href = `/pedidos?key=${encodeURIComponent(adminKey)}`;
              }}
            >
              Abrir Pedidos
            </Button>
            {!adminKey && (
              <p className="text-xs text-muted-foreground mt-2">
                Preencha a chave de acesso acima pra abrir.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
