import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, mensajeError } from '../api/client';
import { useAuth } from '../stores/auth.store';
import { dinero } from '../lib/format';
import { Boton, Dialogo, Spinner } from '../components/ui';

interface DashboardData {
  total_cartones: number;
  disponibles: number;
  vendidos: number;
  reservados: number;
  total_pdfs: number;
  ingresos: number;
  es_admin: boolean;
}

function Tarjeta({ valor, label, color = 'text-white', to }: {
  valor: string | number;
  label: string;
  color?: string;
  to?: string;
}) {
  const contenido = (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-black/20 active:border-brand/50">
      <p className={`text-2xl font-bold ${color}`}>{valor}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
  return to ? <Link to={to}>{contenido}</Link> : contenido;
}

function BotonMenu({ to, emoji, label }: { to: string; emoji: string; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-black/20 active:border-brand/50 active:bg-surface2"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="font-semibold text-white">{label}</span>
      <span className="ml-auto text-hint">›</span>
    </Link>
  );
}

export default function Dashboard() {
  const { user, esAdmin, tienePermiso, logout } = useAuth();
  const navigate = useNavigate();
  const [confirmar, setConfirmar] = useState<null | 'logout' | 'reset' | 'regenerar'>(null);
  const [mensajeAdmin, setMensajeAdmin] = useState('');

  const { data, isLoading, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/dashboard')).data,
    refetchOnWindowFocus: true,
  });

  async function accionAdmin(ruta: string) {
    try {
      const res = await api.post(ruta, {});
      setMensajeAdmin(res.data.mensaje ?? 'Listo');
      refetch();
    } catch (e) {
      setMensajeAdmin(mensajeError(e));
    }
    setConfirmar(null);
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-bg pb-10">
      <header className="border-b border-line bg-gradient-to-b from-[#183043] to-surface px-5 pb-8 pt-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">Bienvenido, {user?.username}</h1>
            <p className="text-sm text-brand">
              {esAdmin() ? 'Administrador' : 'Vendedor'}
            </p>
          </div>
          <button
            onClick={() => setConfirmar('logout')}
            className="rounded-xl bg-white/10 px-3 py-1.5 text-sm active:bg-white/20"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="-mt-4 space-y-4 px-4">
        {isLoading || !data ? (
          <Spinner />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Tarjeta valor={data.total_cartones} label="Total cartones" to="/cartones" />
            <Tarjeta valor={data.disponibles} label="Disponibles" color="text-ok" to="/cartones?estado=disponible" />
            <Tarjeta valor={data.vendidos} label="Vendidos" color="text-bad" to="/cartones?estado=vendido" />
            <Tarjeta valor={data.reservados} label="Reservados" color="text-warn" to="/cartones?estado=reservado" />
            <Tarjeta valor={dinero(data.ingresos)} label="Ingresos" color="text-brand" />
            <Tarjeta valor={data.total_pdfs} label="PDFs" to={tienePermiso('subir_pdf') ? '/pdfs' : undefined} />
          </div>
        )}

        <div className="space-y-2.5">
          <BotonMenu to="/cartones" emoji="🔍" label="Ver cartones / Buscar" />
          {tienePermiso('subir_pdf') && (
            <>
              <BotonMenu to="/subir-pdf" emoji="📄" label="Subir PDF" />
              <BotonMenu to="/pdfs" emoji="🗂" label="Ver PDFs" />
            </>
          )}
          {esAdmin() && (
            <>
              <BotonMenu to="/usuarios" emoji="👥" label="Usuarios" />
              <BotonMenu to="/grupos" emoji="🏷" label="Grupos" />
              <BotonMenu to="/banners" emoji="🖼" label="Banners" />
              <BotonMenu to="/permisos" emoji="🔐" label="Permisos" />
            </>
          )}
        </div>

        {esAdmin() && (
          <div className="space-y-2.5 rounded-2xl border border-dashed border-line p-3">
            <p className="text-xs font-semibold uppercase text-muted">Zona admin</p>
            <Boton variante="secundario" className="w-full" onClick={() => setConfirmar('regenerar')}>
              🖼 Regenerar imágenes
            </Boton>
            <Boton variante="peligro" className="w-full" onClick={() => setConfirmar('reset')}>
              🗑 Limpiar BD (cartones y PDFs)
            </Boton>
            {mensajeAdmin && <p className="text-sm text-muted">{mensajeAdmin}</p>}
          </div>
        )}
      </main>

      <Dialogo
        abierto={confirmar === 'logout'}
        titulo="¿Cerrar sesión?"
        onCerrar={() => setConfirmar(null)}
      >
        <div className="flex gap-2">
          <Boton variante="secundario" className="flex-1" onClick={() => setConfirmar(null)}>
            Cancelar
          </Boton>
          <Boton
            variante="peligro"
            className="flex-1"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
          >
            Salir
          </Boton>
        </div>
      </Dialogo>

      <Dialogo
        abierto={confirmar === 'reset'}
        titulo="⚠️ Borrar TODOS los cartones y PDFs"
        onCerrar={() => setConfirmar(null)}
      >
        <p className="mb-4 text-sm text-muted">
          Se eliminarán todos los cartones, PDFs y sus imágenes. Usuarios, grupos y
          banners se conservan. Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-2">
          <Boton variante="secundario" className="flex-1" onClick={() => setConfirmar(null)}>
            Cancelar
          </Boton>
          <Boton variante="peligro" className="flex-1" onClick={() => accionAdmin('/admin/reset-cartones')}>
            Borrar todo
          </Boton>
        </div>
      </Dialogo>

      <Dialogo
        abierto={confirmar === 'regenerar'}
        titulo="Regenerar imágenes de cartones"
        onCerrar={() => setConfirmar(null)}
      >
        <p className="mb-4 text-sm text-muted">
          Se re-generarán todas las imágenes en segundo plano con el diseño actual.
        </p>
        <div className="flex gap-2">
          <Boton variante="secundario" className="flex-1" onClick={() => setConfirmar(null)}>
            Cancelar
          </Boton>
          <Boton className="flex-1" onClick={() => accionAdmin('/admin/regenerar-imagenes')}>
            Regenerar
          </Boton>
        </div>
      </Dialogo>
    </div>
  );
}
