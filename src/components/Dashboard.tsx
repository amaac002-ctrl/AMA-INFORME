import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  LayoutDashboard, Filter, Download, Search, FileText, Calendar,
  Map as MapIcon, BarChart3, TrendingUp, Users, ChevronRight,
  ArrowUpRight, Loader2, MapPin, Eye, Trash2, X, Target,
  Activity, CalendarDays, CheckCircle, Clock, AlertCircle,
  Send, Inbox
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line,
  AreaChart, Area, Legend, Radar, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ComposedChart
} from 'recharts';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Tooltip as LeafletTooltip } from 'react-leaflet';

const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Iconos personalizados por tipo
const getMarkerIcon = (templateId: number) => {
  let color = '#10b981'; // Default emerald
  if (templateId === 1) color = '#10b981'; // Venenos
  if (templateId === 2) color = '#ef4444'; // Denuncias
  if (templateId === 3) color = '#f59e0b'; // Quemas

  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      "></div>
    `,
    className: 'custom-div-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
    tooltipAnchor: [12, -12]
  });
};

L.Marker.prototype.options.icon = DefaultIcon;

// Formatea fecha corta para eje X
const fmtDay = (d: Date) => d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

const criteriaOptions = [
  { label: 'Municipio', key: 'municipio' },
  { label: 'Especie', key: 'identificacion' },
  { label: 'Espacio', key: 'espacio_protegido' },
  { label: 'Suelo', key: 'clasificacion_suelo' },
  { label: 'Incidencia', key: 'incidencia' },
];

export default function Dashboard() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'stats' | 'map' | 'registry'>('stats');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>(['municipio']);
  const [selectedChartFilter, setSelectedChartFilter] = useState<{ key: string, value: string } | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [subsRes, tempsRes] = await Promise.all([
        fetch('/api/submissions-dynamic'),
        fetch('/api/templates')
      ]);
      setSubmissions(await subsRes.json());
      setTemplates(await tempsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este informe? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`/api/submissions/${id}`, { method: 'DELETE' });
      if (res.ok) setSubmissions(submissions.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting submission:', error);
    }
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPDF(true);
    try {
      const element = reportRef.current.querySelector('.pdf-content') as HTMLElement;
      if (!element) throw new Error('Content element not found');
      await new Promise(resolve => setTimeout(resolve, 500));
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Informe_${selectedReport.template_name}_${selectedReport.expedient_number || 'S-N'}.pdf`);
    } catch (error) {
      alert('Error al generar el PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const getSubmissionCoords = (s: any) => {
    try {
      const data = JSON.parse(s.data);
      const coordStr = data.coordenadas || data.gps || data.coord;
      if (coordStr && coordStr.includes(',')) {
        const [lat, lng] = coordStr.split(',').map((c: string) => parseFloat(c.trim()));
        if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
      }
    } catch (e) { }
    return null;
  };

  // --- Filtros ---
  const filteredSubmissions = submissions.filter(s => {
    const matchesTemplate = filter === 'all' || s.template_id.toString() === filter;
    const matchesSearch = s.template_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.user_email && s.user_email.toLowerCase().includes(search.toLowerCase()));
    let matchesDate = true;
    if (dateRange.start || dateRange.end) {
      const subDate = new Date(s.submission_date);
      if (dateRange.start && subDate < new Date(dateRange.start)) matchesDate = false;
      if (dateRange.end && subDate > new Date(dateRange.end)) matchesDate = false;
    }

    let matchesInteractive = true;
    if (selectedChartFilter) {
      try {
        const data = typeof s.data === 'string' ? JSON.parse(s.data) : s.data;
        if (selectedChartFilter.key === 'template_name') {
          matchesInteractive = s.template_name === selectedChartFilter.value;
        } else if (selectedChartFilter.key === 'status') {
          matchesInteractive = (s.status === 'enviado' ? 'Enviados' : 'Borradores') === selectedChartFilter.value;
        } else {
          const val = data[selectedChartFilter.key];
          const short = val && typeof val === 'string' ? (val.length > 20 ? val.substring(0, 20) + '…' : val) : '';
          matchesInteractive = short === selectedChartFilter.value;
        }
      } catch (e) { matchesInteractive = false; }
    }

    return matchesTemplate && matchesSearch && matchesDate && matchesInteractive;
  });

  // --- KPIs ---
  const totalReports = filteredSubmissions.length;
  const enviados = filteredSubmissions.filter(s => s.status === 'enviado').length;
  const borradores = filteredSubmissions.filter(s => s.status === 'borrador').length;
  const uniqueAgents = new Set(filteredSubmissions.map(s => s.user_id)).size;
  const today = new Date();
  const thisMonth = filteredSubmissions.filter(s => {
    const d = new Date(s.submission_date);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }).length;
  const enviadosPct = totalReports > 0 ? Math.round((enviados / totalReports) * 100) : 0;

  // --- Gráfico de actividad: últimos 30 días ---
  const getTimelineData = () => {
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days[fmtDay(d)] = 0;
    }
    filteredSubmissions.forEach(s => {
      const key = fmtDay(new Date(s.submission_date));
      if (key in days) days[key]++;
    });
    return Object.entries(days).map(([name, value]) => ({ name, value }));
  };

  // --- Gráfico por campo de datos ---
  const getChartData = (fieldKey: string) => {
    const counts: Record<string, number> = {};
    filteredSubmissions.forEach(s => {
      try {
        const data = typeof s.data === 'string' ? JSON.parse(s.data) : s.data;
        const val = data[fieldKey];
        if (val && typeof val === 'string' && !val.startsWith('data:image') && val.trim()) {
          const short = val.length > 22 ? val.substring(0, 22) + '…' : val;
          counts[short] = (counts[short] || 0) + 1;
        }
      } catch (e) { }
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  };

  // --- Distribución por plantilla ---
  const reportsByTemplate = filteredSubmissions.reduce((acc: Record<string, number>, s) => {
    acc[s.template_name] = (acc[s.template_name] || 0) + 1;
    return acc;
  }, {});
  const templateChartData = Object.entries(reportsByTemplate)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // --- Estado/enviado pie ---
  const statusData = [
    { name: 'Enviados', value: enviados },
    { name: 'Borradores', value: borradores },
  ].filter(d => d.value > 0);

  const getMultiChartData = () => {
    const allNames = new Set<string>();
    const dataByCrit: Record<string, Record<string, number>> = {};

    selectedCriteria.forEach(crit => {
      dataByCrit[crit] = {};
      filteredSubmissions.forEach(s => {
        try {
          const data = typeof s.data === 'string' ? JSON.parse(s.data) : s.data;
          const val = data[crit];
          if (val && typeof val === 'string' && !val.startsWith('data:image') && val.trim()) {
            const short = val.length > 20 ? val.substring(0, 20) + '…' : val;
            dataByCrit[crit][short] = (dataByCrit[crit][short] || 0) + 1;
            allNames.add(short);
          }
        } catch (e) { }
      });
    });

    return Array.from(allNames).map(name => {
      const entry: any = { name };
      selectedCriteria.forEach(crit => {
        entry[crit] = dataByCrit[crit][name] || 0;
      });
      return entry;
    }).sort((a, b) => {
      const sumA = selectedCriteria.reduce((acc, c) => acc + (a[c] || 0), 0);
      const sumB = selectedCriteria.reduce((acc, c) => acc + (b[c] || 0), 0);
      return sumB - sumA;
    }).slice(0, 10);
  };

  const multiCriterionData = getMultiChartData();
  const timelineData = getTimelineData();

  const getMetricData = (crit: string) => {
    const counts: Record<string, number> = {};
    filteredSubmissions.forEach(s => {
      try {
        const data = typeof s.data === 'string' ? JSON.parse(s.data) : s.data;
        const val = data[crit];
        if (val && typeof val === 'string' && !val.startsWith('data:image') && val.trim()) {
          const short = val.length > 25 ? val.substring(0, 25) + '…' : val;
          counts[short] = (counts[short] || 0) + 1;
        }
      } catch (e) { }
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  };

  // --- Radar de Riesgo (Multidimensional) ---
  const getRadarData = () => {
    const categories = ['municipio', 'identificacion', 'espacio_protegido', 'clasificacion_suelo', 'incidencia'];
    return categories.map(cat => {
      const data = getChartData(cat);
      const intensity = data.reduce((sum, d) => sum + d.value, 0);
      return {
        subject: cat === 'identificacion' ? 'Especie' : cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' '),
        A: intensity,
        fullMark: Math.max(totalReports, 10),
      };
    });
  };
  const radarData = getRadarData();

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Operaciones');
    sheet.columns = [
      { header: 'ID', key: 'id' },
      { header: 'Expediente', key: 'exp_num' },
      { header: 'Modelo', key: 'template' },
      { header: 'Usuario', key: 'user' },
      { header: 'Estado', key: 'status' },
      { header: 'Fecha Registro', key: 'date' },
      { header: 'Datos Operativos', key: 'data' }
    ];
    filteredSubmissions.forEach(s => {
      sheet.addRow({
        id: s.id,
        exp_num: s.expedient_number || 'S/N',
        template: s.template_name,
        user: s.user_email,
        status: s.status,
        date: s.submission_date,
        data: s.data
      });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Operaciones_AME_${new Date().getTime()}.xlsx`);
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
  const STATUS_COLORS = ['#10b981', '#f59e0b'];

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const paginatedSubmissions = filteredSubmissions
    .sort((a, b) => new Date(b.submission_date).getTime() - new Date(a.submission_date).getTime())
    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-48 gap-4">
        <Loader2 className="animate-spin text-black/20" size={64} />
        <p className="text-[10px] font-black uppercase tracking-widest text-black/20">Generando Analítica...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0FDFD] -mt-12 -mx-6 px-12 py-12">
      <div className="max-w-[1600px] mx-auto space-y-10">

        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Live Terminal</span>
              <span className="text-zinc-400 font-bold text-[10px] uppercase tracking-widest">Control Center v4.0</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-zinc-900 leading-none">
              Panel de <span className="text-emerald-500">Operaciones</span>
            </h1>
            <p className="text-zinc-500 font-extrabold uppercase tracking-[0.3em] text-[10px] mt-4">
              Unidad de Agentes de Medio Ambiente · Canarias
            </p>
          </div>
          <div className="flex flex-wrap gap-4 bg-white/40 backdrop-blur-md p-4 rounded-3xl border border-white/50 shadow-xl">
            <div className="flex items-center gap-2 px-4 py-3 bg-white rounded-2xl border border-black/5">
              <CalendarDays size={16} className="text-emerald-600" />
              <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="outline-none text-[10px] font-black uppercase bg-transparent" />
              <span className="text-zinc-300">|</span>
              <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="outline-none text-[10px] font-black uppercase bg-transparent" />
            </div>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-6 py-4 bg-white border border-black/5 rounded-2xl outline-none text-[10px] font-black uppercase tracking-widest shadow-sm">
              <option value="all">Todas las Plantillas</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        {/* Navegación de vista */}
        <div className="flex gap-4 p-2 bg-zinc-200/50 rounded-[2.5rem] border border-black/5 w-fit backdrop-blur-md">
          {[
            { id: 'stats', label: 'Estadísticas', icon: <BarChart3 size={16} /> },
            { id: 'map', label: 'Mapa de Riesgo', icon: <MapIcon size={16} /> },
            { id: 'registry', label: 'Registro Operativo', icon: <FileText size={16} /> }
          ].map(ficha => (
            <button key={ficha.id} onClick={() => setViewMode(ficha.id as any)}
              className={`flex items-center gap-3 px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === ficha.id ? 'bg-zinc-900 text-white shadow-2xl' : 'text-zinc-500 hover:text-zinc-900 hover:bg-white/50'}`}>
              {ficha.icon}{ficha.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── VISTA ESTADÍSTICAS ── */}
          {viewMode === 'stats' && (
            <motion.div key="stats" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="space-y-8">

              {/* KPIs top row */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Total Actuaciones', value: totalReports, icon: <Target size={22} />, color: 'bg-zinc-900 text-white', sub: 'expedientes' },
                  { label: 'Enviados', value: enviados, icon: <Send size={22} />, color: 'bg-emerald-600 text-white', sub: `${enviadosPct}% del total` },
                  { label: 'Borradores', value: borradores, icon: <Clock size={22} />, color: 'bg-amber-500 text-white', sub: 'pendientes envío' },
                  { label: 'Este Mes', value: thisMonth, icon: <Calendar size={22} />, color: 'bg-blue-600 text-white', sub: new Date().toLocaleDateString('es-ES', { month: 'long' }) },
                  { label: 'Agentes Únicos', value: uniqueAgents, icon: <Users size={22} />, color: 'bg-violet-600 text-white', sub: 'activos' },
                  { label: 'Plantillas Activas', value: templates.length, icon: <FileText size={22} />, color: 'bg-teal-600 text-white', sub: 'modelos' },
                ].map((kpi, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    className={`${kpi.color} rounded-[2rem] p-6 shadow-xl flex flex-col justify-between min-h-[130px] relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/10 -mr-8 -mt-8" />
                    <div className="relative z-10">
                      <div className="opacity-70 mb-3">{kpi.icon}</div>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">{kpi.label}</p>
                      <p className="text-4xl font-black tracking-tight leading-none">{kpi.value}</p>
                      <p className="text-[9px] font-bold opacity-50 mt-1">{kpi.sub}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Gráficos principales */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Timeline de actividad — 30 días */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-black/5 shadow-xl">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h4 className="text-lg font-black tracking-tight text-zinc-900">Actividad Diaria</h4>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Informes procesados — últimos 30 días</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-black text-zinc-400 uppercase">Actuaciones</span>
                    </div>
                  </div>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timelineData}>
                        <defs>
                          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#aaa' }}
                          interval={4} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#aaa' }} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold' }} />
                        <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#grad)" dot={false} activeDot={{ r: 6, fill: '#10b981' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pie: estado de informes */}
                <div className="bg-white p-8 rounded-[3rem] border border-black/5 shadow-xl flex flex-col">
                  <h4 className="text-lg font-black tracking-tight text-zinc-900 mb-1">Estado de Registros</h4>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6">Enviados vs. Borradores</p>
                  <div className="flex-1 flex items-center justify-center">
                    {statusData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            onClick={(data) => {
                              if (data && data.name) {
                                setSelectedChartFilter({ key: 'status', value: data.name });
                              }
                            }}
                            className="cursor-pointer outline-none"
                          >
                            {statusData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', fontSize: '11px', fontWeight: 'bold' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-zinc-300 font-black text-sm uppercase">Sin datos</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {[{ label: 'Enviados', val: enviados, color: '#10b981' }, { label: 'Borradores', val: borradores, color: '#f59e0b' }].map((d, i) => (
                      <div key={i} className="bg-zinc-50 rounded-2xl p-4 text-center border border-black/5">
                        <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ backgroundColor: d.color }} />
                        <p className="text-lg font-black">{d.val}</p>
                        <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">{d.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Segunda fila de gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Gráficos de Métricas de Campo Multi-Panel */}
                <div className="lg:col-span-3">
                  <div className="flex items-center justify-between mb-8 cursor-default">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black/30 mb-1">Análisis Multidimensional</p>
                      <h3 className="text-2xl font-black tracking-tight text-zinc-900">Métricas Detalladas de Campo</h3>
                    </div>
                    {selectedChartFilter && (
                      <button
                        onClick={() => setSelectedChartFilter(null)}
                        className="px-6 py-3 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/20 flex items-center gap-3 hover:bg-red-700 transition-all hover:-translate-y-1"
                      >
                        <X size={14} /> Quitar Filtro: {selectedChartFilter.value}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {criteriaOptions.map((crit, idx) => {
                      const data = getMetricData(crit.key);
                      return (
                        <motion.div
                          key={crit.key}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className={`bg-white p-6 rounded-[2.5rem] border border-black/5 shadow-lg flex flex-col transition-all ${selectedChartFilter?.key === crit.key ? 'ring-2 ring-emerald-500 scale-[1.02]' : ''}`}
                        >
                          <div className="mb-4">
                            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">{crit.label}</h4>
                            <div className="w-8 h-1 bg-emerald-500 rounded-full mt-1.5" />
                          </div>

                          <div className="h-[200px] flex-1">
                            {data.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data} layout="vertical" margin={{ left: -20, right: 10 }}>
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                  <XAxis type="number" hide />
                                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#666' }} width={80} />
                                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} />
                                  <Bar
                                    dataKey="value"
                                    fill={COLORS[idx % COLORS.length]}
                                    radius={[0, 4, 4, 0]}
                                    barSize={12}
                                    onClick={(entry) => {
                                      if (entry && entry.name) {
                                        setSelectedChartFilter({ key: crit.key, value: entry.name });
                                      }
                                    }}
                                    className="cursor-pointer"
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="h-full flex items-center justify-center text-zinc-300">
                                <p className="text-[9px] font-black uppercase">Sin datos registrados</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Ranking de plantillas */}
                <div className="bg-white p-8 rounded-[3rem] border border-black/5 shadow-xl">
                  <h4 className="text-lg font-black tracking-tight text-zinc-900 mb-1">Ranking Plantillas</h4>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6">Por volumen de expedientes</p>
                  <div className="space-y-5">
                    {templateChartData.slice(0, 5).map((d, i) => (
                      <div
                        key={i}
                        className={`space-y-2 cursor-pointer group/item p-2 rounded-xl transition-all ${selectedChartFilter?.key === 'template_name' && selectedChartFilter?.value === d.name ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'hover:bg-zinc-50'}`}
                        onClick={() => setSelectedChartFilter({ key: 'template_name', value: d.name })}
                      >
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-zinc-600 truncate max-w-[65%] group-hover/item:text-emerald-600 transition-colors">{d.name}</span>
                          <span className="text-zinc-900">{d.value} ({totalReports > 0 ? ((d.value / totalReports) * 100).toFixed(0) : 0}%)</span>
                        </div>
                        <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: totalReports > 0 ? `${(d.value / totalReports) * 100}%` : '0%' }}
                            transition={{ duration: 0.8, delay: i * 0.1 }}
                            className="h-full rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        </div>
                      </div>
                    ))}
                    {templateChartData.length === 0 && (
                      <p className="text-zinc-300 text-[10px] font-black uppercase text-center py-8">Sin datos</p>
                    )}
                  </div>

                  {/* Log de actividad reciente */}
                  <div className="mt-8 pt-6 border-t border-black/5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                      Actividad reciente
                    </p>
                    <div className="space-y-3">
                      {filteredSubmissions.slice(0, 4).map((s, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === 'enviado' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-zinc-700 truncate">{s.template_name}</p>
                            <p className="text-[9px] text-zinc-400">{new Date(s.submission_date).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      ))}
                      {filteredSubmissions.length === 0 && <p className="text-zinc-300 text-[9px] font-black uppercase text-center">Sin actividad</p>}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── VISTA MAPA ── */}
          {viewMode === 'map' && (
            <motion.div key="map" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="h-[800px] w-full bg-white rounded-[4rem] border-4 border-white shadow-3xl overflow-hidden relative">
              <MapContainer center={[28.6833, -17.8333]} zoom={11} style={{ height: '100%', width: '100%' }} className="z-0">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                {filteredSubmissions.map((s) => {
                  const coords = getSubmissionCoords(s);
                  if (!coords) return null;
                  const data = JSON.parse(s.data);
                  return (
                    <Marker
                      key={s.id}
                      position={coords as [number, number]}
                      icon={getMarkerIcon(s.template_id)}
                      eventHandlers={{
                        click: (e) => {
                          e.target.openPopup();
                        }
                      }}
                    >
                      <LeafletTooltip direction="top" offset={[0, -10]} opacity={1}>
                        <div className="p-1 px-2 font-black text-[9px] uppercase tracking-widest bg-white rounded-lg shadow-sm border border-black/5">
                          {s.template_name}
                        </div>
                      </LeafletTooltip>
                      <Popup closeButton={false} className="custom-popup">
                        <div className="p-4 rounded-[2rem] min-w-[220px] font-sans">
                          <div className="flex items-center gap-3 mb-3 border-b border-black/5 pb-2">
                            <div className={`w-3 h-3 rounded-full ${s.template_id === 1 ? 'bg-emerald-500' : s.template_id === 2 ? 'bg-red-500' : 'bg-amber-500'} shadow-sm`} />
                            <p className="font-black text-[11px] uppercase tracking-tighter text-zinc-900">{s.template_name}</p>
                          </div>
                          <div className="space-y-2 mb-5">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-zinc-400 font-bold uppercase">Agente</span>
                              <span className="text-zinc-900 font-black truncate max-w-[120px]">{s.user_email?.split('@')[0]}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-zinc-400 font-bold uppercase">Fecha</span>
                              <span className="text-zinc-900 font-black">{new Date(s.submission_date).toLocaleDateString('es-ES')}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-zinc-400 font-bold uppercase">Exp.</span>
                              <span className="text-emerald-600 font-black">{s.expedient_number || 'PENDIENTE'}</span>
                            </div>
                            {data.paraje && (
                              <div className="mt-2 pt-2 border-t border-black/5 text-[10px] text-zinc-500 italic font-medium flex items-center gap-1">
                                <MapPin size={10} className="text-zinc-400" /> {data.paraje}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setSelectedReport(s)}
                            className="w-full py-3 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-black/20 flex items-center justify-center gap-2"
                          >
                            <Eye size={12} />
                            Ficha Técnica
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
              <div className="absolute bottom-10 left-10 z-[1000] bg-white/90 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white shadow-2xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Datos en mapa</p>
                <p className="text-3xl font-black">{filteredSubmissions.filter(s => getSubmissionCoords(s)).length}</p>
                <p className="text-[9px] text-zinc-400 font-bold mt-1">de {filteredSubmissions.length} informes con GPS</p>
              </div>
            </motion.div>
          )}

          {/* ── VISTA REGISTRO ── */}
          {viewMode === 'registry' && (
            <motion.div key="registry" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
              className="bg-white rounded-[4rem] border border-black/5 shadow-2xl overflow-hidden">
              <div className="p-10 border-b border-black/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-2xl font-black tracking-tighter text-zinc-900">Historial de Operaciones</h3>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{filteredSubmissions.length} expedientes registrados</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={16} />
                  <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
                    className="pl-11 pr-5 py-3 bg-zinc-50 border border-black/5 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-black/5 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                      <th className="px-8 py-5">ID Expediente</th>
                      <th className="px-8 py-5">Modelo</th>
                      <th className="px-8 py-5">Agente</th>
                      <th className="px-8 py-5">Fecha</th>
                      <th className="px-8 py-5">Estado</th>
                      <th className="px-8 py-5">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSubmissions.map((s) => (
                      <tr key={s.id} className="border-t border-black/5 hover:bg-emerald-50/50 transition-all group">
                        <td className="px-8 py-6 text-xs font-black text-zinc-500 tracking-tight">#{s.expedient_number || s.id.toString().padStart(5, '0')}</td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                              <FileText size={15} />
                            </div>
                            <span className="text-sm font-black tracking-tight text-zinc-900">{s.template_name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-xs font-bold text-zinc-500">{s.user_email}</td>
                        <td className="px-8 py-6 text-xs font-bold text-zinc-400">{new Date(s.submission_date).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit ${s.status === 'enviado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {s.status === 'enviado' ? <CheckCircle size={10} /> : <Clock size={10} />}
                            {s.status === 'enviado' ? 'Enviado' : 'Borrador'}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex gap-2">
                            <button onClick={() => setSelectedReport(s)} className="p-2.5 bg-zinc-100 text-zinc-400 rounded-xl hover:bg-zinc-900 hover:text-white transition-all"><Eye size={16} /></button>
                            <button onClick={() => handleDelete(s.id)} className="p-2.5 bg-red-50 text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-8 border-t border-black/5 bg-zinc-50/50 flex justify-between items-center">
                <div className="flex items-center gap-6">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Pág. {currentPage}/{Math.max(1, totalPages)} · {filteredSubmissions.length} registros</span>
                  <button onClick={exportToExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-widest rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-all">
                    <Download size={12} /> Exportar Excel
                  </button>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="px-6 py-2.5 bg-white border border-black/5 rounded-xl text-[10px] font-black uppercase disabled:opacity-30 hover:shadow-md transition-all">Anterior</button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                    className="px-6 py-2.5 bg-white border border-black/5 rounded-xl text-[10px] font-black uppercase disabled:opacity-30 hover:shadow-md transition-all">Siguiente</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal de informe */}
      <AnimatePresence>
        {selectedReport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col">
              <div className="p-8 bg-zinc-900 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black tracking-tight">{selectedReport.template_name}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">{selectedReport.expedient_number || 'Sin Expediente'} · {selectedReport.user_email}</p>
                </div>
                <button onClick={() => setSelectedReport(null)} className="text-white/40 hover:text-white"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 space-y-6" ref={reportRef}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pdf-content p-6 bg-white">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-black/30 border-b border-black/5 pb-2">Datos del Informe</h4>
                    {Object.entries(JSON.parse(selectedReport.data)).map(([key, val]: [string, any]) => {
                      if (typeof val === 'string' && val.startsWith('data:image')) return null;
                      return (
                        <div key={key}>
                          <p className="text-[9px] font-black uppercase tracking-widest text-black/40 mb-0.5">{key}</p>
                          <p className="text-sm font-bold text-black/80">{val || '—'}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-black/30 border-b border-black/5 pb-2">Metadatos</h4>
                    <div><p className="text-[9px] font-black uppercase tracking-widest text-black/40 mb-0.5">Estado</p>
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${selectedReport.status === 'enviado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{selectedReport.status}</span>
                    </div>
                    <div><p className="text-[9px] font-black uppercase tracking-widest text-black/40 mb-0.5">Fecha de envío</p>
                      <p className="text-sm font-bold">{selectedReport.sent_at ? new Date(selectedReport.sent_at).toLocaleString('es-ES') : 'No enviado'}</p>
                    </div>
                    {getSubmissionCoords(selectedReport) && (
                      <div className="h-44 rounded-2xl overflow-hidden border border-black/5">
                        <MapContainer center={getSubmissionCoords(selectedReport) as [number, number]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <Marker position={getSubmissionCoords(selectedReport) as [number, number]} />
                        </MapContainer>
                      </div>
                    )}
                    {selectedReport.photos && JSON.parse(selectedReport.photos).length > 0 && (
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-black/40 mb-2">Fotografías</p>
                        <div className="grid grid-cols-2 gap-2">
                          {JSON.parse(selectedReport.photos).map((photo: string, idx: number) => (
                            <img key={idx} src={photo} className="w-full h-24 object-cover rounded-xl border border-black/5" crossOrigin="anonymous" />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-black/5 bg-zinc-50 flex justify-between items-center">
                <button onClick={generatePDF} disabled={isGeneratingPDF}
                  className="px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs bg-zinc-100 text-black hover:bg-zinc-200 transition-all flex items-center gap-2">
                  {isGeneratingPDF ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Descargar PDF
                </button>
                <button onClick={() => setSelectedReport(null)} className="bg-black text-white px-10 py-3 rounded-2xl font-black uppercase tracking-widest text-xs">Cerrar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
