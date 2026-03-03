import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Plus,
  Upload,
  FileText,
  Settings,
  Trash2,
  Save,
  X,
  ChevronRight,
  ChevronDown,
  GripVertical,
  Info,
  Eye,
  Download,
  Wand2,
  Loader2,
  Zap,
  MapPin,
  Camera,
  List
} from 'lucide-react';

interface AdminProps {
  user: any;
}

export default function Admin({ user }: AdminProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    content: '',
    type: 'text',
    fields: [] as any[],
    header_image: null as string | null,
    original_doc: null as string | null
  });
  const [parsing, setParsing] = useState(false);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);

  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'system' | 'reports' | 'users' | 'audit'>('templates');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'agente' });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchTemplates();
    fetchSystemHealth();
    fetchErrorLogs();
    fetchAllSubmissions();
    fetchUsers();
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/audit');
      const data = await res.json();
      setAuditLogs(data);
    } catch (e) { }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsersList(data);
    } catch (e) { }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password) return alert('Email y contraseña obligatorios');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        setNewUser({ email: '', password: '', role: 'agente' });
        fetchUsers();
      }
    } catch (e) { }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (e) { }
  };

  const fetchAllSubmissions = async () => {
    try {
      const res = await fetch('/api/submissions-dynamic');
      const data = await res.json();
      setAllSubmissions(data);
    } catch (e) { }
  };

  const handleDeleteSubmission = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este informe permanentemente?')) return;
    try {
      const res = await fetch(`/api/submissions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAllSubmissions(prev => prev.filter(s => s.id !== id));
      } else {
        const error = await res.json();
        alert('Error al borrar: ' + (error.message || 'Desconocido'));
      }
    } catch (e) {
      console.error('Error deleting submission:', e);
      alert('Error de red al borrar');
    }
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPDF(true);
    try {
      const element = reportRef.current.querySelector('.pdf-content') as HTMLElement;
      if (!element) throw new Error('Content element not found');

      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Informe_${selectedReport.template_name}_${selectedReport.expedient_number || 'S-N'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const res = await fetch('/api/system/health');
      const data = await res.json();
      setSystemHealth(data);
    } catch (e) { }
  };

  const fetchErrorLogs = async () => {
    try {
      const res = await fetch('/api/error-logs');
      const data = await res.json();
      setErrorLogs(data);
    } catch (e) { }
  };

  const handleFixIssue = async (issueId: string) => {
    try {
      const res = await fetch('/api/system/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId })
      });
      if (res.ok) {
        alert("Problema corregido.");
        fetchSystemHealth();
      }
    } catch (e) { }
  };

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

  const detectFields = (contentOverride?: any) => {
    setParsing(true);
    const textToParse = typeof contentOverride === 'string' ? contentOverride : newTemplate.content;

    // Improved regex to handle various brackets and spaces
    const regex = /[<{(]([^>})]+)[>})]/g;
    const matches = [...textToParse.matchAll(regex)];

    const detectedFields = matches.map((match, index) => {
      const label = match[1].trim();
      return {
        id: label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        label: label,
        type: label.toLowerCase().includes('fecha') ? 'date' :
          label.toLowerCase().includes('hora') ? 'time' :
            label.toLowerCase().includes('coord') || label.toLowerCase().includes('gps') ? 'gps' :
              label.toLowerCase().includes('firma') ? 'signature' :
                label.toLowerCase().includes('foto') || label.toLowerCase().includes('imagen') ? 'image' :
                  label.toLowerCase().includes('observaciones') || label.toLowerCase().includes('descrip') ? 'textarea' :
                    label.toLowerCase().includes('numero') || label.toLowerCase().includes('nº') ? 'number' : 'text',
        required: false,
        options: [],
        field_order: index,
        help_text: '',
        validation: ''
      };
    });

    // Remove duplicates by ID
    const uniqueFields = detectedFields.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);

    setNewTemplate(prev => ({ ...prev, content: textToParse, fields: uniqueFields }));
    setParsing(false);
  };

  const handleSaveTemplate = async () => {
    if (!newTemplate.name) {
      alert('Por favor, introduce un nombre para la plantilla');
      return;
    }

    // Auto-detect fields if empty
    if (newTemplate.fields.length === 0 && newTemplate.content) {
      detectFields();
    }

    try {
      const url = editingId ? `/api/templates/${editingId}` : '/api/templates';
      const method = editingId ? 'PUT' : 'POST';

      console.log(`Saving template via ${method} to ${url}`, newTemplate);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      });

      const data = await response.json();
      console.log("Save response:", data);

      if (data.success) {
        setIsCreating(false);
        setEditingId(null);
        setNewTemplate({ name: '', content: '', type: 'text', fields: [], header_image: null, original_doc: null });
        fetchTemplates();
        alert(editingId ? 'Plantilla actualizada correctamente' : 'Plantilla guardada correctamente');
      } else {
        alert('Error al guardar la plantilla: ' + data.message);
      }
    } catch (error: any) {
      console.error('Error saving template:', error);
      alert('Error de red al guardar la plantilla');
    }
  };

  const handleEditTemplate = async (template: any) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/templates/${template.id}/config`);
      const config = await res.json();

      setNewTemplate({
        name: template.name,
        content: template.content || '',
        type: template.type,
        header_image: template.header_image || null,
        original_doc: template.original_doc || null,
        fields: config.map((f: any) => ({
          ...f,
          id: f.field_id,
          required: f.required === 1,
          options: f.options ? JSON.parse(f.options) : []
        }))
      });
      setEditingId(template.id);
      setIsCreating(true);
    } catch (error) {
      console.error('Error loading template for edit:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    const password = window.prompt('Introduce la contraseña de administrador para confirmar el borrado TOTAL (incluyendo todos sus informes):');
    if (!password) return;

    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();
      if (data.success) {
        fetchTemplates();
        fetchAllSubmissions(); // Refresh submissions too as they are deleted in cascade
      } else {
        alert(data.message || 'Error al eliminar la plantilla');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error de conexión');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2">Administración</h1>
          <p className="text-black/40 font-bold uppercase tracking-widest text-[10px]">Gestión de plantillas y configuración del sistema</p>
        </div>

        <button
          onClick={() => {
            setEditingId(null);
            setNewTemplate({ name: '', content: '', type: 'text', fields: [], header_image: null, original_doc: null });
            setIsCreating(true);
          }}
          className="bg-emerald-600 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-600/20 flex items-center gap-4 border border-emerald-500/50"
        >
          <Plus size={20} />
          Nueva Plantilla Operativa
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-12 p-2 bg-zinc-200/50 rounded-[2.5rem] border border-black/5 backdrop-blur-sm">
        {[
          { id: 'templates', label: 'Plantillas', icon: <FileText size={16} /> },
          { id: 'reports', label: 'Informes', icon: <List size={16} /> },
          { id: 'users', label: 'Usuarios', icon: <Settings size={16} /> },
          { id: 'audit', label: 'Auditoría', icon: <Info size={16} /> },
          { id: 'system', label: 'Sistema', icon: <Zap size={16} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-3 px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-zinc-900 text-white shadow-xl translate-y-[-2px]' : 'text-zinc-500 hover:text-zinc-900 hover:bg-white/50'}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'reports' ? (
        <div className="bg-white p-10 rounded-[3rem] border border-black/5 shadow-sm overflow-hidden">
          <h2 className="text-2xl font-black mb-8 tracking-tight">Todos los Informes Registrados</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/5">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/30">Expediente</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/30">Plantilla</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/30">Agente</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/30">Estado</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/30">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {allSubmissions.map((s) => (
                  <tr key={s.id} className="border-t border-black/5 hover:bg-zinc-50 transition-colors group">
                    <td className="px-8 py-6 text-xs font-black text-black/60">{s.expedient_number || '---'}</td>
                    <td className="px-8 py-6 text-sm font-black">{s.template_name}</td>
                    <td className="px-8 py-6 text-sm font-bold text-black/60">{s.user_email}</td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${s.status === 'enviado' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex gap-3">
                        <button
                          onClick={() => setSelectedReport(s)}
                          className="w-10 h-10 flex items-center justify-center bg-zinc-100 text-black/40 rounded-full hover:text-emerald-600 hover:bg-emerald-50 hover:scale-110 active:scale-95 transition-all shadow-sm"
                          title="Ver Informe"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteSubmission(s.id)}
                          className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-400 rounded-full hover:bg-red-100 hover:text-red-600 hover:scale-110 active:scale-95 transition-all shadow-sm"
                          title="Eliminar Informe"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {allSubmissions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-black/20 font-black uppercase tracking-widest text-xs">No hay informes registrados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'audit' ? (
        <div className="bg-white p-10 rounded-[3rem] border border-black/5 shadow-sm">
          <h2 className="text-2xl font-black mb-8 tracking-tight">Registro de Actividad (Auditoría)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/5">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/30">Fecha/Hora</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/30">Usuario</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/30">Acción</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/30">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-t border-black/5 hover:bg-zinc-50 transition-colors">
                    <td className="px-8 py-6 text-xs font-medium text-black/40">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-8 py-6 text-sm font-black text-zinc-600">{log.user_email}</td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${log.action === 'LOGIN' ? 'bg-emerald-100 text-emerald-600' :
                        log.action === 'DELETE' ? 'bg-red-100 text-red-600' :
                          'bg-zinc-100 text-zinc-600'
                        }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-black/80">{log.details}</td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-black/20 font-black uppercase tracking-widest text-xs">No hay actividad registrada</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'users' ? (
        <div className="space-y-12">
          <div className="bg-white p-10 rounded-[3rem] border border-black/5 shadow-sm">
            <h2 className="text-2xl font-black mb-8 tracking-tight">Crear Nuevo Usuario</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-4">Email / Login</label>
                <input
                  type="text"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-6 py-4 bg-zinc-50 border border-black/5 rounded-2xl outline-none focus:ring-2 focus:ring-black transition-all font-bold text-sm"
                  placeholder="Ej: Fran o email"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-4">Contraseña</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-6 py-4 bg-zinc-50 border border-black/5 rounded-2xl outline-none focus:ring-2 focus:ring-black transition-all font-bold text-sm"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-4">Rol</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-6 py-4 bg-zinc-50 border border-black/5 rounded-2xl outline-none focus:ring-2 focus:ring-black transition-all font-bold text-sm"
                >
                  <option value="agente">Agente (Consulta y Envío)</option>
                  <option value="admin">Administrador (Control Total)</option>
                </select>
              </div>
              <button
                onClick={handleCreateUser}
                className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all shadow-xl shadow-black/10"
              >
                Crear Usuario
              </button>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-black/5 shadow-sm">
            <h2 className="text-2xl font-black mb-8 tracking-tight">Usuarios Actuales</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/30">Email / Login</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/30">Rol</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/30">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => (
                    <tr key={u.id} className="border-t border-black/5 hover:bg-zinc-50 transition-colors">
                      <td className="px-8 py-6 text-sm font-black">{u.email}</td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${u.role?.toLowerCase() === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          disabled={u.email === 'Fran' || u.email === user.email}
                          className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-100 hover:text-red-600 transition-all disabled:opacity-30 disabled:hover:bg-red-50 disabled:hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'system' ? (
        <div className="space-y-12">
          <div className="bg-white p-10 rounded-[3rem] border border-black/5 shadow-sm">
            <h2 className="text-2xl font-black mb-8 tracking-tight">Estado de Salud</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {systemHealth?.issues.length === 0 ? (
                <div className="col-span-2 p-12 bg-emerald-50 rounded-[2rem] border border-emerald-100 text-center">
                  <p className="text-emerald-600 font-black uppercase tracking-widest text-sm">El sistema funciona perfectamente</p>
                </div>
              ) : (
                systemHealth?.issues.map((issue: any) => (
                  <div key={issue.id} className="p-8 bg-red-50 rounded-[2rem] border border-red-100 flex flex-col justify-between gap-6">
                    <div>
                      <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-[8px] font-black uppercase tracking-widest mb-4 inline-block">{issue.module}</span>
                      <h4 className="text-lg font-black tracking-tight text-red-900 mb-2">{issue.message}</h4>
                      <p className="text-red-700/60 text-xs font-bold">{issue.error}</p>
                    </div>
                    <button
                      onClick={() => handleFixIssue(issue.id)}
                      className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                    >
                      Corregir Función
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-black/5 shadow-sm">
            <h2 className="text-2xl font-black mb-8 tracking-tight">Logs de Errores</h2>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
              {errorLogs.map((log, i) => (
                <div key={i} className="p-6 bg-zinc-50 rounded-2xl border border-black/5">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-black/30">{new Date(log.timestamp).toLocaleString()}</span>
                    <span className="px-2 py-0.5 bg-zinc-200 rounded text-[8px] font-black uppercase tracking-widest text-black/60">{log.module}</span>
                  </div>
                  <p className="text-xs font-bold text-black/80">{log.error_message}</p>
                </div>
              ))}
              {errorLogs.length === 0 && (
                <p className="text-center py-12 text-black/20 font-black uppercase tracking-widest text-xs">No hay errores registrados</p>
              )}
            </div>
          </div>
        </div>
      ) : isCreating ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[3rem] shadow-2xl border border-black/5 overflow-hidden mb-12"
        >
          <div className="bg-zinc-900 p-8 text-white flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                <FileText size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">Creador de Modelos</h2>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Define la estructura y el formulario</p>
              </div>
            </div>
            <button onClick={() => setIsCreating(false)} className="text-white/40 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-4">Nombre del Informe</label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="w-full px-6 py-4 bg-zinc-50 border border-black/5 rounded-2xl outline-none focus:ring-2 focus:ring-black transition-all font-bold"
                  placeholder="Ej: Acta de Inspección de Vertidos"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center ml-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black/40">Cabecera del Documento</label>
                  <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 cursor-pointer">
                    <Camera size={12} />
                    {newTemplate.header_image ? 'Cambiar Cabecera' : 'Subir Imagen Cabecera'}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setNewTemplate({ ...newTemplate, header_image: event.target?.result as string });
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>
                {newTemplate.header_image ? (
                  <div className="relative group">
                    <img
                      src={newTemplate.header_image}
                      alt="Preview Cabecera"
                      className="w-full h-auto rounded-2xl border border-black/5 shadow-inner bg-zinc-50"
                    />
                    <button
                      onClick={() => setNewTemplate({ ...newTemplate, header_image: null })}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="w-full py-8 border-2 border-dashed border-black/5 rounded-2xl flex flex-col items-center justify-center text-black/20 gap-2">
                    <Plus size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Sin Cabecera Personalizada</span>
                  </div>
                )}
                <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest px-4">
                  * Si no subes una imagen, se usará la cabecera institucional por defecto.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center ml-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black/40">Contenido de la Plantilla</label>
                  <div className="flex gap-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 flex items-center gap-1.5 cursor-pointer">
                      <Upload size={12} />
                      Cargar Archivo
                      <input
                        type="file"
                        className="hidden"
                        accept=".txt,.doc,.docx"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          // Store original file as base64 for exact Word format preservation
                          const readerFile = new FileReader();
                          readerFile.onload = (event) => {
                            setNewTemplate(prev => ({ ...prev, original_doc: event.target?.result as string }));
                          };
                          readerFile.readAsDataURL(file);

                          if (file.name.endsWith('.docx')) {
                            const reader = new FileReader();
                            reader.onload = async (event) => {
                              const arrayBuffer = event.target?.result as ArrayBuffer;
                              try {
                                const result = await mammoth.extractRawText({ arrayBuffer });
                                detectFields(result.value);
                              } catch (err) {
                                console.error('Error parsing docx:', err);
                                alert('Error al procesar el archivo Word');
                              }
                            };
                            reader.readAsArrayBuffer(file);
                          } else {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const content = event.target?.result as string;
                              detectFields(content);
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                    </label>
                    {newTemplate.original_doc && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        Diseño Word Detectado
                      </span>
                    )}
                    <button
                      onClick={detectFields}
                      className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5"
                    >
                      <Wand2 size={12} />
                      Detectar Campos
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <textarea
                    rows={12}
                    value={newTemplate.content}
                    onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                    className="w-full px-6 py-4 bg-zinc-50 border border-black/5 rounded-2xl outline-none focus:ring-2 focus:ring-black transition-all font-mono text-sm"
                    placeholder="Escribe el texto de la plantilla. Usa <campo> para variables dinámicas.&#10;Ej: En el municipio de <Municipio>, a las <Hora>..."
                  />
                  <div className="absolute bottom-4 right-4 text-[10px] font-bold text-black/20 uppercase tracking-widest">
                    {newTemplate.content.length} caracteres
                  </div>
                </div>
                <p className="text-[10px] text-black/30 font-medium italic px-4">
                  * Los campos detectados entre &lt; &gt; se convertirán automáticamente en inputs del formulario.
                </p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-center justify-between ml-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/40">Configuración del Formulario</label>
                <span className="bg-zinc-100 px-3 py-1 rounded-full text-[8px] font-black text-black/40 uppercase tracking-widest">
                  {newTemplate.fields.length} Campos Detectados
                </span>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                {newTemplate.fields.map((field, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-zinc-50 p-6 rounded-3xl border border-black/5 space-y-4 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <GripVertical size={16} className="text-black/10" />
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => {
                            const updated = [...newTemplate.fields];
                            updated[index].label = e.target.value;
                            setNewTemplate({ ...newTemplate, fields: updated });
                          }}
                          className="bg-transparent font-black text-sm outline-none focus:text-emerald-600 transition-colors"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const updated = newTemplate.fields.filter((_, i) => i !== index);
                          setNewTemplate({ ...newTemplate, fields: updated });
                        }}
                        className="text-black/10 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-widest text-black/30 ml-2">Tipo de Campo</label>
                        <select
                          value={field.type}
                          onChange={(e) => {
                            const updated = [...newTemplate.fields];
                            updated[index].type = e.target.value;
                            setNewTemplate({ ...newTemplate, fields: updated });
                          }}
                          className="w-full px-4 py-2 bg-white border border-black/5 rounded-xl text-xs font-bold outline-none"
                        >
                          <option value="text">Texto Corto</option>
                          <option value="textarea">Texto Largo</option>
                          <option value="number">Número</option>
                          <option value="date">Fecha</option>
                          <option value="time">Hora</option>
                          <option value="gps">Coordenadas GPS</option>
                          <option value="image">Imagen / Captura</option>
                          <option value="signature">Firma Digital</option>
                          <option value="select">Selector</option>
                          <option value="checkbox">Checkbox</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-widest text-black/30 ml-2">Requerido</label>
                        <div className="flex items-center h-10 px-4 bg-white border border-black/5 rounded-xl">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => {
                              const updated = [...newTemplate.fields];
                              updated[index].required = e.target.checked;
                              setNewTemplate({ ...newTemplate, fields: updated });
                            }}
                            className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black"
                          />
                          <span className="ml-2 text-[10px] font-bold text-black/60">Obligatorio</span>
                        </div>
                      </div>
                    </div>

                    {field.type === 'select' && (
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-widest text-black/30 ml-2">Opciones (separadas por coma)</label>
                        <input
                          type="text"
                          value={Array.isArray(field.options) ? field.options.join(', ') : field.options}
                          onChange={(e) => {
                            const updated = [...newTemplate.fields];
                            updated[index].options = e.target.value.split(',').map(s => s.trim());
                            setNewTemplate({ ...newTemplate, fields: updated });
                          }}
                          className="w-full px-4 py-2 bg-white border border-black/5 rounded-xl text-xs font-bold outline-none"
                          placeholder="Opción 1, Opción 2, Opción 3"
                        />
                      </div>
                    )}
                  </motion.div>
                ))}

                <button
                  onClick={() => {
                    const newField = {
                      id: `field_${newTemplate.fields.length + 1}`,
                      label: 'Nuevo Campo',
                      type: 'text',
                      required: false,
                      options: [],
                      field_order: newTemplate.fields.length,
                      help_text: '',
                      validation: ''
                    };
                    setNewTemplate({ ...newTemplate, fields: [...newTemplate.fields, newField] });
                  }}
                  className="w-full py-4 border-2 border-dashed border-black/5 rounded-3xl text-black/20 hover:text-black hover:border-black/20 transition-all flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px]"
                >
                  <Plus size={16} />
                  Añadir Campo Manualmente
                </button>
              </div>
            </div>
          </div>

          <div className="p-8 bg-zinc-50 border-t border-black/5 flex justify-end gap-4">
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingId(null);
                setNewTemplate({ name: '', content: '', type: 'text', fields: [], header_image: null, original_doc: null });
              }}
              className="px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-black/40 hover:text-black transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={() => setShowTemplatePreview(true)}
              className="px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs bg-zinc-200 text-black hover:bg-zinc-300 transition-all flex items-center gap-2"
            >
              <Eye size={18} />
              Ver Vista Previa
            </button>
            <button
              onClick={handleSaveTemplate}
              className="bg-emerald-600 text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center gap-3"
            >
              <Save size={18} />
              {editingId ? 'Actualizar Plantilla' : 'Guardar Plantilla'}
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white p-6 rounded-[2rem] border border-black/5 shadow-sm flex items-center justify-between group hover:border-black/10 transition-all"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center text-black/40 group-hover:bg-black group-hover:text-white transition-all">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">{template.name}</h3>
                  <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest">
                    Creado el {new Date(template.created_at).toLocaleDateString()} · {template.type.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEditTemplate(template)}
                  className="p-3 rounded-xl hover:bg-zinc-100 text-black/40 hover:text-black transition-all"
                >
                  <Settings size={18} />
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="p-3 rounded-xl hover:bg-red-50 text-black/40 hover:text-red-500 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}

          {templates.length === 0 && !loading && (
            <div className="py-24 text-center bg-white rounded-[3rem] border border-black/5 border-dashed">
              <p className="text-black/20 font-black uppercase tracking-widest text-sm">No hay plantillas configuradas</p>
            </div>
          )}
        </div>
      )
      }
      <AnimatePresence>
        {selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 bg-zinc-900 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black tracking-tight">{selectedReport.template_name}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">{selectedReport.expedient_number || 'Sin Expediente'}</p>
                </div>
                <button onClick={() => setSelectedReport(null)} className="text-white/40 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-12 space-y-8" ref={reportRef}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pdf-content p-8 bg-white">
                  <div className="space-y-6">
                    <h4 className="text-xs font-black uppercase tracking-widest text-black/30 border-b border-black/5 pb-2">Datos del Informe</h4>
                    <div className="space-y-4">
                      {Object.entries(JSON.parse(selectedReport.data)).map(([key, val]: [string, any]) => {
                        if (typeof val === 'string' && val.startsWith('data:image')) return null;
                        return (
                          <div key={key}>
                            <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">{key}</p>
                            <p className="text-sm font-bold text-black/80">{val || '---'}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h4 className="text-xs font-black uppercase tracking-widest text-black/30 border-b border-black/5 pb-2">Metadatos</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Agente</p>
                        <p className="text-sm font-bold text-black/80">{selectedReport.user_email}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Fecha de Envío</p>
                        <p className="text-sm font-bold text-black/80">{selectedReport.sent_at ? new Date(selectedReport.sent_at).toLocaleString() : 'No enviado'}</p>
                      </div>
                    </div>

                    {selectedReport.photos && JSON.parse(selectedReport.photos).length > 0 && (
                      <div className="space-y-4 pt-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-black/30 border-b border-black/5 pb-2">Fotografías</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {JSON.parse(selectedReport.photos).map((photo: string, idx: number) => (
                            <img
                              key={idx}
                              src={photo}
                              className="w-full h-24 object-cover rounded-xl border border-black/5"
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-8 border-t border-black/5 bg-zinc-50 flex justify-between items-center">
                <button
                  onClick={generatePDF}
                  disabled={isGeneratingPDF}
                  className="px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs bg-zinc-100 text-black hover:bg-zinc-200 transition-all flex items-center gap-2"
                >
                  {isGeneratingPDF ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Descargar PDF
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="bg-black text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTemplatePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-100 w-full max-w-5xl max-h-[90vh] rounded-[4rem] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-10 bg-white border-b border-black/5 flex justify-between items-center no-pdf">
                <div>
                  <h3 className="text-3xl font-black tracking-tighter">Vista Previa del Modelo</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40 italic">El formato será exactamente este al ser enviado</p>
                </div>
                <button
                  onClick={() => setShowTemplatePreview(false)}
                  className="w-16 h-16 bg-zinc-100 text-black/20 hover:text-black rounded-full flex items-center justify-center transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-12 overflow-y-auto custom-scrollbar flex-1 bg-zinc-50">
                <div className="bg-white p-16 rounded-[4rem] shadow-sm border border-black/5 max-w-3xl mx-auto space-y-12">
                  {newTemplate.header_image ? (
                    <div className="w-full pb-8 border-b-4 border-black/10">
                      <img src={newTemplate.header_image} alt="Header Preview" className="w-full h-auto object-contain" />
                    </div>
                  ) : (
                    <div className="flex justify-between items-start border-b border-black/5 pb-8">
                      <div>
                        <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">{newTemplate.name || "Nombre del Informe"}</h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Informe Oficial de Actuación</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Fecha de Emisión</p>
                        <p className="text-sm font-black">{new Date().toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}

                  <div className="font-serif text-lg leading-relaxed whitespace-pre-wrap text-black/80">
                    {(() => {
                      let content = newTemplate.content || '';
                      newTemplate.fields.forEach(field => {
                        const regex = new RegExp(`<${field.label}>`, 'gi');
                        content = content.replace(regex, `[${field.label.toUpperCase()}]`);
                      });
                      return content;
                    })()}
                  </div>

                  {newTemplate.fields.some(f => f.type === 'gps') && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-black/40">Ubicación Geográfica (Simulación)</h4>
                      <div className="h-48 rounded-[2rem] overflow-hidden border border-black/5 bg-zinc-100 flex items-center justify-center">
                        <MapPin size={32} className="text-black/10" />
                      </div>
                    </div>
                  )}

                  {newTemplate.fields.some(f => f.type === 'image') && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-black/40">Evidencias Fotográficas (Simulación)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="w-full h-32 bg-zinc-100 rounded-[2rem] border border-black/5 flex items-center justify-center">
                          <Camera size={24} className="text-black/10" />
                        </div>
                        <div className="w-full h-32 bg-zinc-100 rounded-[2rem] border border-black/5 flex items-center justify-center">
                          <Camera size={24} className="text-black/10" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-10 border-t border-black/5 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-4">Firma del Agente</p>
                      <div className="w-48 h-24 border-b border-black/20 flex items-center justify-center italic text-black/20 text-xs text-center px-4">
                        [ESPACIO PARA FIRMA]
                      </div>
                      <p className="text-[10px] font-bold mt-2">{user.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Sello Digital</p>
                      <p className="text-[8px] font-mono text-black/20 mt-1">MODEL_VERIFIED_{new Date().getTime()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-white border-t border-black/5 flex justify-center">
                <button
                  onClick={() => setShowTemplatePreview(false)}
                  className="bg-black text-white px-12 py-4 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all flex items-center gap-3"
                >
                  Volver a la edición
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
