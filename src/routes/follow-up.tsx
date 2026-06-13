import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export const Route = createFileRoute("/follow-up")({
  validateSearch: (s: Record<string, unknown>) => ({ key: typeof s.key === "string" ? s.key : "" }),
  component: FollowUpPage,
});

interface Lead {
  nombre: string | null;
  email: string | null;
  estilo: string | null;
  opcion: string | null;
  paid: boolean | null;
  email_followup_sent: boolean | null;
  created_at: string | null;
}

function fmt(d: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return d;
  }
}

function FollowUpPage() {
  const { key } = Route.useSearch();
  const [onlyPending, setOnlyPending] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["leads", key],
    queryFn: async () => {
      const r = await fetch(`/api/leads?key=${encodeURIComponent(key)}`);
      return r.json() as Promise<{ ok: boolean; error?: string; leads?: Lead[] }>;
    },
    enabled: Boolean(key),
  });

  if (!key) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-2">
        <h1 className="text-2xl font-bold">Follow-up</h1>
        <p className="text-muted-foreground">
          Acesso protegido. Abra com <code>?key=SUA_CHAVE</code> (o valor de CRON_SECRET).
        </p>
      </div>
    );
  }

  if (data && !data.ok && data.error === "unauthorized") {
    return <div className="p-8 text-center text-red-500">Chave inválida.</div>;
  }

  const all = data?.leads ?? [];
  const naoCompraram = all.filter((l) => !l.paid);
  const compraram = all.filter((l) => l.paid);
  const followupEnviado = naoCompraram.filter((l) => l.email_followup_sent).length;
  const list = onlyPending ? naoCompraram : all;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <header className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📋 Follow-up — Leads</h1>
            <p className="text-sm text-gray-500">
              {all.length} leads · {compraram.length} compraram · {naoCompraram.length} não compraram ·{" "}
              {followupEnviado} follow-ups enviados
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setOnlyPending((v) => !v)}
              className="text-sm border rounded-lg px-3 py-1.5 bg-white hover:bg-gray-100"
            >
              {onlyPending ? "Ver todos" : "Só não-compradores"}
            </button>
            <button
              onClick={() => refetch()}
              className="text-sm border rounded-lg px-3 py-1.5 bg-white hover:bg-gray-100"
            >
              {isFetching ? "Atualizando…" : "Atualizar"}
            </button>
          </div>
        </header>

        {data && !data.ok && data.error === "sin_base" && (
          <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            Supabase não configurado (AGENT_DB_URL/AGENT_DB_KEY).
          </p>
        )}

        {isLoading ? (
          <p className="text-center text-gray-400 py-10">Carregando…</p>
        ) : list.length === 0 ? (
          <p className="text-center text-gray-400 py-10 border border-dashed rounded-xl">Nenhum lead por aqui.</p>
        ) : (
          <div className="overflow-x-auto bg-white rounded-xl border shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Nome</th>
                  <th className="px-3 py-2 font-medium">E-mail</th>
                  <th className="px-3 py-2 font-medium">Estilo</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Follow-up</th>
                  <th className="px-3 py-2 font-medium">Quando</th>
                </tr>
              </thead>
              <tbody>
                {list.map((l, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{l.nombre || "—"}</td>
                    <td className="px-3 py-2 text-gray-600">{l.email || "—"}</td>
                    <td className="px-3 py-2 text-gray-600">{l.estilo || "—"}</td>
                    <td className="px-3 py-2">
                      {l.paid ? (
                        <span className="text-green-700 bg-green-100 rounded-full px-2 py-0.5 text-xs">Comprou</span>
                      ) : (
                        <span className="text-gray-600 bg-gray-100 rounded-full px-2 py-0.5 text-xs">Não comprou</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {l.email_followup_sent ? (
                        <span className="text-pink-700 text-xs">✓ enviado</span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmt(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}