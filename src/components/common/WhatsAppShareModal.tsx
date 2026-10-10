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
  Edit3,
  Coins,
  Send,
  Loader2
} from 'lucide-react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { easings, tSpring, fadeUp, staggerContainerFast } from '../../lib/motion';
import { resolveEntitlements } from '../../lib/entitlements';
import { enqueueOutboundMessage } from '../../lib/messagingService';
import { canSendMessage, estimateCreditCost } from '../../lib/messagingUtils';
import { CHANNEL_META, MESSAGE_TEMPLATES, composeMessage } from '../../lib/messageTemplates';
import { MessageChannel, MessageTemplateId } from '../../types';

/** Modal shell: spring pop-in cascading header → presets → message box → actions. */
const waPanelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { ...tSpring, delayChildren: 0.05, staggerChildren: 0.07 }
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 6,
    transition: { duration: 0.16, ease: easings.inOut }
  }
};

export const WhatsAppShareModal: React.FC = () => {
  const { activeWhatsappModal, setActiveWhatsappModal, currentOrg, showToast } = useApp();
  const [messageText, setMessageText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [channel, setChannel] = useState<MessageChannel>('whatsapp');
  const [templateId, setTemplateId] = useState<MessageTemplateId | 'custom'>('custom');
  const [emailTo, setEmailTo] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);

  useEffect(() => {
    if (activeWhatsappModal) {
      setMessageText(activeWhatsappModal.message);
      setIsEditing(false);
      setChannel('whatsapp');
      setTemplateId('custom');
      setEmailTo('');
      setSending(false);
    }
  }, [activeWhatsappModal]);

  const cleanPhone = activeWhatsappModal ? activeWhatsappModal.phone.replace(/[^0-9]/g, '') : '';
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

  // G3 — automated cloud delivery (uses monthly message credits)
  const ent = resolveEntitlements(currentOrg);
  const creditCost = estimateCreditCost(channel, templateId);
  const creditCheck = canSendMessage(ent, currentOrg?.usage, undefined, creditCost);

  const handlePickTemplate = (id: MessageTemplateId | 'custom') => {
    setTemplateId(id);
    if (id !== 'custom') {
      setMessageText(composeMessage(id, {}, { orgName: currentOrg.name, upiId: currentOrg.upiId }, channel).body);
    }
  };

  const handleChannelChange = (c: MessageChannel) => {
    setChannel(c);
    if (templateId !== 'custom') {
      setMessageText(composeMessage(templateId, {}, { orgName: currentOrg.name, upiId: currentOrg.upiId }, c).body);
    }
  };

  const handleSendAutomated = async () => {
    if (!activeWhatsappModal || sending || !creditCheck.allowed) return;
    if (channel === 'email' && !emailTo.trim()) {
      showToast('Enter a recipient email address', 'error');
      return;
    }
    setSending(true);
    try {
      const result = await enqueueOutboundMessage(currentOrg.id, {
        channel,
        templateId,
        toPhone: channel === 'whatsapp' || channel === 'sms' ? activeWhatsappModal.phone : undefined,
        toEmail: channel === 'email' ? emailTo.trim() : undefined,
        body: messageText
      }, { entitlements: ent, usage: currentOrg?.usage });
      if (!result.ok) {
        showToast(
          result.error === 'quota'
            ? 'Monthly message credits exhausted — add the Cloud Messaging SKU'
            : 'Could not queue the message right now',
          'error'
        );
        return;
      }
      showToast(`Queued — ${CHANNEL_META[channel].label} will deliver it automatically`, 'success');
      setActiveWhatsappModal(null);
    } finally {
      setSending(false);
    }
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
    <AnimatePresence>
      {activeWhatsappModal && (
        <motion.div
          key="whatsapp-share-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: easings.outQuart }}
        >
          <motion.div
            variants={waPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-white dark:bg-[#1E1F20] w-full max-w-lg rounded-2xl shadow-2xl border border-[#DADCE0] dark:border-[#3C4043] overflow-hidden my-auto"
          >
            {/* Header */}
            <motion.div variants={fadeUp} className="bg-[#188038] text-white px-5 py-4 flex items-center justify-between">
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
            </motion.div>

            {/* Modal Body */}
            <motion.div variants={staggerContainerFast} className="p-5 space-y-4 text-xs">
              {/* Recipient info & preset buttons */}
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DADCE0]/60 dark:border-[#3C4043] pb-3">
                <div>
                  <span className="text-[#5F6368] dark:text-[#9AA0A6]">Recipient:</span>
                  <div className="font-mono font-bold text-sm text-[#202124] dark:text-white mt-0.5">
                    +{formattedPhone}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSetPreset('fee')}
                    className="px-2 py-1 rounded-md bg-slate-100 dark:bg-[#282A2C] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[10px] font-semibold text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#188038] transition cursor-pointer"
                  >
                    Fee Preset
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSetPreset('absent')}
                    className="px-2 py-1 rounded-md bg-slate-100 dark:bg-[#282A2C] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[10px] font-semibold text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#188038] transition cursor-pointer"
                  >
                    Absent Preset
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSetPreset('report')}
                    className="px-2 py-1 rounded-md bg-slate-100 dark:bg-[#282A2C] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[10px] font-semibold text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#188038] transition cursor-pointer"
                  >
                    Report Preset
                  </motion.button>
                </div>
              </motion.div>

              {/* Interactive Message Box with WhatsApp bubble theme */}
              <motion.div variants={fadeUp} className="space-y-1.5">
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
              </motion.div>

              {/* Action buttons */}
              <motion.div variants={staggerContainerFast} className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                <motion.button
                  type="button"
                  variants={fadeUp}
                  whileTap={{ scale: 0.96 }}
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
                </motion.button>

                <motion.button
                  type="button"
                  variants={fadeUp}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleOpenWhatsAppWeb}
                  className="py-2.5 px-3 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  title="Open WhatsApp Web on Desktop"
                >
                  <Globe className="w-4 h-4" />
                  <span>WhatsApp Web</span>
                </motion.button>

                <motion.button
                  type="button"
                  variants={fadeUp}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleOpenWaMe}
                  className="py-2.5 px-3 bg-[#188038] hover:bg-[#137333] text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-700/20 hover:shadow-[var(--fb-glow-primary)] cursor-pointer"
                  title="Launch WhatsApp directly via wa.me"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Open wa.me</span>
                </motion.button>
              </motion.div>

              {/* G3 — Automated cloud delivery (uses monthly message credits) */}
              <motion.div variants={fadeUp} className="pt-3 border-t border-[#DADCE0]/60 dark:border-[#3C4043] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#202124] dark:text-[#E8EAED] flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-[#B06000] dark:text-[#FDD663]" />
                    Automated delivery
                  </span>
                  <span className="text-[10px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">
                    {Number.isFinite(creditCheck.remaining)
                      ? `${creditCheck.remaining} of ${ent.messagingCredits} credits left this month`
                      : 'Unlimited credits left'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
                    This message costs <b>{creditCost} credit{creditCost === 1 ? '' : 's'}</b>
                  </span>
                  <span className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
                    {CHANNEL_META[channel].provider === 'meta-whatsapp'
                      ? 'via WhatsApp Business'
                      : `via ${CHANNEL_META[channel].provider.toUpperCase()}`}
                  </span>
                </div>

                {/* Channel pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(Object.keys(CHANNEL_META) as MessageChannel[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleChannelChange(c)}
                      disabled={sending}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer disabled:opacity-50 ${
                        channel === c
                          ? 'bg-[#188038]/10 border-[#188038]/50 text-[#188038] dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-[#282A2C] border-transparent text-[#5F6368] dark:text-[#9AA0A6]'
                      }`}
                    >
                      {CHANNEL_META[c].label}
                    </button>
                  ))}
                </div>

                {/* Template picker */}
                <div className="flex items-center gap-2">
                  <select
                    value={templateId}
                    onChange={(e) => handlePickTemplate(e.target.value as MessageTemplateId | 'custom')}
                    disabled={sending}
                    className="flex-1 px-2.5 py-1.5 bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] text-[11px] font-semibold text-[#202124] dark:text-[#E8EAED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/40 cursor-pointer disabled:opacity-50"
                  >
                    <option value="custom">Custom message</option>
                    {MESSAGE_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id} disabled={!t.channels.includes(channel)}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {channel === 'email' && (
                  <input
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="Recipient email address"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] text-[11px] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/40"
                  />
                )}

                {!creditCheck.allowed && (
                  <div className="text-[10px] font-medium text-[#B06000] dark:text-[#FDD663] bg-amber-50 dark:bg-[#3B2E0B] rounded-lg px-3 py-2 leading-relaxed">
                    Monthly message credits exhausted. Add the <b>Cloud Messaging</b> SKU to keep sending automated
                    alerts.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void handleSendAutomated()}
                  disabled={sending || !creditCheck.allowed}
                  className="w-full py-2.5 bg-[#188038] hover:bg-[#137333] text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-700/20 disabled:opacity-50 cursor-pointer"
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{sending ? 'Queuing…' : `Send via cloud (${creditCost} credit${creditCost === 1 ? '' : 's'})`}</span>
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
