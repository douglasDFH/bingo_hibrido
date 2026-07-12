import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, mensajeError } from '../api/client';
import { useAuth } from '../stores/auth.store';
import { Boton, Campo, inputCls } from '../components/ui';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Completa usuario y contraseña');
      return;
    }
    setCargando(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { username: username.trim(), password });
      login(res.data.token, res.data.user, res.data.permisos);
      navigate('/', { replace: true });
    } catch (e2) {
      const status = (e2 as { response?: { status?: number } }).response?.status;
      setError(
        status && status >= 400 && status < 500
          ? 'Usuario o contraseña incorrectos'
          : mensajeError(e2),
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0d1b2a] to-[#08131d] p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-2xl shadow-black/40"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-3xl font-black text-[#04241f] shadow-lg shadow-brand/30">
            B
          </div>
          <h1 className="text-2xl font-bold text-white">Bingo Imperial</h1>
          <p className="text-sm text-muted">Inicia sesión para continuar</p>
        </div>

        <Campo label="Usuario">
          <input
            className={inputCls}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoComplete="username"
          />
        </Campo>
        <Campo label="Contraseña">
          <input
            className={inputCls}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Campo>

        {error && <p className="mb-3 text-sm font-medium text-bad">{error}</p>}

        <Boton type="submit" disabled={cargando} className="w-full">
          {cargando ? 'Entrando…' : 'Entrar'}
        </Boton>
      </form>
    </div>
  );
}
