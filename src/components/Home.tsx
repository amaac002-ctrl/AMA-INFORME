import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, LayoutDashboard, Settings, ArrowRight, ShieldCheck, Database, Zap,
  HelpCircle, X, BookOpen, MousePointerClick, BarChart3, FilePlus, Users,
  CheckCircle2, ChevronRight, Play, Sparkles
} from 'lucide-react';
import { View } from '../App';

interface HomeProps {
  onNavigate: (view: View, template?: any) => void;
  user: any;
}

const TutorialModal = ({ onClose }: { onClose: () => void }) => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      icon: <BookOpen size={28} />,
      color: 'emerald',
      title: '¿Qué es esta aplicación?',
      description:
        'El sistema de Gestión de Informes de Agentes de Medio Ambiente es una plataforma oficial para crear, gestionar y analizar informes de campo de manera eficiente y estructurada.',
      features: [
        { icon: <FileText size={14} />, text: 'Creación de informes con plantillas oficiales' },
        { icon: <BarChart3 size={14} />, text: 'Dashboard con estadísticas en tiempo real' },
        { icon: <Users size={14} />, text: 'Gestión de usuarios y plantillas (admins)' },
      ],
    },
    {
      icon: <FilePlus size={28} />,
      color: 'blue',
      title: 'Módulo de Informes',
      description:
        'Accede a las plantillas oficiales y genera informes de campo. Cada plantilla es un formulario dinámico adaptado a cada tipo de intervención.',
      features: [
        { icon: <CheckCircle2 size={14} />, text: 'Selecciona una plantilla de la lista disponible' },
        { icon: <CheckCircle2 size={14} />, text: 'Rellena los campos del formulario con los datos del campo' },
        { icon: <CheckCircle2 size={14} />, text: 'Genera y descarga el informe en formato Word/PDF' },
        { icon: <CheckCircle2 size={14} />, text: 'Envía el informe por correo electrónico directamente' },
      ],
    },
    {
      icon: <BarChart3 size={28} />,
      color: 'violet',
      title: 'Dashboard Analítico',
      description:
        'Visualiza estadísticas y métricas clave de todas las intervenciones registradas. Analiza tendencias y toma decisiones basadas en datos reales.',
      features: [
        { icon: <CheckCircle2 size={14} />, text: 'KPIs: total de informes, tipos más frecuentes, etc.' },
        { icon: <CheckCircle2 size={14} />, text: 'Gráficos interactivos de distribución y tendencias' },
        { icon: <CheckCircle2 size={14} />, text: 'Resumen de actividad reciente y por operador' },
      ],
    },
    {
      icon: <Settings size={28} />,
      color: 'amber',
      title: 'Panel de Administración',
      description:
        'Exclusivo para administradores. Gestiona las plantillas de informes, crea nuevos modelos, configura formularios y administra los usuarios del sistema.',
      features: [
        { icon: <CheckCircle2 size={14} />, text: 'Crear y editar plantillas de informes' },
        { icon: <CheckCircle2 size={14} />, text: 'Configurar campos de formularios dinámicos' },
        { icon: <CheckCircle2 size={14} />, text: 'Gestionar usuarios y niveles de acceso' },
        { icon: <CheckCircle2 size={14} />, text: 'Vista previa de plantillas antes de publicar' },
      ],
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; ring: string; pill: string; dot: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-200', pill: 'bg-emerald-600', dot: 'bg-emerald-500' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-200', pill: 'bg-blue-600', dot: 'bg-blue-500' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', ring: 'ring-violet-200', pill: 'bg-violet-600', dot: 'bg-violet-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-200', pill: 'bg-amber-600', dot: 'bg-amber-500' },
  };

  const step = steps[activeStep];
  const c = colorMap[step.color];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 30 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-black/5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-8 pb-0">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl ${c.bg} flex items-center justify-center ${c.text}`}>
                  <HelpCircle size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30">Guía de Uso</p>
                  <p className="font-black text-zinc-900 text-sm">Cómo usar la aplicación</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Step pills */}
            <div className="flex gap-2 mb-6">
              {steps.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setActiveStep(i)}
                  className={`flex-1 py-2 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${activeStep === i
                    ? `${colorMap[s.color].pill} text-white shadow-md`
                    : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                    }`}
                >
                  {i + 1}. {s.title.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-8 pb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className={`p-6 rounded-[2rem] ${c.bg} ring-1 ${c.ring} mb-6`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center ${c.text}`}>
                      {step.icon}
                    </div>
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${c.text} opacity-60 mb-0.5`}>
                        Paso {activeStep + 1} de {steps.length}
                      </p>
                      <h3 className="text-xl font-black text-zinc-900 tracking-tight">{step.title}</h3>
                    </div>
                  </div>
                  <p className="text-zinc-600 font-medium text-sm leading-relaxed">{step.description}</p>
                </div>

                <div className="space-y-3">
                  {step.features.map((feature, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="flex items-center gap-3 p-3.5 bg-zinc-50 rounded-2xl"
                    >
                      <div className={`w-6 h-6 rounded-lg ${c.bg} flex items-center justify-center ${c.text} flex-shrink-0`}>
                        {feature.icon}
                      </div>
                      <span className="text-zinc-700 font-semibold text-sm">{feature.text}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                disabled={activeStep === 0}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>

              {/* Dots */}
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveStep(i)}
                    className={`rounded-full transition-all ${i === activeStep ? `w-6 h-2 ${c.dot}` : 'w-2 h-2 bg-zinc-200'}`}
                  />
                ))}
              </div>

              {activeStep < steps.length - 1 ? (
                <button
                  onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
                  className={`px-5 py-2.5 rounded-xl text-sm font-black text-white ${c.pill} hover:opacity-90 transition-all flex items-center gap-2`}
                >
                  Siguiente <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-sm font-black text-white bg-zinc-900 hover:bg-zinc-700 transition-all flex items-center gap-2"
                >
                  <Play size={14} /> ¡Empezar!
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default function Home({ onNavigate, user }: HomeProps) {
  const [showTutorial, setShowTutorial] = useState(false);

  const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.email?.toLowerCase() === 'fran';

  const cards = [
    {
      id: 'reports',
      title: 'Informes',
      subtitle: 'Plantillas Oficiales',
      description: 'Accede a las plantillas de campo, rellena formularios dinámicos y genera los informes oficiales.',
      icon: <FileText size={28} />,
      action: () => onNavigate('reports'),
      gradient: 'from-emerald-500 to-teal-600',
      lightBg: 'bg-emerald-50',
      lightText: 'text-emerald-600',
      lightBorder: 'border-emerald-100',
      active: true,
      badge: 'Disponible',
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      subtitle: 'Analítica Avanzada',
      description: 'Visualiza estadísticas, KPIs y gráficos de las intervenciones registradas en tiempo real.',
      icon: <LayoutDashboard size={28} />,
      action: () => onNavigate('dashboard'),
      gradient: 'from-blue-500 to-indigo-600',
      lightBg: 'bg-blue-50',
      lightText: 'text-blue-600',
      lightBorder: 'border-blue-100',
      active: true,
      badge: 'Disponible',
    },
    {
      id: 'admin',
      title: 'Administración',
      subtitle: 'Gestión del Sistema',
      description: 'Crea plantillas, configura formularios y gestiona los usuarios y niveles de acceso.',
      icon: <Settings size={28} />,
      action: () => onNavigate('admin'),
      gradient: 'from-violet-500 to-purple-600',
      lightBg: 'bg-violet-50',
      lightText: 'text-violet-600',
      lightBorder: 'border-violet-100',
      active: isAdmin,
      badge: isAdmin ? 'Admin' : 'Restringido',
    },
  ];

  return (
    <>
      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}

      <div className="max-w-7xl mx-auto px-6 space-y-10">

        {/* ── Hero Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-white rounded-[3rem] overflow-hidden border border-black/5 shadow-xl"
        >
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-gradient-to-bl from-emerald-100/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-50 via-transparent to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 p-10 md:p-14">
            {/* Logo Central Gigante */}
            <div className="flex-1 flex flex-col items-center justify-center py-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05, rotate: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="w-64 h-64 md:w-[450px] md:h-[450px] rounded-full relative flex items-center justify-center cursor-pointer group mb-12"
              >
                {/* Glow effects */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 blur-[100px] group-hover:blur-[120px] transition-all duration-700" />
                <div className="absolute -inset-10 rounded-full border border-emerald-500/5 animate-[pulse_4s_ease-in-out_infinite]" />
                <div className="absolute -inset-20 rounded-full border border-emerald-500/5 animate-[pulse_6s_ease-in-out_infinite] delay-700" />

                {/* Logo Container with perfect circle clipping */}
                <div className="absolute inset-0 rounded-full bg-white shadow-[0_20px_80px_rgba(0,0,0,0.15)] ring-1 ring-black/5 overflow-hidden flex items-center justify-center p-4">
                  <img
                    src="/logo.png"
                    alt="Logo Agentes"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/canary-agents-seal/400/400';
                    }}
                  />
                </div>
              </motion.div>

              {/* Status Badges Centered */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap items-center gap-3 mb-10 justify-center"
              >
                <span className="bg-emerald-600 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/40 ring-4 ring-emerald-500/10">
                  Cuerpo de Agentes
                </span>
                <span className="bg-white/80 backdrop-blur-md text-zinc-500 px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] border border-black/5">
                  Gestión V4.5
                </span>
              </motion.div>

              {/* Centered Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-5 justify-center"
              >
                <button
                  onClick={() => setShowTutorial(true)}
                  className="group relative flex items-center gap-4 px-10 py-5 bg-zinc-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] overflow-hidden hover:scale-105 transition-all shadow-2xl shadow-black/30"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Play size={20} className="text-emerald-400 relative z-10" />
                  <span className="relative z-10">Video Tutorial</span>
                </button>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="flex items-center gap-4 px-10 py-5 bg-white border-2 border-zinc-100 text-zinc-900 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-zinc-50 hover:border-zinc-200 transition-all hover:shadow-xl group"
                >
                  <LayoutDashboard size={20} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                  Dashboard
                </button>
              </motion.div>
            </div>

            {/* Operator info shifted or integrated differently */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="absolute bottom-8 right-8 bg-white/40 backdrop-blur-md border border-white/20 rounded-3xl p-4 flex items-center gap-4 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <ShieldCheck size={20} />
              </div>
              <div className="hidden md:block">
                <p className="text-[8px] font-black uppercase tracking-widest text-black/40 mb-0.5">Sesión Activa</p>
                <p className="text-xs font-black text-zinc-900">{user?.email}</p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* ── Module Cards ── */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black/30 mb-1">Módulos del Sistema</p>
              <h2 className="text-2xl font-black tracking-tight text-zinc-900">Acceso Rápido</h2>
            </div>
            {/* Help button (floating hint) */}
            <motion.button
              onClick={() => setShowTutorial(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2.5 px-5 py-2.5 bg-white border border-black/8 rounded-2xl shadow-sm hover:shadow-md transition-all group"
              title="Ver guía de uso"
            >
              <div className="w-7 h-7 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 group-hover:bg-amber-100 transition-colors">
                <Sparkles size={15} />
              </div>
              <span className="text-sm font-bold text-zinc-500 group-hover:text-zinc-800 transition-colors">Guía de uso</span>
              <HelpCircle size={15} className="text-zinc-300 group-hover:text-emerald-500 transition-colors" />
            </motion.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.2 }}
                onClick={card.active ? card.action : undefined}
                className={`group relative rounded-[2.5rem] overflow-hidden border ${card.lightBorder} transition-all duration-400 ${card.active
                  ? 'cursor-pointer hover:shadow-2xl hover:-translate-y-2 bg-white'
                  : 'opacity-50 grayscale cursor-not-allowed bg-zinc-50'
                  }`}
              >
                {/* Gradient overlay on hover */}
                {card.active && (
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-400 pointer-events-none`} />
                )}

                <div className="p-8">
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-8">
                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-2xl ${card.lightBg} flex items-center justify-center ${card.lightText} group-hover:bg-gradient-to-br group-hover:${card.gradient.split(' ')[1]} transition-all duration-400`}>
                      <div className={`group-hover:text-white transition-colors ${card.lightText}`}>
                        {card.icon}
                      </div>
                    </div>

                    {/* Badge + Arrow */}
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${card.active && card.badge === 'Admin'
                        ? 'bg-violet-100 text-violet-600'
                        : card.active
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-zinc-200 text-zinc-400'
                        }`}>
                        {card.badge}
                      </span>
                      {card.active && (
                        <div className={`w-8 h-8 rounded-full ${card.lightBg} flex items-center justify-center ${card.lightText} group-hover:bg-gradient-to-br group-hover:${card.gradient} group-hover:text-white transition-all duration-400`}>
                          <ArrowRight size={15} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Text */}
                  <p className={`text-[10px] font-black uppercase tracking-[0.25em] ${card.lightText} opacity-70 mb-2`}>{card.subtitle}</p>
                  <h3 className="text-2xl font-black tracking-tight text-zinc-900 mb-3">{card.title}</h3>
                  <p className="text-zinc-400 font-medium text-sm leading-relaxed">{card.description}</p>

                  {/* Bottom gradient line */}
                  {card.active && (
                    <div className={`mt-6 h-0.5 w-0 group-hover:w-full bg-gradient-to-r ${card.gradient} rounded-full transition-all duration-500`} />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Status Bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {[
            {
              icon: <Database size={20} />,
              label: 'Base de Datos',
              value: 'Sincronizada',
              status: 'ok',
              color: 'emerald',
            },
            {
              icon: <Zap size={20} />,
              label: 'Conexión',
              value: 'Encriptado AES-256',
              status: 'ok',
              color: 'blue',
            },
            {
              icon: <MousePointerClick size={20} />,
              label: '¿Primera vez aquí?',
              value: 'Ver guía de uso',
              status: 'info',
              color: 'amber',
              action: () => setShowTutorial(true),
            },
          ].map((item, i) => (
            <div
              key={i}
              onClick={item.action}
              className={`flex items-center gap-4 bg-white p-5 rounded-2xl border border-black/5 shadow-sm ${item.action ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                item.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                  'bg-amber-50 text-amber-500'
                }`}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-black/30 mb-0.5">{item.label}</p>
                <p className={`font-bold text-sm truncate ${item.action ? 'text-amber-600' : 'text-zinc-800'}`}>{item.value}</p>
              </div>
              {item.status === 'ok' && (
                <div className={`w-2 h-2 rounded-full animate-pulse ${item.color === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
              )}
              {item.action && (
                <HelpCircle size={16} className="text-amber-400 flex-shrink-0" />
              )}
            </div>
          ))}
        </motion.div>
      </div>
    </>
  );
}
