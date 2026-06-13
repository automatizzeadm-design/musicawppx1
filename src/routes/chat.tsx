import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/chat")({
  component: ChatFunnel,
});

// ── Configuração ────────────────────────────────────────────────────────
const PRECIO_SOLO = "$9 USD"; // solo la canción
const PRECIO_VIDEO = "$12 USD"; // canción + video
const PRECIO_SOLO_ANTES = "$19"; // âncora (preço "de")
const PRECIO_VIDEO_ANTES = "$24"; // âncora (preço "de")
const HOTMART_SOLO = "https://pay.hotmart.com/T105298918P?off=9b8zozb1&checkoutMode=10";
const HOTMART_VIDEO = "https://pay.hotmart.com/T105298918P?off=llc1ujvk&checkoutMode=10";
const AUDIO_EJEMPLOS = ["/exemplos/es1.mp3", "/exemplos/es2.mp3", "/exemplos/es3.mp3"];
const VIDEO_EMBED = "https://player.vimeo.com/video/1199934346?badge=0&autopause=0&player_id=0&app_id=58479";
// Mini-VSL no topo (autoplay mudo — navegador exige mudo p/ autoplay).
const VSL_EMBED =
  "https://player.vimeo.com/video/1200302338?badge=0&autopause=0&autoplay=1&muted=1&dnt=1&player_id=0&app_id=58479";

// Preços locais por país (valores reais do checkout da Hotmart: $9 / $12).
const PRICES: Record<string, { solo: string; video: string }> = {
  MX: { solo: "MX$ 167,00", video: "MX$ 257,52" },
  CO: { solo: "COP $34.134", video: "COP $45.510" },
  AR: { solo: "ARS $14.974,00", video: "ARS $19.967,00" },
  PE: { solo: "S/ 34,00", video: "S/ 44,00" },
  CL: { solo: "CLP $10.403", video: "CLP $13.872" },
  ES: { solo: "€ 9,36", video: "€ 12,48" },
};

const ACENTOS = ["Neutro latinoamericano", "México", "Colombia", "Argentina", "Perú", "Chile", "España"];

const ESTILOS = [
  "Balada romántica",
  "Romántico",
  "Pop Latino",
  "Bachata",
  "Regional Mexicano / Corridos / Ranchera",
  "Vallenato",
  "Salsa",
  "Bolero",
  "Cumbia",
  "Gospel / Música cristiana",
  "Acústico",
  "Rock",
  "Reggaetón",
  "Merengue",
  "Reggae",
  "K-pop",
  "R&B / Soul",
  "Latin Trap",
  "Electrónica / EDM",
];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

interface OfferItem {
  titulo: string;
  antes: string;
  ahora: string;
  local?: string;
}

interface Msg {
  id: number;
  from: "bot" | "user";
  text: string;
  kind?: "text" | "letra" | "audios" | "videos" | "oferta" | "vsl" | "images";
  images?: string[];
  offer?: OfferItem[];
}

type Control =
  | { type: "buttons"; buttons: { label: string; onClick: () => void }[] }
  | { type: "text"; placeholder: string; onSubmit: (v: string) => void }
  | { type: "select"; options: string[]; onSubmit: (v: string) => void }
  | { type: "email"; onSubmit: (v: string) => void }
  | { type: "link"; label: string; href: string }
  | null;

function ChatFunnel() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [control, setControl] = useState<Control>(null);
  const [draft, setDraft] = useState("");
  const [progress, setProgress] = useState(6);
  const [pais, setPais] = useState("");

  const idRef = useRef(0);
  const started = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const data = useRef<{
    nombre: string;
    historia: string;
    estilo: string;
    acento: string;
    letra: string;
    opcion: string;
    checkout: string;
    src: string;
    sck: string;
    email: string;
  }>({ nombre: "", historia: "", estilo: "", acento: "", letra: "", opcion: "", checkout: "", src: "", sck: "", email: "" });

  const nextId = () => ++idRef.current;
  const pushUser = (text: string) => setMessages((m) => [...m, { id: nextId(), from: "user", text }]);

  async function botSay(lines: string[], kind: Msg["kind"] = "text") {
    for (const line of lines) {
      setTyping(true);
      await sleep(650 + Math.min(1400, line.length * 14));
      setTyping(false);
      setMessages((m) => [...m, { id: nextId(), from: "bot", text: line, kind }]);
      await sleep(220);
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing, control]);

  // ── Flujo ────────────────────────────────────────────────────────────────
  async function apertura() {
    await botSay([
      "🎧 ¿Ya te imaginaste emocionar a esa persona especial con una canción hecha solo para ella?",
      "Una canción creada desde cero, que cuenta la historia de ustedes dos.",
      "Aquí en CreaTuCanción convertimos sentimientos en música.",
      "Pero antes de empezar… ¿cómo te llamas?",
    ]);
    setControl({ type: "text", placeholder: "Tu nombre", onSubmit: onNombre });
  }

  async function onNombre(v: string) {
    data.current.nombre = v;
    pushUser(v);
    setProgress(16);
    setControl(null);
    await botSay([`¡Mucho gusto, ${v}! 😊 ¿Te explico rapidito cómo funciona?`]);
    setControl({ type: "buttons", buttons: [{ label: "Quiero saber cómo funciona", onClick: comoFunciona }] });
  }

  async function comoFunciona() {
    pushUser("Quiero saber cómo funciona");
    setProgress(28);
    setControl(null);
    await botSay([
      "Funciona así de fácil:",
      "1️⃣ Nos cuentas la historia que tú quieras: lo que sientes, los momentos especiales y los detalles que hacen única a esa persona.",
      "2️⃣ Con eso creamos la letra de tu canción, escrita 100% a partir de lo que nos contaste.",
      "3️⃣ Si te encanta la letra, nuestros artistas graban la canción en tan solo unos minutos 🎙️",
      "4️⃣ Y te la enviamos directo a tu correo electrónico, lista para emocionar 🎶",
      "Cada canción es única y exclusiva — nunca repetimos melodías ni letras.",
      "👉 Y además, tú eliges si quieres solo la canción o la canción + video.",
    ]);
    setControl({ type: "buttons", buttons: [{ label: "Continuar", onClick: pruebaSocial }] });
  }

  async function pruebaSocial() {
    pushUser("Continuar");
    setProgress(40);
    setControl(null);
    await botSay([
      "💬 Mira lo que dicen quienes ya regalaron con CreaTuCanción:",
      "Ya son cientos de canciones entregadas: cumpleaños, bodas, pedidos de perdón, declaraciones de amor y reconciliaciones.",
      "👉 ¿Quieres escuchar algunos ejemplos reales?",
    ]);
    setMessages((m) => [
      ...m,
      {
        id: nextId(),
        from: "bot",
        text: "",
        kind: "images",
        images: [
          "https://qtbkvshbmqlszncxlcuc.supabase.co/storage/v1/object/public/dsl-uploads/8me9PSiCKhZNUU9UOUbbZc7vOSa2/917a6a99-f0fd-447d-9b6b-427106986c5a.png",
          "https://qtbkvshbmqlszncxlcuc.supabase.co/storage/v1/object/public/dsl-uploads/8me9PSiCKhZNUU9UOUbbZc7vOSa2/8d0c4b82-4b9c-4049-abc9-bdef7edb63a5.png",
        ],
      },
    ]);
    setControl({ type: "buttons", buttons: [{ label: "Escuchar ejemplos 🎧", onClick: ejemplos }] });
  }

  async function ejemplos() {
    pushUser("Escuchar ejemplos 🎧");
    setProgress(52);
    setControl(null);
    await botSay(["🎧 Aquí tienes algunos fragmentos de canciones que ya entregamos:"]);
    setMessages((m) => [...m, { id: nextId(), from: "bot", text: "", kind: "audios" }]);
    await sleep(300);
    await botSay(["🎬 Y mira un ejemplo en video (canción + fotos):"]);
    setMessages((m) => [...m, { id: nextId(), from: "bot", text: "", kind: "videos" }]);
    await sleep(300);
    await botSay(["Cada una nació de una historia distinta. La tuya va a ser 100% exclusiva."]);
    setControl({ type: "buttons", buttons: [{ label: "Personalizar mi canción 🎵", onClick: pedirHistoria }] });
  }

  async function pedirHistoria() {
    pushUser("Personalizar mi canción 🎵");
    setProgress(60);
    setControl(null);
    await botSay([
      "¡Vamos a crear la tuya! Escríbeme lo que quieres que vaya en la letra, por ejemplo:",
      "El nombre de la persona, cuánto tiempo llevan juntos, una historia que marcó sus vidas… 👇",
    ]);
    setControl({ type: "text", placeholder: "Cuéntame su historia…", onSubmit: onHistoria });
  }

  async function onHistoria(v: string) {
    data.current.historia = v;
    pushUser(v);
    setProgress(72);
    setControl(null);
    await botSay(["¡Qué linda historia! 😍 ¿Y qué estilo musical prefieres? 👇"]);
    setControl({ type: "select", options: ESTILOS, onSubmit: onEstilo });
  }

  async function onEstilo(v: string) {
    data.current.estilo = v;
    pushUser(v);
    setProgress(78);
    setControl(null);
    await botSay(["¡Buenísimo! ¿Y con qué acento quieres tu canción? 🌎 👇"]);
    setControl({ type: "select", options: ACENTOS, onSubmit: onAcento });
  }

  async function onAcento(v: string) {
    data.current.acento = v;
    pushUser(v);
    setProgress(84);
    setControl(null);
    await generarLetra();
  }

  async function generarLetra(instruccion?: string) {
    setControl(null);
    await botSay([
      instruccion
        ? "✨ ¡Perfecto! Estoy ajustando tu canción… dame unos segundos"
        : "🎵 ¡Perfecto! Ahora voy a crear la letra de tu canción… dame unos segundos ✨",
    ]);
    setTyping(true);
    try {
      const resp = await fetch("/api/letra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: data.current.nombre,
          historia: data.current.historia,
          estilo: data.current.estilo,
          acento: data.current.acento,
          ajuste: instruccion ?? "",
          anterior: data.current.letra ?? "",
        }),
      });
      const j = (await resp.json().catch(() => ({}))) as { ok?: boolean; letra?: string };
      setTyping(false);
      if (j.ok && j.letra) {
        data.current.letra = j.letra;
        setMessages((m) => [...m, { id: nextId(), from: "bot", text: j.letra!, kind: "letra" }]);
        await botSay(["¡Aquí está la letra de tu canción! ¿Qué te pareció? 😊"]);
        setControl({
          type: "buttons",
          buttons: [
            { label: "¡Me encantó! ✅", onClick: aprobar },
            { label: "Editar la letra ✏️", onClick: pedirAjuste },
            { label: "Crear otra versión 🔄", onClick: otraVersion },
          ],
        });
      } else {
        await botSay(["Uy, tuve un problemita al crear la letra. ¿Lo intentamos de nuevo?"]);
        setControl({ type: "buttons", buttons: [{ label: "Intentar de nuevo", onClick: () => void generarLetra() }] });
      }
    } catch {
      setTyping(false);
      await botSay(["Uy, tuve un problemita de conexión. ¿Lo intentamos de nuevo?"]);
      setControl({ type: "buttons", buttons: [{ label: "Intentar de nuevo", onClick: () => void generarLetra() }] });
    }
  }

  async function pedirAjuste() {
    pushUser("Editar la letra ✏️");
    setControl(null);
    await botSay(["¡Claro! Cuéntame qué te gustaría cambiar (un nombre, una frase, el tono…) y la ajusto 👇"]);
    setControl({
      type: "text",
      placeholder: "¿Qué cambiamos?",
      onSubmit: (v) => {
        pushUser(v);
        void generarLetra(`Aplica estos cambios pedidos por el cliente: ${v}`);
      },
    });
  }

  async function otraVersion() {
    pushUser("Crear otra versión 🔄");
    await generarLetra(
      "Crea una versión COMPLETAMENTE diferente a la anterior, con otro enfoque, otras imágenes y otra estructura, manteniendo la misma historia y el mismo estilo.",
    );
  }

  async function aprobar() {
    pushUser("¡Me encantó! ✅");
    setProgress(88);
    setControl(null);
    await botSay([
      "¡Me alegra muchísimo que te haya encantado! 🥹",
      "Déjame tu correo electrónico — es ahí donde recibirás tu canción y todos los detalles de tu pedido 💌",
    ]);
    setControl({ type: "email", onSubmit: onEmail });
  }

  async function onEmail(v: string) {
    data.current.email = v.trim();
    pushUser(v);
    setProgress(94);
    setControl(null);
    fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: data.current.nombre,
        historia: data.current.historia,
        estilo: data.current.estilo,
        letra: data.current.letra,
        opcion: data.current.opcion,
        email: v,
      }),
    }).catch(() => {});
    await botSay([`¡Perfecto, ${data.current.nombre}! Te enviaremos todo a ${v} 📩`]);
    await mostrarOferta();
  }

  async function mostrarOferta() {
    setProgress(97);
    const loc = PRICES[pais];
    await botSay(["¡Qué bueno que te gustó! 🎉 Ahora elige cómo quieres recibir tu canción 👇"]);
    setMessages((m) => [
      ...m,
      {
        id: nextId(),
        from: "bot",
        text: "",
        kind: "oferta",
        offer: [
          { titulo: "🎵 Solo la canción", antes: PRECIO_SOLO_ANTES, ahora: PRECIO_SOLO, local: loc?.solo },
          {
            titulo: "🎬 Canción + video con fotos ⭐ (la más elegida)",
            antes: PRECIO_VIDEO_ANTES,
            ahora: PRECIO_VIDEO,
            local: loc?.video,
          },
        ],
      },
    ]);
    await sleep(400);
    await botSay([
      "⏳ Precio de lanzamiento por tiempo limitado — luego sube.",
      "🔒 Compra 100% segura · Satisfacción garantizada o te devolvemos tu dinero.",
    ]);
    setControl({
      type: "buttons",
      buttons: [
        {
          label: "Quiero solo la canción 🎵",
          onClick: () => irCheckout("Solo la canción", PRECIO_SOLO, HOTMART_SOLO),
        },
        {
          label: "Quiero canción + video ⭐",
          onClick: () => irCheckout("Canción + video", PRECIO_VIDEO, HOTMART_VIDEO),
        },
      ],
    });
  }

  async function irCheckout(opcion: string, precio: string, checkout: string) {
    // Repassa o criativo/campanha pro checkout da Hotmart (src/sck → relatório)
    const params: string[] = [];
    if (data.current.src) params.push(`src=${encodeURIComponent(data.current.src)}`);
    if (data.current.sck) params.push(`sck=${encodeURIComponent(data.current.sck)}`);
    if (data.current.email) params.push(`email=${encodeURIComponent(data.current.email)}`);
    const href = params.length ? `${checkout}&${params.join("&")}` : checkout;

    data.current.opcion = `${opcion} (${precio})`;
    data.current.checkout = href;
    pushUser(opcion);
    setProgress(100);
    setControl(null);
    await botSay([
      "¡Excelente elección! 🎉",
      "Toca el botón de abajo para completar tu pago de forma 100% segura y empezamos a producir tu canción de inmediato 🎶",
    ]);
    setControl({ type: "link", label: "Completar mi pago ✅", href });
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const sp = new URLSearchParams(window.location.search);
    // Rastreamento de criativo/campanha (repassado pro checkout da Hotmart)
    data.current.src = sp.get("src") || sp.get("utm_content") || sp.get("creativo") || "";
    data.current.sck = sp.get("sck") || sp.get("utm_campaign") || sp.get("utm_source") || "";
    const override = sp.get("pais");
    if (override) {
      setPais(override.toUpperCase());
    } else {
      fetch("/api/geo")
        .then((r) => r.json())
        .then((j: { country?: string }) => setPais((j.country || "").toUpperCase()))
        .catch(() => {});
    }
    // Mini-VSL no topo, antes do fluxo começar
    setMessages([{ id: nextId(), from: "bot", text: "", kind: "vsl" }]);
    void apertura();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[100dvh] bg-white">
      <div className="h-1.5 w-full bg-black/10">
        <div
          className="h-full bg-gradient-to-r from-[#ff7ac6] to-[#ec008c] transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <header className="flex items-center justify-center gap-1.5 py-3 border-b border-pink-100 bg-white">
        <span className="text-2xl">🎶</span>
        <span className="text-2xl font-extrabold tracking-tight text-gray-900">
          CreaTu<span className="text-[#ec008c]">Canción</span>
        </span>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-md mx-auto space-y-2">
          {messages.map((m) =>
            m.from === "user" ? (
              <div key={m.id} className="flex justify-end">
                <div className="bg-[#ec008c] text-white rounded-2xl rounded-tr-sm px-4 py-2 max-w-[85%] text-sm shadow">
                  {m.text}
                </div>
              </div>
            ) : m.kind === "vsl" ? (
              <div key={m.id} className="flex flex-col items-start gap-1">
                <div className="w-[78%] max-w-[300px] rounded-2xl rounded-tl-sm overflow-hidden shadow-sm bg-black">
                  <div style={{ padding: "177.78% 0 0 0", position: "relative" }}>
                    <iframe
                      src={VSL_EMBED}
                      allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                      title="CreaTuCanción"
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 pl-1">🔊 Toca el video para activar el sonido</p>
              </div>
            ) : m.kind === "audios" ? (
              <div key={m.id} className="space-y-2">
                {AUDIO_EJEMPLOS.map((src, i) => (
                  <div key={i} className="bg-white rounded-xl px-3 py-2 shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">Ejemplo {i + 1}</p>
                    <audio controls preload="none" className="w-full h-9">
                      <source src={src} type="audio/mpeg" />
                    </audio>
                  </div>
                ))}
              </div>
            ) : m.kind === "videos" ? (
              <div key={m.id} className="bg-white rounded-xl p-1 shadow-sm overflow-hidden">
                <div style={{ padding: "177.5% 0 0 0", position: "relative" }}>
                  <iframe
                    src={VIDEO_EMBED}
                    loading="lazy"
                    allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                    title="Ejemplo CreaTuCanción"
                    className="rounded-lg"
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
                  />
                </div>
              </div>
            ) : m.kind === "images" ? (
              <div key={m.id} className="grid grid-cols-2 gap-2">
                {m.images?.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt="Exemplo"
                    className="w-full rounded-lg border border-black shadow-sm"
                  />
                ))}
              </div>
            ) : m.kind === "oferta" ? (
              <div key={m.id} className="space-y-2">
                {m.offer?.map((o, i) => (
                  <div key={i} className="bg-white border border-pink-100 rounded-xl px-4 py-3 shadow-sm">
                    <p className="text-sm font-semibold text-gray-800 mb-1">{o.titulo}</p>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-red-500 line-through text-base font-semibold">{o.antes}</span>
                      <span className="text-green-600 font-extrabold text-2xl">{o.ahora}</span>
                      {o.local && <span className="text-gray-500 text-sm">({o.local})</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div key={m.id} className="flex justify-start">
                <div
                  className={`bg-pink-50 text-gray-800 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[88%] text-sm shadow-sm ${
                    m.kind === "letra" ? "whitespace-pre-wrap font-medium" : ""
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ),
          )}
          {typing && (
            <div className="flex justify-start">
              <div className="bg-pink-50 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <span className="flex gap-1">
                  <span className="w-2 h-2 bg-pink-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-pink-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-pink-300 rounded-full animate-bounce" />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-black/5 bg-white p-3">
        <div className="max-w-md mx-auto">
          <ControlArea control={control} draft={draft} setDraft={setDraft} />
        </div>
      </div>
    </div>
  );
}

function ControlArea({
  control,
  draft,
  setDraft,
}: {
  control: Control;
  draft: string;
  setDraft: (v: string) => void;
}) {
  if (!control) {
    return <div className="text-center text-xs text-gray-400 py-2">…</div>;
  }

  if (control.type === "link") {
    return (
      <a
        href={control.href}
        className="cta-pulse block w-full text-center bg-[#ec008c] hover:bg-[#d1007d] text-white rounded-xl py-3 font-semibold text-sm transition-colors"
      >
        {control.label}
      </a>
    );
  }

  if (control.type === "buttons") {
    return (
      <div className="space-y-2">
        {control.buttons.map((b, i) => (
          <button
            key={i}
            onClick={b.onClick}
            className="cta-pulse w-full bg-[#ec008c] hover:bg-[#d1007d] text-white rounded-xl py-3 font-semibold text-sm transition-colors"
          >
            {b.label}
          </button>
        ))}
      </div>
    );
  }

  if (control.type === "select") {
    return (
      <select
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) control.onSubmit(e.target.value);
        }}
        className="w-full rounded-xl border border-[#ec008c]/40 bg-white px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#ec008c]"
      >
        <option value="" disabled>
          Selecciona…
        </option>
        {control.options.map((e) => (
          <option key={e} value={e}>
            {e}
          </option>
        ))}
      </select>
    );
  }

  const isEmailField = control.type === "email";
  const submit = () => {
    const v = draft.trim();
    if (!v) return;
    if (isEmailField && !isEmail(v)) return;
    setDraft("");
    control.onSubmit(v);
  };

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        type={isEmailField ? "email" : "text"}
        inputMode={isEmailField ? "email" : "text"}
        placeholder={isEmailField ? "tucorreo@ejemplo.com" : control.type === "text" ? control.placeholder : ""}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoFocus
        className="flex-1 rounded-xl border border-[#ec008c]/30 bg-white px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#ec008c]"
      />
      <button
        type="submit"
        disabled={isEmailField ? !isEmail(draft) : !draft.trim()}
        className="bg-[#ec008c] hover:bg-[#d1007d] disabled:opacity-40 text-white rounded-xl px-5 font-semibold text-sm transition-colors"
      >
        Enviar
      </button>
    </form>
  );
}
