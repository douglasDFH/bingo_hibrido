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

// TEMPORAL: panel de diagnóstico en pantalla. Se quita cuando resolvamos.
const DEBUG = true;

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

export function InstallPrompt() {
  const [modo, setModo] = useState<Modo | null>(null);
  const [bipFired, setBipFired] = useState<boolean>(!!window.__deferredInstallPrompt);

  useEffect(() => {
    const marcarBip = () => setBipFired(true);
    window.addEventListener('pwa-installable', marcarBip);

    if (esStandalone() || snoozeActivo()) {
      return () => window.removeEventListener('pwa-installable', marcarBip);
    }

    let timer: ReturnType<typeof setTimeout>;

    if (esNavegadorEmbebido()) {
      timer = setTimeout(() => setModo('chrome'), 1500);
    } else if (esIOS()) {
      timer = setTimeout(() => setModo('ios'), 1500);
    } else {
      // Android/desktop: si el evento ya está (o llega), botón nativo; si no,
      // igual mostramos el banner con instrucciones manuales.
      const upgrade = () => setModo('instalar');
      window.addEventListener('pwa-installable', upgrade);
      timer = setTimeout(() => {
        setModo(window.__deferredInstallPrompt ? 'instalar' : 'manual');
      }, 2000);
      const instalado = () => setModo(null);
      window.addEventListener('pwa-installed', instalado);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('pwa-installable', marcarBip);
        window.removeEventListener('pwa-installable', upgrade);
        window.removeEventListener('pwa-installed', instalado);
      };
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('pwa-installable', marcarBip);
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

  const debug = DEBUG ? (
    <div className="fixed inset-x-0 top-0 z-[60] bg-black/85 px-2 py-1 text-[11px] leading-tight text-lime-300">
      <div>standalone: {String(esStandalone())} · bip: {String(bipFired)} · snoozed: {String(snoozeActivo())}</div>
      <div>ios: {String(esIOS())} · embebido: {String(esNavegadorEmbebido())} · modo: {String(modo)}</div>
      <div className="truncate text-gray-400">{navigator.userAgent}</div>
    </div>
  ) : null;

  const textos: Record<Modo, string> = {
    instalar: 'Úsala como una app en tu celular, sin abrir el navegador.',
    manual: 'Abre el menú ⋮ de Chrome y toca “Instalar aplicación”.',
    ios: 'Toca Compartir y luego “Agregar a inicio” para usarla como app.',
    chrome: 'Para instalar la app, ábrela en Chrome.',
  };

  return (
    <>
      {debug}
      {modo && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-3">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-black/10">
            <div className="flex items-start gap-3">
              <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900">Instalar Bingo Imperial</p>
                <p className="mt-0.5 text-xs text-gray-500">{textos[modo]}</p>
              </div>
              <button
                onClick={cerrar}
                aria-label="Cerrar"
                className="-mr-1 -mt-1 rounded-full p-1 text-xl leading-none text-gray-400 active:bg-gray-100"
              >
                ×
              </button>
            </div>

            {(modo === 'instalar' || modo === 'manual') && (
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={cerrar}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 active:bg-gray-100"
                >
                  Ahora no
                </button>
                <button
                  onClick={instalar}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white active:bg-brand/80"
                >
                  Instalar
                </button>
              </div>
            )}

            {modo === 'chrome' && (
              <div className="mt-3 flex justify-end">
                <a
                  href={intentChrome}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white active:bg-brand/80"
                >
                  Abrir en Chrome
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
