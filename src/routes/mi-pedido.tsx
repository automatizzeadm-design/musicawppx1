import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/mi-pedido")({
  component: MiPedido,
});

interface Order {
  nombre: string | null;
  estilo: string | null;
  opcion: string | null;
  letra: string | null;
  status: string;
  created_at: string | null;
}

const STEPS = ["Recibido", "En producción", "Lista", "Entregada"];

function stepIndex(status: string): number {
  const s = (status || "").toLowerCase();
  if (s.includes("entreg")) return 3;
  if (s.includes("list") || s.includes("pront")) return 2;
  if (s.includes("produc")) return 1;
  return 0;
}

const PINK = "#ec008c";
// Checkout de $5 da Hotmart (upsell 2ª canção) — com src pra rastrear na Hotmart
const OTRA_CANCION_URL = "https://pay.hotmart.com/T105298918P?off=rjmudj00&src=upsell-mipedido";

function Logo() {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <span className="text-2xl">🎶</span>
      <span className="text-2xl font-extrabold tracking-tight text-gray-900">
        CreaTu<span style={{ color: PINK }}>Canción</span>
      </span>
    </div>
  );
}

function Timeline({ status }: { status: string }) {
  const current = stepIndex(status);
  return (
    <div className="flex items-center">
      {STEPS.map((label, i) => {
        const done = i <= current;
        return (
          <div key={label} className="flex-1 flex flex-col items-center relative">
            {i > 0 && (
              <div
                className="absolute top-3 right-1/2 w-full h-0.5"
                style={{ background: i <= current ? PINK : "#e5e7eb" }}
              />
            )}
            <div
              className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: done ? PINK : "#e5e7eb", color: done ? "#fff" : "#9ca3af" }}
            >
              {done ? "✓" : i + 1}
            </div>
            <span className={`mt-1 text-[11px] text-center ${done ? "text-gray-800 font-medium" : "text-gray-400"}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MiPedido() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    const clean = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setError("Ingresa un correo válido.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const resp = await fetch(`/api/mi-pedido?email=${encodeURIComponent(clean)}`);
      const j = (await resp.json().catch(() => ({}))) as { ok?: boolean; orders?: Order[] };
      setOrders(j.orders ?? []);
    } catch {
      setError("No pudimos cargar tu pedido. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-pink-50 to-white">
      <div className="max-w-xl mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <Logo />
          <p className="text-gray-500 text-sm mt-1">Mi pedido</p>
        </header>

        {/* LOGIN */}
        {orders === null && (
          <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-6 max-w-md mx-auto">
            <h1 className="text-xl font-bold text-gray-900 text-center">Sigue tu canción 🎵</h1>
            <p className="text-sm text-gray-500 text-center mt-1 mb-5">
              Ingresa el correo que usaste en tu compra para seguir la producción de tu canción.
            </p>
            <form onSubmit={buscar} className="space-y-3">
              <input
                type="email"
                inputMode="email"
                placeholder="tucorreo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2"
                style={{ outlineColor: PINK }}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-3 font-semibold text-sm text-white transition-opacity disabled:opacity-50"
                style={{ background: PINK }}
              >
                {loading ? "Buscando…" : "Ver mi pedido"}
              </button>
              {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            </form>
          </div>
        )}

        {/* SIN PEDIDOS */}
        {orders !== null && orders.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-8 text-center max-w-md mx-auto">
            <p className="text-3xl mb-2">🔎</p>
            <h2 className="font-bold text-gray-900">No encontramos un pedido con ese correo</h2>
            <p className="text-sm text-gray-500 mt-1 mb-5">
              Revisa que sea el mismo correo de tu compra. ¿Aún no tienes tu canción?
            </p>
            <a
              href="/chat?src=mi-pedido"
              className="inline-block rounded-xl px-5 py-3 font-semibold text-sm text-white"
              style={{ background: PINK }}
            >
              Crear mi canción 🎵
            </a>
            <button onClick={() => setOrders(null)} className="block mx-auto mt-3 text-xs text-gray-400 underline">
              Probar con otro correo
            </button>
          </div>
        )}

        {/* PEDIDOS */}
        {orders !== null && orders.length > 0 && (
          <div className="space-y-5">
            {orders[0].nombre && (
              <h1 className="text-2xl font-bold text-gray-900 text-center">¡Hola, {orders[0].nombre}! 👋</h1>
            )}

            {orders.map((o, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-pink-100 p-6 space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">Estado de tu canción</p>
                  <Timeline status={o.status} />
                  {stepIndex(o.status) >= 3 ? (
                    <p className="text-center text-sm mt-3" style={{ color: PINK }}>
                      ¡Tu canción ya fue entregada! 🎉
                    </p>
                  ) : stepIndex(o.status) === 2 ? (
                    <p className="text-center text-sm mt-3" style={{ color: PINK }}>
                      ¡Tu canción está lista! En breve la recibirás 🎶
                    </p>
                  ) : (
                    <p className="flex items-center justify-center gap-2 text-sm mt-3" style={{ color: PINK }}>
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                      </span>
                      Nuestros artistas están grabando tu canción 🎙️
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {o.estilo && (
                    <div className="bg-pink-50 rounded-xl p-3">
                      <p className="text-[11px] text-gray-400 uppercase">Estilo</p>
                      <p className="font-medium text-gray-800">{o.estilo}</p>
                    </div>
                  )}
                  {o.opcion && (
                    <div className="bg-pink-50 rounded-xl p-3">
                      <p className="text-[11px] text-gray-400 uppercase">Plan</p>
                      <p className="font-medium text-gray-800">{o.opcion}</p>
                    </div>
                  )}
                </div>

                {o.letra && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">La letra de tu canción</p>
                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 bg-gray-50 rounded-xl p-4 max-h-72 overflow-auto">
                      {o.letra}
                    </pre>
                  </div>
                )}
              </div>
            ))}

            {/* UPSELL */}
            <div
              className="relative rounded-3xl p-7 text-white text-center shadow-lg overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${PINK}, #ff5fb0)` }}
            >
              <span className="absolute top-3 right-3 bg-white/20 backdrop-blur text-[10px] font-extrabold tracking-wide px-2.5 py-1 rounded-full">
                OFERTA EXCLUSIVA
              </span>
              <p className="text-3xl mb-1">🎁</p>
              <h3 className="font-extrabold text-xl">Sorpréndelos otra vez</h3>
              <p className="text-sm text-white/90 mt-1">¿Conoces a alguien más que merece su propia canción?</p>
              <div className="mt-4 mb-1 flex items-end justify-center gap-2">
                <span className="text-base line-through text-white/60">$9</span>
                <span className="text-5xl font-extrabold leading-none">$5</span>
              </div>
              <p className="text-xs text-white/80 mb-5">precio exclusivo solo para ti 💜</p>
              <a
                href={OTRA_CANCION_URL}
                className="cta-pulse inline-block bg-white rounded-2xl px-7 py-3.5 font-extrabold text-base shadow"
                style={{ color: PINK }}
              >
                Crear otra canción por $5 🎵
              </a>
            </div>

            <button onClick={() => setOrders(null)} className="block mx-auto text-xs text-gray-400 underline">
              Salir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
