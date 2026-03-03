import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Send,
  User,
  Briefcase,
  DollarSign,
  FileText,
  Mail,
  Loader2,
  CheckCircle2,
  MapPin,
  Camera,
  Trash2,
  Info,
  Eye,
  Settings,
  Lock,
  X,
  Save,
  Navigation,
  Mic,
  MicOff,
  Wand2,
  ChevronLeft,
  CloudOff,
  Cloud,
  Download,
  PenTool,
  RotateCcw,
  Upload
} from 'lucide-react';
import { improveText, askAi, analyzeImage } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import SignatureCanvas from 'react-signature-canvas';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { PROTECTED_SPACES_GEOJSON } from '../constants/geoData';
import EmailComposeModal from './EmailComposeModal';

interface DocumentFormProps {
  template: any;
  user: any;
  onBack: () => void;
}

export default function DocumentForm({ template, user, onBack }: DocumentFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [locating, setLocating] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>({});
  const [isRecording, setIsRecording] = useState<string | null>(null);
  const [improving, setImproving] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [mapImage, setMapImage] = useState<string | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isDownloadingWord, setIsDownloadingWord] = useState(false);
  const sigCanvasRefs = useRef<Map<string, any>>(new Map());
  const previewRef = useRef<HTMLDivElement>(null);

  const generatePDFBase64 = async (): Promise<string | null> => {
    if (!previewRef.current) return null;
    try {
      const element = previewRef.current.querySelector('.pdf-content') as HTMLElement;
      if (!element) throw new Error('Content element not found');
      await new Promise(resolve => setTimeout(resolve, 800)); // More time for images

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      return canvas.toDataURL('application/pdf');
    } catch (error) {
      console.error('Error generating PDF Base64:', error);
      return null;
    }
  };

  const generatePDF = async () => {
    if (!previewRef.current) return;
    setIsGeneratingPDF(true);
    try {
      const element = previewRef.current.querySelector('.pdf-content') as HTMLElement;
      if (!element) throw new Error('Content element not found');
      await new Promise(resolve => setTimeout(resolve, 500));
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Informe_${template.name}_${new Date().getTime()}.pdf`);
    } catch (error) {
      alert('Error al generar el PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const downloadWordDoc = async () => {
    setIsDownloadingWord(true);
    try {
      const payload = { ...formData, template_id: template.id, photos };
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Error del servidor');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(formData.expediente || template.name).replace(/[\/\\?%*:|"<>]/g, '-')}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Error al generar el documento Word');
    } finally {
      setIsDownloadingWord(false);
    }
  };

  const getFilledTemplate = () => {
    let content = template?.content || '';
    if (!fields || fields.length === 0) return content;

    fields.forEach(field => {
      const value = formData[field.field_id] || `[${field.label}]`;
      // Escapa caracteres especiales de regex para evitar bloqueos si el label tiene () o []
      const escapedLabel = field.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Soporta múltiples delimitadores: <label>, {label}, (label)
      const regexPatterns = [
        `<${escapedLabel}>`,
        `{${escapedLabel}}`,
        `\\(${escapedLabel}\\)`
      ];

      regexPatterns.forEach(pattern => {
        const regex = new RegExp(pattern, 'gi');
        content = content.replace(regex, value);
      });
    });
    return content;
  };
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load draft
  useEffect(() => {
    const draft = localStorage.getItem(`draft_${template.id}`);
    if (draft) {
      setFormData(JSON.parse(draft));
    }
  }, [template.id]);

  // Save draft
  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      localStorage.setItem(`draft_${template.id}`, JSON.stringify(formData));
    }
  }, [formData, template.id]);

  useEffect(() => {
    fetchConfig();
    captureLocation();
  }, [template.id]);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`/api/templates/${template.id}/config`);
      const data = await res.json();
      setFields(data);

      // Initialize formData if empty
      if (Object.keys(formData).length === 0) {
        const initial: any = {};
        data.forEach((f: any) => {
          if (f.type === 'select' && f.options) {
            const opts = JSON.parse(f.options);
            initial[f.field_id] = opts[0];
          } else if (f.type === 'gps' || f.type === 'signature' || f.type === 'image') {
            initial[f.field_id] = '';
          } else if (f.type === 'date') {
            initial[f.field_id] = new Date().toISOString().split('T')[0];
          } else if (f.type === 'time') {
            initial[f.field_id] = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } else {
            initial[f.field_id] = '';
          }
        });
        setFormData(initial);
      }
    } catch (error) {
      console.error("Error fetching template config:", error);
    }
  };

  const captureLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);

    // Auto-fill Date and Time regardless of GPS
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;

        // Find the field that looks like coordinates
        const coordField = fields.find(f =>
          f.type === 'gps' ||
          f.field_id.toLowerCase().includes('coord') ||
          f.label.toLowerCase().includes('coord') ||
          f.field_id.toLowerCase().includes('gps') ||
          f.label.toLowerCase().includes('gps')
        );

        const dateField = fields.find(f => f.type === 'date' || f.label.toLowerCase().includes('fecha'));
        const timeField = fields.find(f => f.type === 'time' || f.label.toLowerCase().includes('hora'));

        setFormData(prev => {
          const updated = { ...prev };
          if (coordField) updated[coordField.field_id] = coords;
          else updated.coordenadas = coords;

          if (dateField) updated[dateField.field_id] = currentDate;
          if (timeField) updated[timeField.field_id] = currentTime;

          return updated;
        });

        setLocating(false);
        fetchLocationDetails(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocating(false);
        // Still fill date/time even if GPS fails
        setFormData(prev => {
          const updated = { ...prev };
          const dateField = fields.find(f => f.type === 'date' || f.label.toLowerCase().includes('fecha'));
          const timeField = fields.find(f => f.type === 'time' || f.label.toLowerCase().includes('hora'));
          if (dateField) updated[dateField.field_id] = currentDate;
          if (timeField) updated[timeField.field_id] = currentTime;
          return updated;
        });
      }
    );
  };

  const fetchLocationDetails = async (lat: number, lon: number) => {
    try {
      // Fetch Address
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await res.json();

      // Fetch Weather (Open-Meteo - No API Key required)
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
      const weatherData = await weatherRes.json();

      let weatherDesc = '';
      if (weatherData.current_weather) {
        const temp = weatherData.current_weather.temperature;
        const code = weatherData.current_weather.weathercode;
        // Simple mapping for weather codes
        const codes: any = { 0: 'Despejado', 1: 'Principalmente despejado', 2: 'Parcialmente nublado', 3: 'Nublado', 45: 'Niebla', 48: 'Niebla escarchada', 51: 'Llovizna ligera', 61: 'Lluvia ligera', 71: 'Nieve ligera', 95: 'Tormenta' };
        weatherDesc = `${codes[code] || 'Nubosidad variable'}, ${temp}°C`;
      }

      if (data.address) {
        setFormData(prev => ({
          ...prev,
          municipio: data.address.city || data.address.town || data.address.village || prev.municipio,
          provincia: data.address.province || data.address.state || prev.provincia,
          paraje: data.address.suburb || data.address.neighbourhood || data.display_name.split(',')[0],
          condiciones_meteo: weatherDesc || prev.condiciones_meteo,
          meterologia: weatherDesc || prev.meterologia
        }));
      }
    } catch (e) {
      console.error("Error fetching location details", e);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setPhotos(prev => [...prev, base64].slice(0, 4));

      // Analyze photo with AI
      setAnalyzingPhoto(true);
      try {
        const analysis = await analyzeImage(base64);
        if (analysis) {
          setFormData(prev => ({
            ...prev,
            identificacion: analysis.especie || prev.identificacion,
            condiciones_meteo: analysis.clima || prev.condiciones_meteo,
            desc_lugar: analysis.entorno || prev.desc_lugar,
            observaciones: prev.observaciones ? `${prev.observaciones}\n\nAI Analysis: ${analysis.observaciones}` : analysis.observaciones
          }));
        }
      } catch (err) {
        console.error("Error analyzing photo", err);
      } finally {
        setAnalyzingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const startRecording = (fieldId: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.onstart = () => setIsRecording(fieldId);
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.toLowerCase().startsWith("ia") || transcript.toLowerCase().startsWith("oye ia")) {
        setImproving(fieldId);
        const answer = await askAi(transcript, JSON.stringify(formData));
        setFormData(prev => ({ ...prev, [fieldId]: prev[fieldId] ? `${prev[fieldId]} ${answer}` : answer }));
        setImproving(null);
      } else {
        setImproving(fieldId);
        const improved = await improveText(transcript);
        setFormData(prev => ({ ...prev, [fieldId]: prev[fieldId] ? `${prev[fieldId]} ${improved}` : improved }));
        setImproving(null);
      }
    };
    recognition.onerror = () => setIsRecording(null);
    recognition.onend = () => setIsRecording(null);
    recognition.start();
  };

  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleSaveDraft = async () => {
    setIsDraftSaving(true);
    try {
      const submission = {
        template_id: template.id,
        user_id: user.id,
        data: formData,
        photos,
        modulo: template.name.toLowerCase(),
        status: 'borrador'
      };
      const res = await fetch('/api/submit-dynamic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission)
      });
      if (res.ok) {
        alert("Borrador guardado correctamente.");
      }
    } catch (error) {
      alert("Error al guardar borrador.");
    } finally {
      setIsDraftSaving(false);
    }
  };

  const handleSend = async () => {
    // Validate signature if required
    const signatureField = fields.find(f => f.type === 'signature');
    if (signatureField && signatureField.required && !formData[signatureField.field_id]) {
      alert("La firma es obligatoria para enviar el informe.");
      return;
    }

    setReviewText(getFilledTemplate());
    setIsReviewing(true);
  };

  const handleFinalSubmit = async () => {
    setIsEmailModalOpen(true);
  };

  const onSendEmail = async (emailData: { to: string; subject: string; message: string; format: 'pdf' | 'word' }) => {
    setLoading(true);
    try {
      let pdf_base64 = null;
      if (emailData.format === 'pdf') {
        const base64 = await generatePDFBase64();
        if (base64) pdf_base64 = base64;
      }

      const submission = {
        template_id: template.id,
        user_id: user.id,
        data: { ...formData, final_text: reviewText },
        photos,
        modulo: template.name.toLowerCase(),
        status: 'enviado',
        email_to: emailData.to.split(',').map(e => e.trim()),
        email_subject: emailData.subject,
        email_message: emailData.message,
        format: emailData.format,
        pdf_base64
      };

      const response = await fetch('/api/submit-dynamic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      });

      if (response.ok) {
        setSuccess(true);
        localStorage.removeItem(`draft_${template.id}`);
        setTimeout(() => {
          setSuccess(false);
          onBack();
        }, 3000);
      } else {
        const error = await response.json();
        alert('Error al enviar: ' + (error.message || 'Desconocido'));
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error de conexión al enviar el informe');
    } finally {
      setLoading(false);
    }
  };

  const finalizeSubmission = async () => {
    setLoading(true);

    const submission = {
      template_id: template.id,
      user_id: user.id,
      data: { ...formData, final_text: reviewText },
      photos,
      modulo: template.name.toLowerCase(),
      email_to: recipients
    };

    try {
      const res = await fetch('/api/submit-dynamic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission)
      });
      if (res.ok) {
        setSuccess(true);
        localStorage.removeItem(`draft_${template.id}`);
        setTimeout(() => onBack(), 2000);
      }
    } catch (error) {
      alert("Error al enviar. El informe se ha guardado como borrador local.");
    } finally {
      setLoading(false);
    }
  };

  const getInputClass = (value: any) => {
    const isEmpty = !value || (typeof value === 'string' && value.trim() === '');
    return `w-full px-4 py-3 rounded-2xl border border-black/5 focus:ring-2 focus:ring-black outline-none transition-all text-sm font-bold ${isEmpty ? 'bg-emerald-50/30' : 'bg-zinc-50'}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[3rem] shadow-2xl border border-black/5 overflow-hidden"
      >
        <div className="bg-black p-10 text-white flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
          <div className="flex items-center gap-6 relative z-10">
            <button onClick={onBack} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all">
              <ChevronLeft size={24} />
            </button>
            <div>
              <h2 className="text-3xl font-black tracking-tighter uppercase text-white">Actuación Operativa</h2>
              <p className="text-emerald-400 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                {template.name} · {isOnline ? 'CONEXIÓN ESTABLE' : 'MODO OFFLINE'}
              </p>
            </div>
          </div>
          <div className="text-right relative z-10 flex items-center gap-4">
            <button
              type="button"
              onClick={captureLocation}
              disabled={locating}
              className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
            >
              {locating ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
              {locating ? 'Localizando...' : 'Capturar GPS'}
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${previewMode ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              <Eye size={14} />
              {previewMode ? 'Editar Datos' : 'Vista Previa'}
            </button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Agente Responsable</p>
              <p className="text-sm font-black">{user.email}</p>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="p-10 space-y-12">
          <AnimatePresence mode="wait">
            {isReviewing ? (
              <motion.div
                key="review"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-8"
              >
                <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Eye size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-emerald-900">Revisión Final</h3>
                    <p className="text-emerald-700/60 text-[10px] font-black uppercase tracking-widest">Edita el texto final si es necesario antes de enviar</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-4">Texto del Informe (Editable)</label>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className="w-full h-[400px] p-10 bg-zinc-50 border border-black/5 rounded-[2.5rem] font-serif text-lg leading-relaxed outline-none focus:ring-2 focus:ring-black transition-all shadow-inner"
                  />
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black uppercase tracking-widest">Destinatarios por Email</h4>
                    <span className="text-[10px] font-bold text-black/30">{recipients.length} seleccionados</span>
                  </div>

                  <div className="flex gap-4">
                    <input
                      type="email"
                      placeholder="añadir email..."
                      value={newRecipient}
                      onChange={(e) => setNewRecipient(e.target.value)}
                      className="flex-1 px-6 py-4 bg-zinc-50 border border-black/5 rounded-2xl outline-none focus:ring-2 focus:ring-black font-bold text-sm"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newRecipient && !recipients.includes(newRecipient)) {
                            setRecipients([...recipients, newRecipient]);
                            setNewRecipient('');
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newRecipient && !recipients.includes(newRecipient)) {
                          setRecipients([...recipients, newRecipient]);
                          setNewRecipient('');
                        }
                      }}
                      className="bg-black text-white px-8 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                    >
                      Añadir
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {recipients.map(email => (
                      <span key={email} className="bg-zinc-100 px-4 py-2 rounded-xl text-[10px] font-bold flex items-center gap-2 group">
                        {email}
                        <button
                          onClick={() => setRecipients(recipients.filter(r => r !== email))}
                          className="text-black/20 hover:text-red-500 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-8 border-t border-black/5">
                  <button
                    type="button"
                    onClick={() => setIsReviewing(false)}
                    className="px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs text-black/40 hover:text-black transition-all"
                  >
                    Volver a Editar Datos
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={loading}
                    className="bg-emerald-600 text-white px-16 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-600/20 flex items-center gap-3 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    Confirmar y Enviar Informe
                  </button>
                </div>
              </motion.div>
            ) : previewMode ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-zinc-50 p-10 rounded-[2rem] border border-black/5 font-serif leading-relaxed text-lg whitespace-pre-wrap shadow-inner">
                  {getFilledTemplate()}
                </div>
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      const element = document.createElement("a");
                      const file = new Blob([getFilledTemplate()], { type: 'text/plain' });
                      element.href = URL.createObjectURL(file);
                      element.download = `${template.name}_${new Date().getTime()}.txt`;
                      document.body.appendChild(element);
                      element.click();
                    }}
                    className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center gap-3"
                  >
                    <Download size={18} />
                    Descargar Informe (.txt)
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                {fields.map((field) => (
                  <div key={field.id} className={field.type === 'textarea' ? 'md:col-span-2 lg:col-span-3' : ''}>
                    <div className="flex justify-between items-center mb-3 px-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">{field.label}</label>
                      {(field.type === 'gps' || field.field_id.toLowerCase().includes('coord') || field.label.toLowerCase().includes('coord')) && (
                        <button
                          type="button"
                          onClick={captureLocation}
                          className="text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-lg border border-emerald-100 transition-all"
                        >
                          <Navigation size={12} />
                          Auto-GPS
                        </button>
                      )}
                    </div>

                    <div className="relative group">
                      {field.type === 'select' ? (
                        <select
                          className={getInputClass(formData[field.field_id])}
                          value={formData[field.field_id] || ''}
                          onChange={e => setFormData({ ...formData, [field.field_id]: e.target.value })}
                        >
                          {JSON.parse(field.options || '[]').map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.type === 'gps' ? (
                        <div className="relative">
                          <input
                            type="text"
                            className={getInputClass(formData[field.field_id])}
                            value={formData[field.field_id] || ''}
                            placeholder="0.000000, 0.000000"
                            onChange={e => setFormData({ ...formData, [field.field_id]: e.target.value })}
                          />
                          <button
                            type="button"
                            onClick={captureLocation}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 hover:text-emerald-700"
                          >
                            {locating ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                          </button>
                        </div>
                      ) : field.type === 'signature' ? (
                        <div className="space-y-3">
                          <div className="bg-white border-2 border-dashed border-black/10 rounded-3xl overflow-hidden relative group">
                            <SignatureCanvas
                              penColor='black'
                              canvasProps={{
                                className: "w-full h-48 cursor-crosshair",
                                style: { width: '100%', height: '192px' }
                              }}
                              ref={(ref) => {
                                if (ref) {
                                  sigCanvasRefs.current.set(field.field_id, ref);
                                }
                              }}
                            />
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => {
                                  const canvas = sigCanvasRefs.current.get(field.field_id);
                                  if (canvas) {
                                    canvas.clear();
                                    setFormData({ ...formData, [field.field_id]: '' });
                                  }
                                }}
                                className="p-2 bg-white shadow-lg rounded-xl text-red-500 hover:bg-red-50 transition-all"
                              >
                                <RotateCcw size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const canvas = sigCanvasRefs.current.get(field.field_id);
                                  if (canvas && !canvas.isEmpty()) {
                                    const dataUrl = canvas.getTrimmedCanvas().toDataURL('image/png');
                                    setFormData({ ...formData, [field.field_id]: dataUrl });
                                    alert('Firma capturada correctamente');
                                  }
                                }}
                                className="p-2 bg-black text-white shadow-lg rounded-xl hover:bg-zinc-800 transition-all"
                              >
                                <PenTool size={14} />
                              </button>
                            </div>
                          </div>
                          {formData[field.field_id] && (
                            <p className="text-[8px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1 ml-4">
                              <CheckCircle2 size={10} />
                              Firma Capturada
                            </p>
                          )}
                        </div>
                      ) : field.type === 'image' ? (
                        <div className="space-y-4">
                          {!formData[field.field_id] ? (
                            <label className="w-full h-40 border-2 border-dashed border-black/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-2 hover:border-black/20 hover:bg-zinc-50 transition-all cursor-pointer group">
                              <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center text-black/30 group-hover:scale-110 transition-transform">
                                <Camera size={20} />
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-black/30">Cargar o Capturar Imagen</span>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                      setFormData({ ...formData, [field.field_id]: ev.target?.result as string });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                          ) : (
                            <div className="relative aspect-video rounded-[2.5rem] overflow-hidden border border-black/5 group">
                              <img
                                src={formData[field.field_id]}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, [field.field_id]: '' })}
                                className="absolute top-4 right-4 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-red-500 hover:bg-white hover:scale-110 transition-all shadow-lg"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          rows={4}
                          className={getInputClass(formData[field.field_id])}
                          value={formData[field.field_id] || ''}
                          onChange={e => setFormData({ ...formData, [field.field_id]: e.target.value })}
                        />
                      ) : (
                        <input
                          type={field.type}
                          className={getInputClass(formData[field.field_id])}
                          value={formData[field.field_id] || ''}
                          onChange={e => setFormData({ ...formData, [field.field_id]: e.target.value })}
                        />
                      )}

                      {(field.type === 'text' || field.type === 'textarea') && (
                        <div className="absolute right-3 bottom-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => startRecording(field.field_id)}
                            className={`p-2 rounded-xl ${isRecording === field.field_id ? 'bg-red-500 text-white animate-pulse' : 'bg-white shadow-md text-black/40 hover:text-black'}`}
                          >
                            {isRecording === field.field_id ? <MicOff size={14} /> : <Mic size={14} />}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              setImproving(field.field_id);
                              const improved = await improveText(formData[field.field_id]);
                              setFormData(prev => ({ ...prev, [field.field_id]: improved }));
                              setImproving(null);
                            }}
                            disabled={improving === field.field_id || !formData[field.field_id]}
                            className="p-2 rounded-xl bg-white shadow-md text-black/40 hover:text-emerald-600 disabled:opacity-50"
                          >
                            {improving === field.field_id ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-8 bg-zinc-50 p-10 rounded-[3rem] border border-black/5">
            <div className="flex justify-between items-center px-2">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-1 block">Evidencia Fotográfica</label>
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Reconocimiento por visión artificial activado</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg">IA Operativa</span>
                <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1 bg-zinc-200 text-zinc-600 rounded-lg">{photos.length}/4 IMÁGENES</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {photos.map((p, i) => (
                <div key={i} className="relative aspect-square rounded-[2rem] overflow-hidden border-4 border-white shadow-xl group transition-all hover:scale-[1.02]">
                  <img src={p} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                      className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center hover:bg-red-700 transition-all transform scale-75 group-hover:scale-100"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}

              {photos.length < 4 && (
                <label className="aspect-square rounded-[2rem] border-4 border-dashed border-zinc-300 bg-white flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50 hover:border-emerald-500/30 transition-all group shadow-sm">
                  {analyzingPhoto ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <Loader2 size={40} className="animate-spin text-emerald-600" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Wand2 size={16} className="text-emerald-400" />
                        </div>
                      </div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Escaneando...</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                        <Camera size={28} className="text-zinc-400 group-hover:text-white" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-emerald-600 transition-colors">Capturar Imagen</p>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              )}
            </div>
          </div>

          <div className="mt-12 space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-4">Ubicación en el Mapa</label>
            <div className="h-64 rounded-[2.5rem] overflow-hidden border border-black/5 shadow-sm">
              <MapContainer
                center={formData.coordenadas?.split(',').map((c: string) => parseFloat(c.trim())) || [28.6833, -17.8333]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {formData.coordenadas && (
                  <Marker position={formData.coordenadas.split(',').map((c: string) => parseFloat(c.trim()))} />
                )}
              </MapContainer>
            </div>
          </div>

          <div className="pt-10 border-t border-black/5 flex flex-wrap justify-end gap-4">
            <button
              type="button"
              onClick={() => {
                setReviewText(getFilledTemplate());
                setShowPreview(true);
              }}
              className="px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-zinc-100 text-black/60 hover:bg-zinc-200 transition-all flex items-center gap-2"
            >
              <Eye size={16} />
              Vista Previa
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isDraftSaving}
              className="px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-white border border-black/10 text-black hover:bg-zinc-50 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isDraftSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Guardar Borrador
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={loading}
              className="bg-black text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-800 transition-all shadow-xl shadow-black/10 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Enviar Informe
            </button>
          </div>
        </form>
      </motion.div>

      <AnimatePresence>
        {showPreview && (
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
                <h3 className="text-xl font-black tracking-tight">Vista Previa del Informe</h3>
                <button onClick={() => setShowPreview(false)} className="text-white/40 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-12 space-y-8" ref={previewRef}>
                <div className="bg-white p-12 rounded-[3rem] border border-black/5 shadow-sm space-y-8 pdf-content">
                  {/* Cabecera Dinámica basada en la Plantilla */}
                  {template.header_image ? (
                    <div className="w-full pb-8 border-b-4 border-black/10">
                      <img
                        src={template.header_image}
                        alt="Cabecera Oficial"
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pb-8 border-b-4 border-emerald-600">
                      <div className="flex items-center gap-6">
                        <div className="relative">
                          <div className="absolute inset-0 bg-emerald-500/10 blur-xl rounded-full" />
                          <img
                            src="/logo.png"
                            alt="Logo Cabildo"
                            className="w-20 h-20 rounded-full border-2 border-emerald-100 shadow-xl object-contain relative z-10 bg-white"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/canary-agents-seal/400/400'; }}
                          />
                        </div>
                        <div>
                          <p className="font-black text-lg uppercase tracking-tighter text-zinc-900 leading-tight">Cuerpo de Agentes</p>
                          <p className="text-sm font-bold text-zinc-500 leading-tight">Medio Ambiente Canarias</p>
                          <p className="text-sm font-black text-emerald-600 uppercase tracking-widest mt-1">Unidad de Actuación Operativa</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="bg-zinc-900 text-white px-4 py-1.5 rounded-lg mb-2 inline-block">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em]">{template.category || 'INFORME OFICIAL'}</p>
                        </div>
                        <h2 className="text-2xl font-black tracking-tighter uppercase text-zinc-900 leading-none mb-1">{template.name}</h2>
                        <p className="text-xs font-bold text-zinc-400">Expediente: <span className="text-emerald-600">{(formData as any).exp_num || 'PENDIENTE'}</span></p>
                        <p className="text-[10px] font-bold text-zinc-500 mt-2 uppercase tracking-widest">{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                      </div>
                    </div>
                  )}

                  {reviewText ? (
                    <div className="font-serif text-lg leading-[1.8] whitespace-pre-wrap text-zinc-800 text-justify px-4">
                      {reviewText}
                    </div>
                  ) : (
                    // Plantilla basada en campos → mostrar como tabla de datos del documento
                    <div className="border border-black/10 rounded-2xl overflow-hidden">
                      <div className="bg-zinc-900 text-white px-5 py-3">
                        <p className="text-[10px] font-black uppercase tracking-widest">Datos del Expediente</p>
                      </div>
                      {fields.filter((f: any) => f.type !== 'image' && f.type !== 'signature' && formData[f.field_id]).map((field: any) => (
                        <div key={field.field_id} className="grid grid-cols-5 py-3 px-5 border-b border-black/5 last:border-0 even:bg-zinc-50">
                          <p className="col-span-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 self-center">{field.label}</p>
                          <p className="col-span-3 text-sm font-bold text-zinc-900">{String(formData[field.field_id])}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Coordenadas GPS — sin mapa para no bloquear contenido */}
                  {formData.coordenadas && (
                    <div className="bg-zinc-50 border border-black/5 rounded-2xl p-5 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1 flex items-center gap-2">
                          <MapPin size={11} />
                          Ubicación GPS
                        </p>
                        <p className="font-mono text-sm font-bold text-zinc-900">{formData.coordenadas}</p>
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${formData.coordenadas}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                      >
                        <Navigation size={12} />
                        Ver Mapa
                      </a>
                    </div>
                  )}

                  {photos.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-black/40">Evidencias Fotográficas</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {photos.map((photo, idx) => (
                          <img
                            key={idx}
                            src={photo}
                            className="w-full h-48 object-cover rounded-[2rem] border border-black/5"
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dynamic Image Fields */}
                  {fields.filter(f => f.type === 'image' && formData[f.field_id]).map((field, idx) => (
                    <div key={idx} className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-black/40">{field.label}</h4>
                      <div className="aspect-video w-full rounded-[2rem] overflow-hidden border border-black/5 shadow-sm">
                        <img
                          src={formData[field.field_id]}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                        />
                      </div>
                    </div>
                  ))}

                  <div className="pt-12 border-t-2 border-zinc-100 flex justify-between items-start relative">
                    {/* Sello de Agua / Oficial */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
                      <img src="/logo.png" className="w-96 h-96 grayscale" alt="" />
                    </div>

                    <div className="relative z-10">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6 underline decoration-emerald-500 decoration-2 underline-offset-4">Firma Digital del Agente</p>
                      <div className="w-56 h-32 border-2 border-dashed border-zinc-200 rounded-2xl flex items-center justify-center italic text-zinc-300 transition-all bg-zinc-50/50">
                        {formData[fields.find(f => f.type === 'signature')?.field_id] ? (
                          <img
                            src={formData[fields.find(f => f.type === 'signature')?.field_id]}
                            className="h-full object-contain p-4 mix-blend-multiply"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <ShieldCheck size={24} className="opacity-20" />
                            <span className="text-[10px] font-black uppercase tracking-tighter">Pendiente de Firma</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        <p className="text-xs font-black text-zinc-900 uppercase">{user.email?.split('@')[0]}</p>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Agente Colaborador ID: {user.id || '0042'}</p>
                      </div>
                    </div>

                    <div className="text-right relative z-10">
                      <div className="mb-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 underline decoration-emerald-500 decoration-2 underline-offset-4 mb-4">Validación Institucional</p>
                        <div className="inline-block p-4 border-2 border-emerald-600 rounded-full rotate-[-12deg] opacity-80 shadow-lg bg-white">
                          <div className="w-24 h-24 rounded-full border-4 border-double border-emerald-600 flex flex-col items-center justify-center text-emerald-600">
                            <p className="text-[8px] font-black uppercase leading-none">Cuerpo de</p>
                            <p className="text-[10px] font-black uppercase leading-none my-0.5">Agentes</p>
                            <div className="w-10 h-0.5 bg-emerald-600 my-1" />
                            <p className="text-[8px] font-black uppercase leading-none">Canarias</p>
                            <p className="text-[7px] font-bold opacity-70 mt-1 uppercase">Validado</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Código de Verificación</p>
                      <p className="text-[10px] font-mono text-zinc-300 mt-1 select-all hover:text-emerald-500 transition-colors">AME-DOC-{new Date().getTime().toString(36).toUpperCase()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 space-y-6 no-pdf">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black uppercase tracking-widest">Destinatarios por Email</h4>
                    <span className="text-[10px] font-bold text-black/30">{recipients.length} seleccionados</span>
                  </div>

                  <div className="flex gap-4">
                    <input
                      type="email"
                      placeholder="añadir email..."
                      value={newRecipient}
                      onChange={(e) => setNewRecipient(e.target.value)}
                      className="flex-1 px-6 py-4 bg-zinc-50 border border-black/5 rounded-2xl outline-none focus:ring-2 focus:ring-black font-bold text-sm"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newRecipient && !recipients.includes(newRecipient)) {
                            setRecipients([...recipients, newRecipient]);
                            setNewRecipient('');
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newRecipient && !recipients.includes(newRecipient)) {
                          setRecipients([...recipients, newRecipient]);
                          setNewRecipient('');
                        }
                      }}
                      className="bg-black text-white px-8 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                    >
                      Añadir
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {recipients.map(email => (
                      <span key={email} className="bg-zinc-100 px-4 py-2 rounded-xl text-[10px] font-bold flex items-center gap-2 group">
                        {email}
                        <button
                          onClick={() => setRecipients(recipients.filter(r => r !== email))}
                          className="text-black/20 hover:text-red-500 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-8 border-t border-black/5 bg-zinc-50 flex justify-between items-center flex-wrap gap-4">
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-black/40 hover:text-black transition-all"
                  >
                    Cerrar
                  </button>
                  {/* PDF generation button – ensure preview content is fully rendered before capture */}
                  <button
                    onClick={generatePDF}
                    disabled={isGeneratingPDF}
                    className="px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs bg-zinc-100 text-black hover:bg-zinc-200 transition-all flex items-center gap-2"
                  >
                    {isGeneratingPDF ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    PDF
                  </button>
                  <button
                    onClick={downloadWordDoc}
                    disabled={isDownloadingWord}
                    className="px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-all flex items-center gap-2"
                  >
                    {isDownloadingWord ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                    Descargar Word
                  </button>
                </div>
                <button
                  onClick={handleFinalSubmit}
                  disabled={loading}
                  className="bg-emerald-600 text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center gap-3 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  Enviar Ahora
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <div className="bg-white p-12 rounded-[4rem] text-center max-w-sm shadow-2xl">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle2 size={48} />
              </div>
              <h3 className="text-3xl font-black tracking-tighter mb-4">¡Informe Enviado!</h3>
              <p className="text-black/40 font-bold text-sm leading-relaxed">Los datos han sido registrados correctamente en el sistema central.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <EmailComposeModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSend={onSendEmail}
        attachmentName={`Informe_${template.name}`}
        initialTo={recipients.join(', ')}
        initialSubject={`Informe Oficial: ${template.name}`}
        initialMessage={`Se adjunta el informe correspondiente a la actuación operativa.\n\nExpediente: ${formData.expediente || 'S/N'}\nTipo: ${template.name}`}
      />
    </div>
  );
}
