import { useEffect, useState } from 'react';

// Evento `beforeinstallprompt` (no está en los tipos estándar del DOM).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __deferredInstallPrompt: BeforeInstallPromptEvent | null;
  }
}

// Guardamos un "snooze" (no volver a mostrar hasta cierta fecha) en vez de un
// descarte permanente, para que el banner reaparezca si el usuario no instaló.
const SNOOZE_KEY = 'pwa_install_snooze';
const DIAS_SNOOZE = 3;

function snoozeActivo() {
  const v = localStorage.getItem(SNOOZE_KEY);
  return v !== null && Date.now() < Number(v);
}
function snooze(dias: number) {
  localStorage.setItem(SNOOZE_KEY, String(Date.now() + dias * 86_400_000));
}

function esStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function esIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Navegador embebido (WhatsApp, Instagram, Facebook…): no pueden instalar PWAs.
function esNavegadorEmbebido() {
  return /; wv\)|FBAN|FBAV|Instagram|Line\/|GSA\//.test(navigator.userAgent);
}

type Modo = 'instalar' | 'manual' | 'ios' | 'chrome';

/**
 * Banner de instalación de la PWA en el celular.
 * - Chrome con evento nativo → botón "Instalar" (un toque instala).
 * - Chrome sin evento (algunos equipos) → instrucción "⋮ → Instalar aplicación".
 * - Navegador de WhatsApp/redes → botón "Abrir en Chrome".
 * - iPhone/Safari → "Compartir → Agregar a inicio".
 */
export function InstallPrompt() {
  const [modo, setModo] = useState<Modo | null>(null);

  useEffect(() => {
    if (esStandalone() || snoozeActivo()) return;

    let timer: ReturnType<typeof setTimeout>;

    if (esNavegadorEmbebido()) {
      timer = setTimeout(() => setModo('chrome'), 1500);
      return () => clearTimeout(timer);
    }

    if (esIOS()) {
      timer = setTimeout(() => setModo('ios'), 1500);
      return () => clearTimeout(timer);
    }

    // Android/desktop: si el evento está (o llega), botón nativo; si no,
    // igual mostramos el banner con la instrucción manual.
    const upgrade = () => setModo('instalar');
    window.addEventListener('pwa-installable', upgrade);
    timer = setTimeout(() => {
      setModo(window.__deferredInstallPrompt ? 'instalar' : 'manual');
    }, 2000);
    const instalado = () => setModo(null);
    window.addEventListener('pwa-installed', instalado);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('pwa-installable', upgrade);
      window.removeEventListener('pwa-installed', instalado);
    };
  }, []);

  function cerrar() {
    snooze(DIAS_SNOOZE);
    setModo(null);
  }

  async function instalar() {
    const prompt = window.__deferredInstallPrompt;
    if (!prompt) {
      setModo('manual');
      return;
    }
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    window.__deferredInstallPrompt = null;
    setModo(null);
    if (outcome === 'accepted') snooze(3650);
  }

  const intentChrome =
    'intent://' +
    window.location.href.replace(/^https?:\/\//, '') +
    '#Intent;scheme=https;package=com.android.chrome;end';

  if (!modo) return null;

  const textos: Record<Modo, string> = {
    instalar: 'Úsala como una app en tu celular, sin abrir el navegador.',
    manual: 'Toca el menú ⋮ (arriba a la derecha) y elige “Instalar aplicación”.',
    ios: 'Toca Compartir y luego “Agregar a inicio” para usarla como app.',
    chrome: 'Para instalar la app, ábrela en Chrome.',
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-3">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-4 shadow-2xl shadow-black/50">
        <div className="flex items-start gap-3">
          <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">Instalar Bingo Imperial</p>
            <p className="mt-0.5 text-xs text-muted">{textos[modo]}</p>
          </div>
          <button
            onClick={cerrar}
            aria-label="Cerrar"
            className="-mr-1 -mt-1 rounded-full p-1 text-xl leading-none text-muted active:bg-white/10"
          >
            ×
          </button>
        </div>

        {modo === 'instalar' && (
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={cerrar}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-muted active:bg-white/10"
            >
              Ahora no
            </button>
            <button
              onClick={instalar}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-[#04241f] active:bg-brand-dark"
            >
              Instalar
            </button>
          </div>
        )}

        {(modo === 'manual' || modo === 'ios') && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={cerrar}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-[#04241f] active:bg-brand-dark"
            >
              Entendido
            </button>
          </div>
        )}

        {modo === 'chrome' && (
          <div className="mt-3 flex justify-end">
            <a
              href={intentChrome}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-[#04241f] active:bg-brand-dark"
            >
              Abrir en Chrome
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
