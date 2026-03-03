import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Mail, Loader2, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLogin: (user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || data.message || 'Error al iniciar sesión');
      } else {
        onLogin(data.user);
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <motion.div
        className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl border border-black/5 overflow-hidden"
      >
        <div className="bg-black p-12 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-white rounded-full p-1 shadow-xl mb-6">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-full h-full rounded-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://picsum.photos/seed/canary-agents-seal/400/400";
                }}
              />
            </div>
            <h1 className="text-2xl font-black tracking-tight mb-1">Agentes de Medio Ambiente</h1>
            <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em]">Gestión de Informes</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-12 space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-3"
            >
              <ShieldCheck size={16} />
              {error}
            </motion.div>
          )}

          <div className="space-y-4">
            <div className="relative group">
              <label className="text-[10px] font-black uppercase tracking-widest text-black/30 mb-1.5 block ml-4">Email Corporativo</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20 group-focus-within:text-black transition-colors" size={18} />
                <input
                  type="text"
                  required
                  placeholder="Usuario o email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-zinc-50 border border-black/5 rounded-2xl outline-none focus:ring-2 focus:ring-black transition-all font-bold text-sm"
                />
              </div>
            </div>

            <div className="relative group">
              <label className="text-[10px] font-black uppercase tracking-widest text-black/30 mb-1.5 block ml-4">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20 group-focus-within:text-black transition-colors" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-black/5 rounded-2xl outline-none focus:ring-2 focus:ring-black transition-all text-sm font-bold"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Entrar al Sistema'}
          </button>

          <p className="text-center text-[10px] text-black/20 font-bold uppercase tracking-widest pt-4">
            Acceso restringido a personal autorizado
          </p>
        </form>
      </motion.div>
    </div>
  );
}
