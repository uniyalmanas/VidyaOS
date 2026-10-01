import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  MessageSquare,
  Copy,
  ExternalLink,
  X,
  Check,
  Smartphone,
  Globe,
  Sparkles,
  Edit3
} from 'lucide-react';

export const WhatsAppShareModal: React.FC = () => {
  const { activeWhatsappModal, setActiveWhatsappModal, currentOrg } = useApp();
  const [messageText, setMessageText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  useEffect(() => {
    if (activeWhatsappModal) {
      setMessageText(activeWhatsappModal.message);
      setIsEditing(false);
    }
  }, [activeWhatsappModal]);

  if (!activeWhatsappModal) return null;

  const cleanPhone = activeWhatsappModal.phone.replace(/[^0-9]/g, '');
  // Ensure Indian country code prefix 91 if 10-digit number
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const handleCopy = () => {
    navigator.clipboard?.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWaMe = () => {
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  const handleOpenWhatsAppWeb = () => {
    const url = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  const handleSetPreset = (preset: 'fee' | 'absent' | 'report') => {
    if (preset === 'fee') {
      setMessageText(
        `Namaste Ji,\n\nThis is a gentle reminder from *${currentOrg.name}* regarding pending fee installment.\n\n` +
        `• Coaching: ${currentOrg.name}\n` +
        `• Pay via direct UPI: ${currentOrg.upiId}\n\n` +
        `Kindly settle the due amount or reply here with payment screenshot. Thank you!\n— Accounts Desk`
      );
    } else if (preset === 'absent') {
      setMessageText(
        `Namaste Ji,\n\nThis is to notify you that your ward was marked *ABSENT* in today's class at *${currentOrg.name}*.\n\n` +
        `Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}\n\n` +
        `Regular attendance is critical for academic consistency. Please ensure they attend upcoming lectures.\n— Office Desk, ${currentOrg.name}`
      );
    } else if (preset === 'report') {
      setMessageText(
        `Namaste Ji,\n\nRecent academic test performance report from *${currentOrg.name}* is now available.\n\n` +
        `Please log in to your Parent Portal at VidyaOS to view detailed marks analysis, percentile ranking and answer sheets.\n\n` +
        `— Academic Director, ${currentOrg.name}`
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#1E1F20] w-full max-w-lg rounded-2xl shadow-2xl border border-[#DADCE0] dark:border-[#3C4043] overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="bg-[#188038] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm">{activeWhatsappModal.title}</div>
              <div className="text-[11px] text-emerald-100 flex items-center gap-1">
                <span>Free 1-Tap Direct wa.me Integration</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveWhatsappModal(null)}
            className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-700/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Recipient info & preset buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DADCE0]/60 dark:border-[#3C4043] pb-3">
            <div>
              <span className="text-[#5F6368] dark:text-[#9AA0A6]">Recipient:</span>
              <div className="font-mono font-bold text-sm text-[#202124] dark:text-white mt-0.5">
                +{formattedPhone}
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleSetPreset('fee')}
                className="px-2 py-1 rounded-md bg-slate-100 dark:bg-[#282A2C] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[10px] font-semibold text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#188038] transition cursor-pointer"
              >
                Fee Preset
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset('absent')}
                className="px-2 py-1 rounded-md bg-slate-100 dark:bg-[#282A2C] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[10px] font-semibold text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#188038] transition cursor-pointer"
              >
                Absent Preset
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset('report')}
                className="px-2 py-1 rounded-md bg-slate-100 dark:bg-[#282A2C] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[10px] font-semibold text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#188038] transition cursor-pointer"
              >
                Report Preset
              </button>
            </div>
          </div>

          {/* Interactive Message Box with WhatsApp bubble theme */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
              <span className="font-semibold flex items-center gap-1">
                <Edit3 className="w-3 h-3 text-[#188038]" /> Message Preview (Editable)
              </span>
              <span>{messageText.length} characters</span>
            </div>

            <div className="bg-[#EFEAE2] dark:bg-[#111B21] p-3.5 rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] shadow-inner">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={6}
                className="w-full bg-white dark:bg-[#202C33] text-[#111B21] dark:text-[#E9EDEF] p-3 rounded-xl rounded-tl-none border border-emerald-200 dark:border-[#2A3942] text-xs font-sans focus:outline-none focus:ring-2 focus:ring-[#188038]/50 shadow-sm leading-relaxed resize-none"
                placeholder="Type your WhatsApp notification message..."
              />
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-2 px-1">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  Format with *bold*, _italics_, and bullets
                </span>
                <span>Ready for 1-Tap wa.me</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
            <button
              type="button"
              onClick={handleCopy}
              className="py-2.5 px-3 border border-[#DADCE0] dark:border-[#3C4043] rounded-xl text-xs font-semibold text-[#202124] dark:text-[#E8EAED] hover:bg-slate-50 dark:hover:bg-[#282A2C] transition flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#188038]" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsAppWeb}
              className="py-2.5 px-3 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer"
              title="Open WhatsApp Web on Desktop"
            >
              <Globe className="w-4 h-4" />
              <span>WhatsApp Web</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWaMe}
              className="py-2.5 px-3 bg-[#188038] hover:bg-[#137333] text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-700/20 cursor-pointer"
              title="Launch WhatsApp directly via wa.me"
            >
              <Smartphone className="w-4 h-4" />
              <span>Open wa.me</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
