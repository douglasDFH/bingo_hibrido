import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, mensajeError } from '../api/client';
import { Pantalla } from '../components/Layout';
import { Boton, Dialogo, Spinner, Vacio } from '../components/ui';
import { fecha } from '../lib/format';

interface Pdf {
  id: number;
  nombre_archivo: string;
  fecha_procesado: string;
  total_paginas: number;
  paginas_ok: number;
  estado: string;
  total_cartones: number;
}

const ESTILO_ESTADO: Record<string, { texto: string; clase: string }> = {
  procesando: { texto: '● Procesando', clase: 'text-[#16A34A] animate-pulse' },
  completado: { texto: '✓ Completado', clase: 'text-brand' },
  completado_con_errores: { texto: '⚠ Con errores', clase: 'text-[#D97706]' },
  error: { texto: '✗ Error', clase: 'text-[#DC2626]' },
};

export default function Pdfs() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [aEliminar, setAEliminar] = useState<Pdf | null>(null);
  const [error, setError] = useState('');

  const { data: pdfs, isLoading } = useQuery<Pdf[]>({
    queryKey: ['pdfs'],
    queryFn: async () => (await api.get('/pdfs')).data,
    // Auto-refresh cada 2s mientras haya PDFs procesando (paridad con la app)
    refetchInterval: (query) =>
      query.state.data?.some((p) => p.estado === 'procesando') ? 2000 : false,
  });

  const eliminar = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/pdfs/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pdfs'] });
      qc.invalidateQueries({ queryKey: ['cartones'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setAEliminar(null);
    },
    onError: (e) => setError(mensajeError(e)),
  });

  return (
    <Pantalla titulo="PDFs procesados">
      {isLoading ? (
        <Spinner />
      ) : !pdfs?.length ? (
        <Vacio mensaje="Aún no has subido PDFs" />
      ) : (
        <div className="space-y-2.5">
          {pdfs.map((p) => {
            const estilo = ESTILO_ESTADO[p.estado] ?? { texto: p.estado, clase: 'text-gray-500' };
            const conteo =
              p.estado === 'procesando' && p.total_paginas > 0
                ? `${p.paginas_ok} / ${p.total_paginas} cartones`
                : `${p.total_cartones || p.paginas_ok} cartones`;
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm active:bg-gray-50"
                onClick={() => navigate('/cartones')}
              >
                <span className="text-2xl">📄</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-800">{p.nombre_archivo}</p>
                  <p className="text-xs text-gray-500">
                    {conteo} · {fecha(p.fecha_procesado)}
                  </p>
                  <p className={`text-xs font-semibold ${estilo.clase}`}>{estilo.texto}</p>
                </div>
                <button
                  aria-label="Eliminar PDF"
                  className="rounded-full p-2 text-lg active:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAEliminar(p);
                  }}
                >
                  🗑
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Dialogo
        abierto={!!aEliminar}
        titulo="¿Eliminar PDF?"
        onCerrar={() => setAEliminar(null)}
      >
        <p className="mb-4 text-sm text-gray-600">
          Se eliminarán <b>{aEliminar?.nombre_archivo}</b> y sus{' '}
          <b>{aEliminar?.total_cartones ?? 0} cartones</b>.
        </p>
        {error && <p className="mb-2 text-sm text-[#EF4444]">{error}</p>}
        <div className="flex gap-2">
          <Boton variante="secundario" className="flex-1" onClick={() => setAEliminar(null)}>
            Cancelar
          </Boton>
          <Boton
            variante="peligro"
            className="flex-1"
            disabled={eliminar.isPending}
            onClick={() => aEliminar && eliminar.mutate(aEliminar.id)}
          >
            Eliminar
          </Boton>
        </div>
      </Dialogo>
    </Pantalla>
  );
}
