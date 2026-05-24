import { createRoot } from 'react-dom/client'
import './index.css'

const requiredFirebaseEnv = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

function MissingConfigScreen({ missing }: { missing: string[] }) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <section className="w-full max-w-xl rounded-lg border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
        <div className="mb-4 inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
          Configuracao pendente
        </div>
        <h1 className="text-2xl font-semibold">Firebase nao configurado neste deploy</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          O sistema carregou, mas o Netlify nao recebeu todas as variaveis obrigatorias do Firebase.
          Configure as variaveis abaixo em Site configuration, Environment variables, e publique novamente.
        </p>
        <div className="mt-5 rounded-md border border-white/10 bg-black/30 p-4">
          {missing.map((name) => (
            <div key={name} className="font-mono text-sm text-amber-100">
              {name}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function FatalLoadScreen({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <section className="w-full max-w-xl rounded-lg border border-red-400/20 bg-red-500/10 p-6 shadow-2xl">
        <div className="mb-4 inline-flex rounded-full border border-red-300/30 bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-100">
          Falha ao iniciar
        </div>
        <h1 className="text-2xl font-semibold">Nao foi possivel carregar o sistema</h1>
        <p className="mt-3 text-sm leading-6 text-red-100/90">{message}</p>
      </section>
    </main>
  );
}

async function bootstrap() {
  const root = createRoot(document.getElementById("root")!);
  const missing = requiredFirebaseEnv.filter((name) => !import.meta.env[name]);

  if (missing.length > 0) {
    root.render(<MissingConfigScreen missing={missing} />);
    return;
  }

  try {
    const { default: App } = await import("./App");
    root.render(<App />);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido durante a inicializacao.";
    root.render(<FatalLoadScreen message={message} />);
  }
}

void bootstrap();
