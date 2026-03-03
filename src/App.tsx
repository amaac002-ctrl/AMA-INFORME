import { useState, useEffect } from 'react';
import DocumentForm from './components/DocumentForm';
import Dashboard from './components/Dashboard';
import Home from './components/Home';
import Reports from './components/Reports';
import Admin from './components/Admin';
import Login from './components/Login';
import PresentationPlayer from './components/PresentationPlayer';
import {
  LayoutDashboard, FilePlus2, ChevronLeft, LogOut, Settings,
  Home as HomeIcon, ShieldCheck, Menu, X, Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type View = 'home' | 'reports' | 'form' | 'dashboard' | 'admin' | 'login';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [user, setUser] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        let parsedUser = JSON.parse(savedUser);
        if (parsedUser.email?.toLowerCase() === 'fran' && parsedUser.role !== 'admin') {
          parsedUser.role = 'admin';
          localStorage.setItem('user', JSON.stringify(parsedUser));
        }
        setUser(parsedUser);
      } catch (e) {
        console.error('Error parsing saved user:', e);
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogin = (userData: any) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    setView('home');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setView('login');
  };

  const handleNavigate = (newView: View, template?: any) => {
    if (template) setSelectedTemplate(template);
    setView(newView);
    setMobileMenuOpen(false);
  };

  if (!user && view !== 'login') {
    return <Login onLogin={handleLogin} />;
  }

  const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.email?.toLowerCase() === 'fran';

  const navItems = [
    {
      id: 'reports' as View,
      label: 'Informes',
      icon: <FilePlus2 size={15} />,
      active: view === 'reports' || view === 'form',
    },
    ...(isAdmin
      ? [
        {
          id: 'admin' as View,
          label: 'Admin',
          icon: <Settings size={15} />,
          active: view === 'admin',
        },
      ]
      : []),
    {
      id: 'dashboard' as View,
      label: 'Dashboard',
      icon: <LayoutDashboard size={15} />,
      active: view === 'dashboard',
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-black/[0.06] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[68px] flex items-center justify-between gap-4">

          {/* Logo + Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer group flex-shrink-0"
            onClick={() => handleNavigate('home')}
          >
            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center p-1 border border-black/5 group-hover:bg-emerald-50 transition-all group-hover:scale-105">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-full h-full rounded-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://picsum.photos/seed/canary-agents-seal/400/400';
                }}
              />
            </div>
            <div className="hidden sm:block">
              <span className="font-black text-[13px] tracking-tight block leading-none text-zinc-900">
                Agentes MedioAmb.
              </span>
              <span className="text-[8px] font-black text-emerald-600 uppercase tracking-[0.15em]">
                Unidad de Gestión
              </span>
            </div>
          </div>

          {/* Center nav pills – desktop */}
          <div className="hidden md:flex items-center bg-zinc-100 p-1 rounded-2xl gap-0.5">
            {/* Home */}
            <button
              onClick={() => handleNavigate('home')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${view === 'home'
                ? 'bg-white shadow text-zinc-900'
                : 'text-zinc-400 hover:text-zinc-700'
                }`}
            >
              <HomeIcon size={14} />
              Inicio
            </button>

            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`flex items-center px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-200 ${item.active
                  ? 'bg-white shadow-sm text-emerald-600'
                  : 'text-zinc-400 hover:text-zinc-700'
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Back button (when not on home) */}
            {view !== 'home' && (
              <button
                onClick={() => handleNavigate('home')}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all"
              >
                <ChevronLeft size={14} />
                Inicio
              </button>
            )}

            {/* Presentation Video Link */}
            <button
              onClick={() => setShowPresentation(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-emerald-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all group"
              title="Ver Video de Presentación"
            >
              <div className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Play size={12} fill="currentColor" />
              </div>
              <span className="hidden lg:inline">Presentación</span>
            </button>

            {/* User pill */}
            <div className="hidden sm:flex items-center gap-2 bg-zinc-50 border border-black/5 px-3.5 py-2 rounded-xl">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                <ShieldCheck size={13} />
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black uppercase tracking-widest text-black/30 leading-none mb-0.5">
                  {isAdmin ? 'Admin' : 'Operador'}
                </p>
                <p className="text-[11px] font-black text-zinc-900 leading-none capitalize">{user?.email}</p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all"
              title="Cerrar Sesión"
            >
              <LogOut size={16} />
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-all"
            >
              {mobileMenuOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-black/5 bg-white/95 backdrop-blur-xl overflow-hidden"
            >
              <div className="px-4 py-3 space-y-1">
                {[
                  { id: 'home' as View, label: 'Inicio', icon: <HomeIcon size={15} /> },
                  ...navItems,
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${view === item.id
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
                      }`}
                  >
                    {item.icon}
                    {'label' in item ? item.label : ''}
                  </button>
                ))}

                <div className="pt-2 border-t border-black/5 flex items-center justify-between px-4 py-2">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-black/30">
                      {isAdmin ? 'Administrador' : 'Operador'}
                    </p>
                    <p className="text-sm font-black capitalize">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-all"
                  >
                    <LogOut size={14} /> Salir
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Main Content ── */}
      <main className="py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {view === 'home' && <Home onNavigate={handleNavigate} user={user} />}
            {view === 'reports' && (
              <Reports onSelectTemplate={(t) => handleNavigate('form', t)} />
            )}
            {view === 'form' && (
              <DocumentForm
                template={selectedTemplate}
                user={user}
                onBack={() => setView('reports')}
              />
            )}
            {view === 'dashboard' && <Dashboard />}
            {view === 'admin' && isAdmin && <Admin user={user} />}
            {view === 'admin' && !isAdmin && (
              <div className="text-center py-32 space-y-4">
                <div className="w-20 h-20 mx-auto bg-red-50 rounded-3xl flex items-center justify-center text-red-400 mb-4">
                  <ShieldCheck size={36} />
                </div>
                <p className="font-black text-red-400 uppercase tracking-widest text-xs">
                  Acceso Denegado
                </p>
                <p className="text-zinc-400 text-sm">Solo administradores pueden acceder a este módulo.</p>
              </div>
            )}
            {view === 'login' && <Login onLogin={handleLogin} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Footer ── */}
      <footer className="py-8 border-t border-black/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-black/20 text-[10px] font-black uppercase tracking-[0.2em]">
            © 2026 Agentes de Medio Ambiente · Gestión de Informes
          </p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-600 text-[10px] font-black uppercase tracking-widest">Sistema Operativo</span>
          </div>
        </div>
      </footer>

      {/* ── Presentation Player Overlay ── */}
      <PresentationPlayer
        isOpen={showPresentation}
        onClose={() => setShowPresentation(false)}
      />
    </div>
  );
}
