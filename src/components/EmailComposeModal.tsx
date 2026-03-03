import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Mail, MessageSquare, Tag, Copy, Check, FileText, Briefcase } from 'lucide-react';

interface EmailComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: { to: string; subject: string; message: string; format: 'pdf' | 'word' }) => void;
  initialTo?: string;
  initialSubject?: string;
  initialMessage?: string;
  attachmentName: string;
}

export default function EmailComposeModal({
  isOpen,
  onClose,
  onSend,
  initialTo = '',
  initialSubject = '',
  initialMessage = '',
  attachmentName
}: EmailComposeModalProps) {
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [message, setMessage] = useState(initialMessage);
  const [format, setFormat] = useState<'pdf' | 'word'>('pdf');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    onSend({ to, subject, message, format });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-black/5"
        >
          <div className="bg-black p-8 text-white flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                <Mail size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Componer Envío</h3>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Preparando documentación oficial</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-black/40 flex items-center gap-2">
                <Mail size={12} /> Destinatarios (separados por coma)
              </label>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="ejemplo@correo.com, otro@correo.com"
                className="w-full px-4 py-3 rounded-xl border border-black/10 focus:ring-2 focus:ring-black outline-none transition-all text-sm bg-zinc-50/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-black/40 flex items-center gap-2">
                <Tag size={12} /> Asunto
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-black/10 focus:ring-2 focus:ring-black outline-none transition-all text-sm bg-zinc-50/50 font-bold"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-black/40 flex items-center gap-2">
                <Tag size={12} /> Formato del Adjunto
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setFormat('pdf')}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest ${format === 'pdf' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-black/5 bg-zinc-50 text-zinc-400'}`}
                >
                  <FileText size={14} /> Informe PDF
                </button>
                <button
                  onClick={() => setFormat('word')}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest ${format === 'word' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-black/5 bg-zinc-50 text-zinc-400'}`}
                >
                  <Briefcase size={14} /> Informe Word
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/40 flex items-center gap-2">
                  <MessageSquare size={12} /> Mensaje
                </label>
                <button
                  onClick={handleCopy}
                  className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1 hover:text-emerald-700 transition-colors"
                >
                  {copied ? <Check size={10} /> : <Copy size={10} />}
                  {copied ? 'Copiar' : 'Copiar'}
                </button>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-black/10 focus:ring-2 focus:ring-black outline-none transition-all text-sm bg-zinc-50/50 resize-none"
              />
            </div>

            <div className={`p-4 rounded-2xl border flex items-center gap-4 transition-colors ${format === 'pdf' ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${format === 'pdf' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-blue-500 shadow-blue-500/20'}`}>
                <FileText size={18} />
              </div>
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${format === 'pdf' ? 'text-emerald-600/60' : 'text-blue-600/60'}`}>Archivo Adjunto</p>
                <p className={`text-sm font-bold ${format === 'pdf' ? 'text-emerald-900' : 'text-blue-900'}`}>{attachmentName}.{format === 'pdf' ? 'pdf' : 'docx'}</p>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={onClose}
                className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-black/40 hover:bg-zinc-100 transition-all font-sans"
              >
                Cancelar
              </button>
              <button
                onClick={handleSend}
                className="flex-[2] bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all shadow-xl shadow-black/10 font-sans"
              >
                <Send size={18} /> Enviar {format.toUpperCase()}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
