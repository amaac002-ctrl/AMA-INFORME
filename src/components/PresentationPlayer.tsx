import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    X, Play, Pause, SkipForward, Volume2, VolumeX, ShieldCheck,
    BarChart3, FilePlus, Settings, Mail, Download, CheckCircle2,
    MonitorPlay, Map as MapIcon, Zap, Sparkles, Target, Activity,
    Globe, Shield, TreePine, Lock, Pencil, MousePointer2
} from 'lucide-react';

interface Slide {
    title: string;
    description: string;
    icon: React.ReactNode;
    speech: string;
    demoType?: 'form' | 'map' | 'stats' | 'email';
}

export default function PresentationPlayer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const progressIntervalRef = useRef<any>(null);

    const slides: Slide[] = [
        {
            title: "SISTEMA A.M.E.",
            description: "Innovación para la Vigilancia Ambiental.\nPotenciando a nuestros Agentes en el campo.",
            icon: <ShieldCheck size={48} />,
            speech: "Bienvenidos a la presentación oficial del Sistema A M E. Una herramienta de vanguardia diseñada para transformar la labor de los Agentes de Medio Ambiente, aportando tecnología de precisión a la protección de nuestra biodiversidad.",
        },
        {
            title: "OPERATIVA DE CAMPO",
            description: "Captura de datos ágil y precisa con GPS,\nfotografías y dictado por voz incorporado.",
            icon: <Pencil size={48} />,
            demoType: 'form',
            speech: "En el trabajo de campo, cada segundo cuenta. Nuestra plataforma permite una toma de datos instantánea. Con geolocalización automática y dictado por voz, eliminamos la carga administrativa para que el agente se centre en lo que de verdad importa: la naturaleza.",
        },
        {
            title: "PROTECCIÓN BIOLÓGICA",
            description: "Especializado en el seguimiento de fauna,\nflora y control de espacios protegidos.",
            icon: <TreePine size={48} />,
            speech: "A M E es el aliado perfecto para los trabajos de biodiversidad. Registre con exactitud científica avistamientos, proteja especies en peligro y gestione incidencias en espacios naturales con una trazabilidad total y profesional.",
        },
        {
            title: "MAPAS DE PREVISIÓN",
            description: "Visualización de puntos calientes y riesgos\npara una prevención estratégica de amenazas.",
            icon: <MapIcon size={48} />,
            demoType: 'map',
            speech: "Anticípese a las amenazas. Gracias a la generación automática de mapas de riesgo, podrá visualizar puntos calientes y zonas críticas, permitiendo una planificación estratégica y una prevención eficaz en todo el territorio.",
        },
        {
            title: "ANALÍTICA Y CONTROL",
            description: "Estadísticas avanzadas y gráficas de control\npara una gestión basada en evidencias reales.",
            icon: <BarChart3 size={48} />,
            demoType: 'stats',
            speech: "El control es total. Con nuestro panel de analítica avanzada, convertimos los datos de campo en estadísticas claras y gráficas de control, facilitando la toma de decisiones basada en evidencias reales y actualizadas al minuto.",
        },
        {
            title: "VALIDACIÓN OFICIAL",
            description: "Envío instantáneo de informes al email\ncon firma digital y plena validez administrativa.",
            icon: <Mail size={48} />,
            demoType: 'email',
            speech: "Eficiencia administrativa sin precedentes. Una vez completado el informe, se valida digitalmente y se envía de forma automática a los correos institucionales, garantizando rapidez, transparencia y seguridad jurídica en cada actuación.",
        },
        {
            title: "HERRAMIENTA STUPENDA",
            description: "El futuro de la gestión ambiental.\nCreado por Francisco Santiago.",
            icon: <Sparkles size={48} />,
            speech: "En resumen, A M E es una herramienta estupenda para el Agente moderno. Mejora la elaboración de informes, optimiza la previsión de trabajos y asegura un control total de nuestra biodiversidad. El futuro de la gestión ambiental ya está en sus manos.",
        }
    ];

    const nextSlide = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(prev => prev + 1);
            setProgress(0);
        } else {
            setIsPlaying(false);
            setProgress(100);
        }
    };

    useEffect(() => {
        if (!isOpen) {
            window.speechSynthesis.cancel();
            return;
        }

        if (isPlaying) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(slides[currentSlide].speech);
            utterance.lang = 'es-ES';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            if (isMuted) {
                utterance.volume = 0;
            }

            utterance.onend = () => {
                setTimeout(nextSlide, 1500);
            };

            utteranceRef.current = utterance;
            window.speechSynthesis.speak(utterance);

            const estimatedDuration = slides[currentSlide].speech.split(' ').length * 600 + 4000;
            let startTime = Date.now();
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

            progressIntervalRef.current = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const newProgress = Math.min((elapsed / estimatedDuration) * 100, 99);
                setProgress(newProgress);
            }, 50);

        } else {
            window.speechSynthesis.pause();
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        }

        return () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, [isOpen, currentSlide, isPlaying, isMuted]);

    useEffect(() => {
        if (isPlaying && window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }
    }, [isPlaying]);

    if (!isOpen) return null;

    const current = slides[currentSlide];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center p-6 text-zinc-900 font-sans select-none overflow-hidden"
            >
                {/* Whiteboard Paper Texture */}
                <div className="absolute inset-0 bg-[#f9f9f9] opacity-50" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] pointer-events-none opacity-20" />

                {/* Subtle Grid for Whiteboard Feel */}
                <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#eee 1px, transparent 1px), linear-gradient(90deg, #eee 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                <div className="absolute top-10 left-10 right-10 flex justify-between items-center z-20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center shadow-lg">
                            <Pencil size={24} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Presentación Pizarra</p>
                            <p className="font-black text-sm text-zinc-900">Sistema AME v4.5</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-all border border-black/5"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Drawn Effect Pencil/Marker */}
                <motion.div
                    animate={{
                        x: [100, 150, 100],
                        y: [100, 80, 100],
                        rotate: [0, 5, 0]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/4 right-1/4 z-30 opacity-40 pointer-events-none"
                >
                    <Pencil size={120} className="text-zinc-400" />
                </motion.div>

                {/* Main Content Area */}
                <div className="relative z-10 max-w-7xl w-full flex flex-col lg:flex-row items-center justify-center gap-20 min-h-[60vh]">

                    {/* Left: Drawn Text & Info */}
                    <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentSlide}
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 1.05, y: -20 }}
                                transition={{ duration: 0.5 }}
                            >
                                <motion.div
                                    animate={{ rotate: [-2, 2, -2] }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                    className="w-20 h-20 rounded-2xl border-4 border-zinc-900 flex items-center justify-center mb-8 bg-white mx-auto lg:mx-0 shadow-[8px_8px_0px_rgba(0,0,0,0.1)]"
                                >
                                    {React.isValidElement(current.icon) && React.cloneElement(current.icon as any, { size: 40, className: "text-zinc-900" })}
                                </motion.div>

                                <h2 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 leading-none text-zinc-900">
                                    {current.title}
                                </h2>

                                <div className="h-2 w-32 bg-zinc-900 mb-8 mx-auto lg:mx-0 rounded-full" />

                                <p className="text-xl md:text-3xl text-zinc-600 font-bold max-w-xl leading-relaxed italic">
                                    "{current.description}"
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Right: Mock Whiteboard Drawing */}
                    <div className="flex-1 w-full max-w-2xl aspect-[4/3] relative">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentSlide}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.1 }}
                                transition={{ duration: 0.8 }}
                                className="w-full h-full bg-white rounded-3xl border-8 border-zinc-100 shadow-[20px_20px_0px_rgba(0,0,0,0.05)] overflow-hidden relative"
                            >
                                {/* Hand-drawn look drawing area */}
                                <div className="absolute inset-0 p-12 overflow-hidden">

                                    {current.demoType === 'form' && (
                                        <div className="space-y-8">
                                            <motion.div initial={{ width: 0 }} animate={{ width: '60%' }} className="h-4 bg-zinc-900 rounded-full" />
                                            <div className="space-y-6">
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} className="flex gap-4 items-center">
                                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 * i }} className="w-6 h-6 border-4 border-zinc-900" />
                                                        <motion.div initial={{ width: 0 }} animate={{ width: `${80 - i * 10}%` }} transition={{ delay: 0.2 * i }} className="h-2 bg-zinc-200 rounded-full" />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="pt-8 flex gap-6">
                                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-32 h-32 border-4 border-dashed border-zinc-400 rounded-2xl flex items-center justify-center text-zinc-300">
                                                    <Sparkles size={48} />
                                                </motion.div>
                                                <div className="flex-1 space-y-4">
                                                    <div className="h-8 bg-emerald-100 border-2 border-emerald-500 rounded-xl" />
                                                    <div className="h-8 bg-zinc-50 border-2 border-zinc-200 rounded-xl" />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {current.demoType === 'map' && (
                                        <div className="h-full flex flex-col">
                                            <div className="flex-1 border-4 border-zinc-900 rounded-3xl relative overflow-hidden bg-zinc-50">
                                                <motion.div
                                                    animate={{ opacity: [0.1, 0.3, 0.1] }}
                                                    transition={{ duration: 2, repeat: Infinity }}
                                                    className="absolute top-1/2 left-1/3 w-40 h-40 bg-red-500 rounded-full blur-2xl"
                                                />
                                                <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at center, transparent 0%, #eee 100%)' }} />
                                                {[1, 2, 3, 4].map(i => (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ y: -20, opacity: 0 }}
                                                        animate={{ y: 0, opacity: 1 }}
                                                        transition={{ delay: 0.5 + i * 0.1 }}
                                                        className="absolute"
                                                        style={{ top: 20 + i * 15 + '%', left: 40 + i * 10 + '%' }}
                                                    >
                                                        <MapIcon size={32} className="text-zinc-900" />
                                                    </motion.div>
                                                ))}
                                            </div>
                                            <div className="mt-6 flex justify-between items-center px-4">
                                                <p className="text-xs font-black uppercase text-zinc-400">Mapa de Previsión de Riesgo</p>
                                                <div className="flex gap-2">
                                                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                                                    <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {current.demoType === 'stats' && (
                                        <div className="flex flex-col h-full">
                                            <div className="grid grid-cols-2 gap-6 mb-8">
                                                <div className="p-6 border-4 border-zinc-900 rounded-3xl">
                                                    <p className="text-[10px] font-black uppercase text-zinc-400 mb-2">KPI 01</p>
                                                    <motion.p animate={{ scale: [1, 1.1, 1] }} className="text-4xl font-black">98%</motion.p>
                                                </div>
                                                <div className="p-6 border-4 border-zinc-900 rounded-3xl">
                                                    <p className="text-[10px] font-black uppercase text-zinc-400 mb-2">KPI 02</p>
                                                    <p className="text-4xl font-black text-emerald-600">AME</p>
                                                </div>
                                            </div>
                                            <div className="flex-1 flex items-end gap-4 px-4 pb-4">
                                                {[40, 80, 60, 95, 70, 85, 50].map((h, i) => (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ height: 0 }}
                                                        animate={{ height: h + '%' }}
                                                        transition={{ delay: 0.5 + i * 0.1, type: "spring" }}
                                                        className="flex-1 border-4 border-zinc-900 bg-zinc-100 rounded-t-xl"
                                                    />
                                                ))}
                                            </div>
                                            <div className="h-1 bg-zinc-900 w-full rounded-full" />
                                        </div>
                                    )}

                                    {current.demoType === 'email' && (
                                        <div className="h-full flex flex-col items-center justify-center space-y-8">
                                            <motion.div
                                                animate={{
                                                    y: [0, -10, 0],
                                                    rotate: [-5, 5, -5]
                                                }}
                                                transition={{ duration: 4, repeat: Infinity }}
                                                className="w-32 h-32 border-4 border-zinc-900 rounded-3xl flex items-center justify-center bg-zinc-50 shadow-[10px_10px_0px_rgba(0,0,0,1)]"
                                            >
                                                <Mail size={56} className="text-zinc-900" />
                                            </motion.div>
                                            <div className="text-center">
                                                <h4 className="text-2xl font-black mb-2">¡ENVIADO!</h4>
                                                <p className="text-zinc-500 font-bold">Informe validado y distribuido.</p>
                                            </div>
                                            <div className="w-full max-w-sm h-4 bg-zinc-100 rounded-full overflow-hidden">
                                                <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 2 }} className="h-full bg-emerald-500" />
                                            </div>
                                        </div>
                                    )}

                                    {!current.demoType && (
                                        <div className="h-full flex items-center justify-center">
                                            <motion.div animate={{ scale: [0.9, 1.1, 0.9] }} transition={{ duration: 5, repeat: Infinity }} className="opacity-10">
                                                <Sparkles size={300} strokeWidth={1} />
                                            </motion.div>
                                        </div>
                                    )}
                                </div>

                                {/* Whiteboard Markers Tray Mockup */}
                                <div className="absolute bottom-0 left-0 right-0 h-4 bg-zinc-200" />
                            </motion.div>
                        </AnimatePresence>

                        {/* Simulation of a hand/mouse pointer drawing */}
                        <motion.div
                            animate={{
                                x: [200, 400, 300, 500, 200],
                                y: [200, 150, 300, 250, 200]
                            }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="absolute top-0 left-0 z-40 pointer-events-none opacity-60"
                        >
                            <MousePointer2 size={48} className="fill-zinc-900" />
                        </motion.div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="absolute bottom-12 left-10 right-10 z-20 flex flex-col items-center gap-10">
                    <div className="w-full max-w-3xl flex flex-col items-center gap-6">

                        <div className="flex items-center gap-8 bg-zinc-900 px-8 py-5 rounded-[2rem] shadow-2xl">
                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="w-14 h-14 bg-white text-zinc-900 rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                            >
                                {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
                            </button>

                            <div className="flex flex-col gap-2 min-w-[300px]">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Diapositiva {currentSlide + 1} de {slides.length}</span>
                                    <button
                                        onClick={() => setIsMuted(!isMuted)}
                                        className="text-white/30 hover:text-white transition-colors"
                                    >
                                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                    </button>
                                </div>
                                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-emerald-500"
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.1 }}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={nextSlide}
                                className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-white/40 hover:text-white"
                            >
                                <SkipForward size={24} />
                            </button>
                        </div>

                        <div className="flex gap-4">
                            {slides.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setCurrentSlide(i); setProgress(0); setIsPlaying(true); }}
                                    className={`h-2 rounded-full transition-all duration-500 ${i === currentSlide ? 'bg-zinc-900 w-12 shadow-lg' : 'bg-zinc-200 w-2 hover:bg-zinc-400'}`}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-400">
                            Powered by AME Systems
                        </p>
                        <div className="w-1 h-1 bg-zinc-200 rounded-full" />
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-600">
                            Protección de la Biodiversidad
                        </p>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
