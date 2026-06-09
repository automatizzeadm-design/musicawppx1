import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/chat")({
  component: ChatFunnel,
});

// ── Configuração (ajuste preços/áudios aqui) ────────────────────────────
const PRECIO_1 = "$9 USD"; // Opción 1 — hoy
const PRECIO_2 = "$7 USD"; // Opción 2 — en hasta 3 días
const AUDIO_EJEMPLOS = ["/exemplos/exemplo1.mp3", "/exemplos/exemplo2.mp3"];

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

interface Msg {
  id: number;
  from: "bot" | "user";
  text: string;
  kind?: "text" | "letra" | "audios";
}

type Control =
  | { type: "buttons"; buttons: { label: string; onClick: () => void }[] }
  | { type: "text"; placeholder: string; onSubmit: (v: string) => void }
  | { type: "select"; onSubmit: (v: string) => void }
  | { type: "email"; onSubmit: (v: string) => void }
  | null;

function ChatFunnel() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [control, setControl] = useState<Control>(null);
  const [draft, setDraft] = useState("");

  const idRef = useRef(0);
  const started = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // dados coletados
  const data = useRef<{ nombre: string; historia: string; estilo: string; letra: string; opcion: string }>({
    nombre: "",
    historia: "",
    estilo: "",
    letra: "",
    opcion: "",
  });

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

  // ── Fluxo ──────────────────────────────────────────────────────────────
  async function apertura() {
    await botSay([
      "🎧 ¿Ya imaginaste emocionar a alguien con una canción hecha exclusivamente para esa persona?",
      "Una canción creada desde cero, contando la historia de ustedes.",
      "Aquí en Tu Música Personalizada transformamos sentimientos en música.",
      "¿Cómo te llamas?",
    ]);
    setControl({ type: "text", placeholder: "Tu nombre", onSubmit: onNombre });
  }

  async function onNombre(v: string) {
    data.current.nombre = v;
    pushUser(v);
    setControl(null);
    await botSay([`${v}, ¿te explico rapidito cómo funciona?`]);
    setControl({ type: "buttons", buttons: [{ label: "Quiero saber cómo funciona", onClick: comoFunciona }] });
  }

  async function comoFunciona() {
    pushUser("Quiero saber cómo funciona");
    setControl(null);
    await botSay([
      "Funciona así:",
      "Cada canción es única y exclusiva — no reutilizamos melodías ni letras.",
      "Tú nos pasas lo que quieres en la letra, eliges el estilo musical y nosotros creamos el resto.",
      "👉 Y además eliges si quieres solo la canción o canción + video.",
    ]);
    setControl({ type: "buttons", buttons: [{ label: "Continuar", onClick: pruebaSocial }] });
  }

  async function pruebaSocial() {
    pushUser("Continuar");
    setControl(null);
    await botSay([
      "💬 Mira lo que dicen quienes ya regalaron con el Club de la Música:",
      "Ya son cientos de canciones entregadas: cumpleaños, bodas, pedidos de perdón, declaraciones y reconciliaciones.",
      "👉 ¿Quieres escuchar algunos ejemplos reales?",
    ]);
    setControl({ type: "buttons", buttons: [{ label: "Escuchar ejemplos 🎧", onClick: ejemplos }] });
  }

  async function ejemplos() {
    pushUser("Escuchar ejemplos 🎧");
    setControl(null);
    await botSay(["🎧 Aquí tienes algunos fragmentos de canciones ya entregadas:"]);
    setMessages((m) => [...m, { id: nextId(), from: "bot", text: "", kind: "audios" }]);
    await sleep(300);
    await botSay(["Cada una nació de una historia diferente. La tuya será 100% exclusiva."]);
    setControl({ type: "buttons", buttons: [{ label: "Personalizar mi canción 🎵", onClick: pedirHistoria }] });
  }

  async function pedirHistoria() {
    pushUser("Personalizar mi canción 🎵");
    setControl(null);
    await botSay([
      "Escribe lo que quieres incluir en la letra, por ejemplo:",
      "Nombre de la persona, cuánto tiempo llevan juntos, una historia que marcó su vida… 👇",
    ]);
    setControl({ type: "text", placeholder: "Cuéntame la historia…", onSubmit: onHistoria });
  }

  async function onHistoria(v: string) {
    data.current.historia = v;
    pushUser(v);
    setControl(null);
    await botSay(["¿Qué estilo musical prefieres? 👇"]);
    setControl({ type: "select", onSubmit: onEstilo });
  }

  async function onEstilo(v: string) {
    data.current.estilo = v;
    pushUser(v);
    setControl(null);
    await generarLetra();
  }

  async function generarLetra() {
    await botSay(["🎵 ¡Perfecto! Ahora voy a crear la letra de tu canción… puede tardar unos segundos ✨"]);
    setTyping(true);
    try {
      const resp = await fetch("/api/letra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: data.current.nombre,
          historia: data.current.historia,
          estilo: data.current.estilo,
        }),
      });
      const j = (await resp.json().catch(() => ({}))) as { ok?: boolean; letra?: string };
      setTyping(false);
      if (j.ok && j.letra) {
        data.current.letra = j.letra;
        setMessages((m) => [...m, { id: nextId(), from: "bot", text: j.letra!, kind: "letra" }]);
        await botSay(["Aquí está la letra de tu canción. ¿Qué te pareció? 😊"]);
        setControl({ type: "buttons", buttons: [{ label: "¡Me encantó! ✅", onClick: oferta }] });
      } else {
        await botSay(["Ups, tuve un problemita al crear la letra. ¿Probamos de nuevo?"]);
        setControl({ type: "buttons", buttons: [{ label: "Intentar de nuevo", onClick: generarLetra }] });
      }
    } catch {
      setTyping(false);
      await botSay(["Ups, tuve un problemita de conexión. ¿Probamos de nuevo?"]);
      setControl({ type: "buttons", buttons: [{ label: "Intentar de nuevo", onClick: generarLetra }] });
    }
  }

  async function oferta() {
    pushUser("¡Me encantó! ✅");
    setControl(null);
    await botSay([
      "Puedes elegir entre 2 opciones:",
      `🎵 Opción 1 – Recibe tu canción hoy · ${PRECIO_1} (pago único)`,
      `🎵 Opción 2 – Recibe tu canción en hasta 3 días · ${PRECIO_2} (pago único)`,
      "🔒 Compra 100% segura | Satisfacción garantizada o te devolvemos tu dinero",
      "👉 ¿Cuál opción tiene más sentido para ti?",
    ]);
    setControl({
      type: "buttons",
      buttons: [
        { label: `Opción 1 – ${PRECIO_1}`, onClick: () => pedirEmail("Opción 1 (hoy)") },
        { label: `Opción 2 – ${PRECIO_2}`, onClick: () => pedirEmail("Opción 2 (3 días)") },
      ],
    });
  }

  async function pedirEmail(opcion: string) {
    data.current.opcion = opcion;
    pushUser(opcion);
    setControl(null);
    await botSay(["¿Cuál es tu correo electrónico? Ahí te enviaremos tu canción y los siguientes pasos 💌"]);
    setControl({ type: "email", onSubmit: onEmail });
  }

  async function onEmail(v: string) {
    pushUser(v);
    setControl(null);
    fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data.current, email: v }),
    }).catch(() => {});
    await botSay([
      "¡Listo! 🎉 Revisa tu correo en los próximos minutos.",
      "En breve recibirás tu canción y el enlace para completar tu pedido. ¡Gracias por confiar en nosotros! 💜",
    ]);
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void apertura();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[100dvh] bg-[#f3efe6]">
      <header className="text-center py-3 border-b border-black/5 bg-[#f3efe6]">
        <h1 className="text-lg font-bold text-[#3a2e22]">🎶 Tu Música Personalizada</h1>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-md mx-auto space-y-2">
          {messages.map((m) =>
            m.from === "user" ? (
              <div key={m.id} className="flex justify-end">
                <div className="bg-emerald-700 text-white rounded-2xl rounded-tr-sm px-4 py-2 max-w-[85%] text-sm shadow">
                  {m.text}
                </div>
              </div>
            ) : m.kind === "audios" ? (
              <div key={m.id} className="space-y-2">
                {AUDIO_EJEMPLOS.map((src, i) => (
                  <div key={i} className="bg-white rounded-xl px-3 py-2 shadow-sm">
                    <p className="text-xs text-[#7a6a55] mb-1">Ejemplo {i + 1}</p>
                    <audio controls preload="none" className="w-full h-9">
                      <source src={src} type="audio/mpeg" />
                    </audio>
                  </div>
                ))}
              </div>
            ) : (
              <div key={m.id} className="flex justify-start">
                <div
                  className={`bg-white/80 text-[#3a2e22] rounded-2xl rounded-tl-sm px-4 py-2 max-w-[88%] text-sm shadow-sm ${
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
              <div className="bg-white/80 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <span className="flex gap-1">
                  <span className="w-2 h-2 bg-[#b9a98f] rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-[#b9a98f] rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-[#b9a98f] rounded-full animate-bounce" />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-black/5 bg-[#f3efe6] p-3">
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
    return <div className="text-center text-xs text-[#a89a82] py-2">…</div>;
  }

  if (control.type === "buttons") {
    return (
      <div className="space-y-2">
        {control.buttons.map((b, i) => (
          <button
            key={i}
            onClick={b.onClick}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl py-3 font-semibold text-sm transition-colors"
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
        className="w-full rounded-xl border border-emerald-700/40 bg-white px-4 py-3 text-sm text-[#3a2e22] focus:outline-none focus:ring-2 focus:ring-emerald-600"
      >
        <option value="" disabled>
          Selecciona…
        </option>
        {ESTILOS.map((e) => (
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
        className="flex-1 rounded-xl border border-emerald-700/30 bg-white px-4 py-3 text-sm text-[#3a2e22] focus:outline-none focus:ring-2 focus:ring-emerald-600"
      />
      <button
        type="submit"
        disabled={isEmailField ? !isEmail(draft) : !draft.trim()}
        className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white rounded-xl px-5 font-semibold text-sm transition-colors"
      >
        Enviar
      </button>
    </form>
  );
}
