import { useEffect, useRef, useState } from 'react';

// Evento `beforeinstallprompt` (no está en los tipos estándar del DOM).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa_install_dismissed';

// ¿Ya corre como app instalada? Entonces no ofrecemos instalar.
function esStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari iOS expone esto en vez de display-mode
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function esIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Ofrece instalar la PWA en el celular.
 * - Android/Chrome/Edge: usa el evento `beforeinstallprompt` y muestra un botón
 *   "Instalar" que lanza el diálogo nativo del navegador.
 * - iPhone (Safari): ese evento no existe, así que mostramos las instrucciones
 *   manuales (Compartir → Agregar a inicio).
 */
export function InstallPrompt() {
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [modoIOS, setModoIOS] = useState(false);

  useEffect(() => {
    if (esStandalone() || localStorage.getItem(DISMISSED_KEY)) return;

    // Android / navegadores basados en Chromium.
    const handler = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      // Pequeña espera para no interrumpir la carga inicial.
      setTimeout(() => setVisible(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Si ya se instaló, ocultamos y no volvemos a ofrecer.
    const instalado = () => {
      setVisible(false);
      localStorage.setItem(DISMISSED_KEY, '1');
    };
    window.addEventListener('appinstalled', instalado);

    // iOS no dispara `beforeinstallprompt`: mostramos instrucciones manuales.
    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (esIOS()) {
      iosTimer = setTimeout(() => {
        setModoIOS(true);
        setVisible(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', instalado);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  function cerrar() {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  }

  async function instalar() {
    const prompt = deferred.current;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    deferred.current = null;
    setVisible(false);
    if (outcome === 'accepted') localStorage.setItem(DISMISSED_KEY, '1');
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-3">
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-black/10">
        <div className="flex items-start gap-3">
          <img
            src="/icons/icon-192.png"
            alt=""
            className="h-11 w-11 shrink-0 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900">Instalar Bingo Imperial</p>
            <p className="mt-0.5 text-xs text-gray-500">
              {modoIOS
                ? 'Toca Compartir y luego “Agregar a inicio” para usarla como app.'
                : 'Úsala como una app en tu celular, sin abrir el navegador.'}
            </p>
          </div>
          <button
            onClick={cerrar}
            aria-label="Cerrar"
            className="-mr-1 -mt-1 rounded-full p-1 text-xl leading-none text-gray-400 active:bg-gray-100"
          >
            ×
          </button>
        </div>
        {!modoIOS && (
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
      </div>
    </div>
  );
}
