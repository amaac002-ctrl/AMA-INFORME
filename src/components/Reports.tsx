import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  FileText, Search, Loader2, Clock, Tag, ArrowRight,
  AlertTriangle, Scale, Flame, Bird, Leaf, Droplets,
  Bug, Mountain, ShieldAlert, Syringe, Skull, Fish,
  FlaskConical, TreePine, Wind, Trash2
} from 'lucide-react';

interface ReportsProps {
  onSelectTemplate: (template: any) => void;
}

// Devuelve el icono de lucide-react más apropiado según el nombre del informe
const getTemplateIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('veneno') || n.includes('toxic') || n.includes('cebo')) return Skull;
  if (n.includes('plaguicida') || n.includes('biocida') || n.includes('fitosanitario')) return FlaskConical;
  if (n.includes('denuncia') || n.includes('infraccion') || n.includes('sancion') || n.includes('acta')) return Scale;
  if (n.includes('incendio') || n.includes('fuego') || n.includes('quema') || n.includes('incendi')) return Flame;
  if (n.includes('fauna') || n.includes('ave') || n.includes('pajaro') || n.includes('nido') || n.includes('cadaver')) return Bird;
  if (n.includes('pesca') || n.includes('pez') || n.includes('marino') || n.includes('acuatico')) return Fish;
  if (n.includes('flora') || n.includes('vegeta') || n.includes('planta') || n.includes('bosque')) return Leaf;
  if (n.includes('arboles') || n.includes('arbol') || n.includes('forestal') || n.includes('monte')) return TreePine;
  if (n.includes('vertido') || n.includes('agua') || n.includes('litoral') || n.includes('rio') || n.includes('efluente')) return Droplets;
  if (n.includes('plaga') || n.includes('insecto') || n.includes('invasora') || n.includes('coleoptera')) return Bug;
  if (n.includes('parque') || n.includes('espacio') || n.includes('natural') || n.includes('reserva') || n.includes('sendero')) return Mountain;
  if (n.includes('residuo') || n.includes('basura') || n.includes('vertedero') || n.includes('contaminacion')) return Trash2;
  if (n.includes('aire') || n.includes('ruido') || n.includes('atmos') || n.includes('emision')) return Wind;
  if (n.includes('inspeccion') || n.includes('control') || n.includes('vigilancia') || n.includes('patrulla')) return ShieldAlert;
  if (n.includes('medicamento') || n.includes('clorhidrato') || n.includes('alprazolam') || n.includes('droga')) return Syringe;
  return FileText; // default
};

// Devuelve el color de fondo del círculo según el tipo de informe
const getTemplateColor = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('veneno') || n.includes('toxic') || n.includes('cebo') || n.includes('plaguicida')) return 'bg-red-700 shadow-red-700/30 group-hover:bg-red-600 group-hover:shadow-red-600/40';
  if (n.includes('denuncia') || n.includes('infraccion') || n.includes('sancion') || n.includes('acta')) return 'bg-blue-700 shadow-blue-700/30 group-hover:bg-blue-600 group-hover:shadow-blue-600/40';
  if (n.includes('incendio') || n.includes('fuego') || n.includes('quema')) return 'bg-orange-600 shadow-orange-600/30 group-hover:bg-orange-500 group-hover:shadow-orange-500/40';
  if (n.includes('fauna') || n.includes('ave') || n.includes('pajaro') || n.includes('cadaver')) return 'bg-emerald-700 shadow-emerald-700/30 group-hover:bg-emerald-600 group-hover:shadow-emerald-600/40';
  if (n.includes('pesca') || n.includes('pez') || n.includes('marino')) return 'bg-cyan-700 shadow-cyan-700/30 group-hover:bg-cyan-600 group-hover:shadow-cyan-600/40';
  if (n.includes('flora') || n.includes('vegeta') || n.includes('arboles') || n.includes('forestal')) return 'bg-green-700 shadow-green-700/30 group-hover:bg-green-600 group-hover:shadow-green-600/40';
  if (n.includes('residuo') || n.includes('basura') || n.includes('vertido')) return 'bg-stone-600 shadow-stone-600/30 group-hover:bg-stone-500 group-hover:shadow-stone-500/40';
  return 'bg-zinc-900 shadow-black/20 group-hover:bg-emerald-600 group-hover:shadow-emerald-600/40';
};

// Devuelve el color del botón de acción según el tipo
const getActionColor = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('veneno') || n.includes('toxic') || n.includes('cebo') || n.includes('plaguicida')) return 'bg-red-700 group-hover:bg-red-600 group-hover:shadow-red-600/40';
  if (n.includes('denuncia') || n.includes('infraccion') || n.includes('acta')) return 'bg-blue-700 group-hover:bg-blue-600 group-hover:shadow-blue-600/40';
  if (n.includes('incendio') || n.includes('fuego')) return 'bg-orange-600 group-hover:bg-orange-500 group-hover:shadow-orange-500/40';
  if (n.includes('fauna') || n.includes('ave') || n.includes('cadaver')) return 'bg-emerald-700 group-hover:bg-emerald-600 group-hover:shadow-emerald-600/40';
  if (n.includes('pesca') || n.includes('marino')) return 'bg-cyan-700 group-hover:bg-cyan-600 group-hover:shadow-cyan-600/40';
  if (n.includes('flora') || n.includes('arboles') || n.includes('forestal')) return 'bg-green-700 group-hover:bg-green-600 group-hover:shadow-green-600/40';
  return 'bg-zinc-900 group-hover:bg-emerald-600 group-hover:shadow-emerald-600/40';
};

export default function Reports({ onSelectTemplate }: ReportsProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2 text-zinc-900">Modelos Oficiales de Informe</h1>
          <p className="text-zinc-500 font-extrabold uppercase tracking-widest text-[10px]">Unidad de Agentes de Medio Ambiente · Archivo Central</p>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={18} />
          <input
            type="text"
            placeholder="Buscar plantilla..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-black/5 rounded-2xl outline-none focus:ring-2 focus:ring-black transition-all text-sm font-bold shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="animate-spin text-black/20" size={48} />
          <p className="text-[10px] font-black uppercase tracking-widest text-black/20">Cargando plantillas...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template, index) => {
            const Icon = getTemplateIcon(template.name);
            const iconColor = getTemplateColor(template.name);
            const actionColor = getActionColor(template.name);

            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                onClick={() => onSelectTemplate(template)}
                className="group bg-white rounded-[3rem] border-2 border-black/5 shadow-sm hover:shadow-2xl hover:border-black/10 transition-all cursor-pointer relative overflow-hidden flex flex-col h-[310px]"
              >
                {/* Reflejo decorativo de fondo */}
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full -mr-24 -mt-24 opacity-10 transition-all duration-700 group-hover:opacity-20 group-hover:scale-110"
                  style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }}
                />

                {/* Contenido */}
                <div className="relative z-10 flex flex-col h-full p-8">

                  {/* Fila superior: icono circular + badge */}
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-[72px] h-[72px] rounded-full flex items-center justify-center shadow-xl transition-all duration-500 group-hover:scale-110 ${iconColor}`}>
                      <Icon size={30} className="text-white" />
                    </div>
                    <span className="px-3 py-1.5 bg-zinc-100 text-zinc-500 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-black/5">
                      <Tag size={9} />
                      {template.type === 'text' ? 'Dinámico' : 'Plantilla'}
                    </span>
                  </div>

                  {/* Nombre y fecha */}
                  <div className="flex-1">
                    <h3 className="text-xl font-black tracking-tight mb-2 group-hover:text-emerald-700 transition-colors leading-tight text-zinc-900">
                      {template.name}
                    </h3>
                    <p className="text-[10px] font-bold text-zinc-400 flex items-center gap-1.5">
                      <Clock size={10} />
                      {new Date(template.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>

                  {/* CTA: botón redondo de acción */}
                  <div className="flex items-center justify-between pt-5 border-t border-black/5 mt-auto">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover:text-emerald-600 transition-colors">
                      Iniciar Expediente
                    </span>
                    <div className={`w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:shadow-xl group-active:scale-95 ${actionColor}`}>
                      <ArrowRight size={21} className="text-white transition-transform duration-300 group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filteredTemplates.length === 0 && (
            <div className="col-span-full py-24 text-center">
              <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6 text-black/10">
                <FileText size={44} />
              </div>
              <h3 className="text-xl font-black tracking-tight mb-2">No se encontraron plantillas</h3>
              <p className="text-black/40 text-xs font-bold">Intenta con otro término de búsqueda o contacta con administración.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
