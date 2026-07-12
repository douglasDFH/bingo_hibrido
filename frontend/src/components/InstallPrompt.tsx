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

// ¿Ya corre como app instalada?
function esStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function esIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Navegador embebido (WhatsApp, Instagram, Facebook…). Estos NO pueden instalar
// PWAs, así que ahí ofrecemos abrir el enlace en Chrome.
function esNavegadorEmbebido() {
  const ua = navigator.userAgent;
  return /; wv\)|FBAN|FBAV|Instagram|Line\/|GSA\//.test(ua);
}

type Modo = 'instalar' | 'ios' | 'chrome';

/**
 * Banner de instalación de la PWA en el celular.
 * - Android/Chrome: banner con botón "Instalar" que lanza el diálogo nativo.
 * - Navegador de WhatsApp/redes: banner "Abrir en Chrome" (no se puede instalar ahí).
 * - iPhone/Safari: instrucciones "Compartir → Agregar a inicio".
 */
export function InstallPrompt() {
  const [modo, setModo] = useState<Modo | null>(null);

  useEffect(() => {
    if (esStandalone() || snoozeActivo()) return;

    // 1) Navegador embebido (típico al abrir el link desde WhatsApp).
    if (esNavegadorEmbebido()) {
      const t = setTimeout(() => setModo('chrome'), 1500);
      return () => clearTimeout(t);
    }

    // 2) iPhone: Safari no dispara beforeinstallprompt.
    if (esIOS()) {
      const t = setTimeout(() => setModo('ios'), 1500);
      return () => clearTimeout(t);
    }

    // 3) Android/desktop con Chrome: mostramos cuando el evento esté disponible.
    //    El evento pudo dispararse ANTES de montar (lo capturamos en index.html).
    const mostrar = () => {
      if (window.__deferredInstallPrompt) setTimeout(() => setModo('instalar'), 1200);
    };
    if (window.__deferredInstallPrompt) {
      mostrar();
    } else {
      window.addEventListener('pwa-installable', mostrar);
    }
    const instalado = () => setModo(null);
    window.addEventListener('pwa-installed', instalado);

    return () => {
      window.removeEventListener('pwa-installable', mostrar);
      window.removeEventListener('pwa-installed', instalado);
    };
  }, []);

  function cerrar() {
    snooze(DIAS_SNOOZE);
    setModo(null);
  }

  async function instalar() {
    const prompt = window.__deferredInstallPrompt;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    window.__deferredInstallPrompt = null;
    setModo(null);
    if (outcome === 'accepted') snooze(3650); // instalada: no volver a molestar
  }

  // URL actual como intent de Android para abrir en Chrome desde un WebView.
  const intentChrome =
    'intent://' +
    window.location.href.replace(/^https?:\/\//, '') +
    '#Intent;scheme=https;package=com.android.chrome;end';

  if (!modo) return null;

  const textos: Record<Modo, string> = {
    instalar: 'Úsala como una app en tu celular, sin abrir el navegador.',
    ios: 'Toca Compartir y luego “Agregar a inicio” para usarla como app.',
    chrome: 'Para instalar la app, abre este enlace en Chrome.',
  };

  return (
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

        {modo === 'instalar' && (
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
  );
}
