import { ReactNode, useEffect } from 'react';
import type { EstadoCarton } from '@bingo/common';

// ── Colores de estado (paridad con la app Android) ───────────
export const COLOR_ESTADO: Record<string, { texto: string; fondo: string }> = {
  disponible: { texto: 'text-[#22C55E]', fondo: 'bg-[#22C55E]/15' },
  vendido: { texto: 'text-[#EF4444]', fondo: 'bg-[#EF4444]/15' },
  reservado: { texto: 'text-[#F59E0B]', fondo: 'bg-[#F59E0B]/15' },
};

export function EstadoChip({ estado }: { estado: EstadoCarton | string }) {
  const c = COLOR_ESTADO[estado] ?? { texto: 'text-gray-500', fondo: 'bg-gray-500/15' };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${c.texto} ${c.fondo}`}>
      {estado}
    </span>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex justify-center py-8 ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
    </div>
  );
}

export function Boton({
  children,
  onClick,
  variante = 'primario',
  disabled,
  type = 'button',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variante?: 'primario' | 'secundario' | 'peligro' | 'verde' | 'ambar';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  const estilos = {
    primario: 'bg-brand text-white active:bg-brand/80',
    secundario: 'bg-gray-100 text-gray-800 active:bg-gray-200',
    peligro: 'bg-[#EF4444] text-white active:bg-[#EF4444]/80',
    verde: 'bg-[#22C55E] text-white active:bg-[#22C55E]/80',
    ambar: 'bg-[#F59E0B] text-white active:bg-[#F59E0B]/80',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-40 ${estilos[variante]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Dialogo({
  abierto,
  titulo,
  children,
  onCerrar,
}: {
  abierto: boolean;
  titulo: string;
  children: ReactNode;
  onCerrar: () => void;
}) {
  useEffect(() => {
    if (!abierto) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [abierto, onCerrar]);

  if (!abierto) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onCerrar}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold text-gray-900">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

export function Campo({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  'w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';

export function Vacio({ mensaje }: { mensaje: string }) {
  return <p className="py-12 text-center text-sm text-gray-400">{mensaje}</p>;
}
