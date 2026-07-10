import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export function Pantalla({
  titulo,
  children,
  atras = true,
  accion,
}: {
  titulo: string;
  children: ReactNode;
  atras?: boolean;
  accion?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto min-h-screen max-w-lg bg-gray-50 pb-8">
      <header className="sticky top-0 z-40 flex items-center gap-3 bg-brand px-4 py-3 text-white shadow-md">
        {atras && (
          <button
            onClick={() => navigate(-1)}
            aria-label="Volver"
            className="-ml-1 rounded-full p-1 text-2xl leading-none active:bg-white/20"
          >
            ‹
          </button>
        )}
        <h1 className="flex-1 truncate text-lg font-bold">{titulo}</h1>
        {accion}
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
}

export function Fab({ onClick, label = '+' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label="Crear"
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-3xl text-white shadow-lg active:scale-95"
      style={{ right: 'max(1.5rem, calc(50vw - 16rem + 1.5rem))' }}
    >
      {label}
    </button>
  );
}
