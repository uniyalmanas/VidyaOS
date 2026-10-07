import React, { useState } from 'react';
import {
  Smartphone,
  Laptop,
  Apple,
  Share,
  PlusSquare,
  DownloadCloud,
  CheckCircle2,
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { PlatformType, usePwaInstall } from '../../hooks/usePwaInstall';
import { ConsoleButton } from '../ui';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { easings, tSpring, fadeUp, staggerContainerFast } from '../../lib/motion';

/** Modal shell: spring pop-in cascading header → platform tabs → steps → footer. */
const pwaPanelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { ...tSpring, delayChildren: 0.05, staggerChildren: 0.06 }
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 6,
    transition: { duration: 0.16, ease: easings.inOut }
  }
};

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  pwaState: ReturnType<typeof usePwaInstall>;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  pwaState
}) => {
  const { platform, triggerInstall, canPromptDirectly, isInstalled } = pwaState;
  const [activeTab, setActiveTab] = useState<PlatformType>(
    platform === 'unknown' ? 'android' : platform
  );
  const [installStatus, setInstallStatus] = useState<string | null>(null);

  const handleDirectInstall = async () => {
    if (canPromptDirectly) {
      const res = await triggerInstall();
      if (res === 'accepted') {
        setInstallStatus('Installed successfully! You can now launch VidyaOS from your home screen or apps menu.');
      } else if (res === 'dismissed') {
        setInstallStatus('Installation was dismissed.');
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="pwa-install-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: easings.outQuart }}
        >
          <motion.div
            variants={pwaPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-white dark:bg-[#1E1F20] rounded-2xl shadow-2xl border border-[#DADCE0] dark:border-[#3C4043] overflow-hidden transition-all text-[#202124] dark:text-[#E8EAED]"
          >
            {/* Header Accent Bar */}
            <motion.div variants={fadeUp} className="h-1.5 w-full bg-gradient-to-r from-[#D50000] via-[#FF3D00] to-[#FFA000]" />

            {/* Modal Header */}
            <motion.div variants={fadeUp} className="flex items-center justify-between p-5 border-b border-[#DADCE0] dark:border-[#3C4043]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF3D00] to-[#FFA000] flex items-center justify-center shadow-md shadow-amber-500/20 text-white font-bold text-lg">
              <DownloadCloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold font-google-sans text-[#202124] dark:text-[#F8F9FA] flex items-center gap-1.5">
                Install VidyaOS App
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-[#B06000] dark:text-[#FFCA28] border border-amber-500/20">
                  PWA Fast Load
                </span>
              </h3>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                Native experience for iOS, Android & Laptop / Desktop
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#5F6368] hover:text-[#202124] dark:text-[#9AA0A6] dark:hover:text-white rounded-lg hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
            </motion.div>

            {/* OS Platform Tabs */}
            <motion.div variants={fadeUp} className="flex border-b border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#18191A] p-1.5 gap-1.5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'android'
                ? 'bg-white dark:bg-[#282A2C] text-[#FFA000] dark:text-[#FFCA28] shadow-sm font-bold border border-[#DADCE0]/50 dark:border-[#3C4043]'
                : 'text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-500" />
            <span>Android</span>
            {platform === 'android' && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                Detected
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-white dark:bg-[#282A2C] text-[#FFA000] dark:text-[#FFCA28] shadow-sm font-bold border border-[#DADCE0]/50 dark:border-[#3C4043]'
                : 'text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-white'
            }`}
          >
            <Apple className="w-4 h-4" />
            <span>iPhone / iPad</span>
            {platform === 'ios' && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-600 dark:text-sky-400">
                Detected
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('desktop')}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'desktop'
                ? 'bg-white dark:bg-[#282A2C] text-[#FFA000] dark:text-[#FFCA28] shadow-sm font-bold border border-[#DADCE0]/50 dark:border-[#3C4043]'
                : 'text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-white'
            }`}
          >
            <Laptop className="w-4 h-4 text-blue-500" />
            <span>Laptop / PC</span>
            {platform === 'desktop' && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-[#B06000] dark:text-[#FFCA28]">
                Detected
              </span>
            )}
          </button>
            </motion.div>

            {/* Tab Content */}
            <motion.div variants={staggerContainerFast} className="p-6 space-y-4">
              {/* Status banner if already installed */}
              {isInstalled && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: easings.outQuart }}
                  className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>VidyaOS is installed!</strong> You are already running or have installed this app.
                  </span>
                </motion.div>
              )}

              {installStatus && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: easings.outQuart }}
                  className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-[#B06000] dark:text-[#FFCA28]"
                >
                  {installStatus}
                </motion.div>
              )}

              {/* Platform step panel (swaps with the tabs above) */}
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.26, ease: easings.outQuart }}
              >

              {/* Android View */}
              {activeTab === 'android' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-[#F8F9FA] dark:bg-[#282A2C] rounded-xl border border-[#DADCE0] dark:border-[#3C4043] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#202124] dark:text-[#F8F9FA]">
                    One-Tap Install for Android
                  </span>
                  <span className="text-[10px] font-mono text-[#5F6368] dark:text-[#9AA0A6]">
                    Chrome / Edge / Samsung
                  </span>
                </div>
                <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] leading-relaxed">
                  Install VidyaOS directly to your app drawer and home screen. Launches in standalone full-screen without address bar clutter and works offline.
                </p>
                {canPromptDirectly ? (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={handleDirectInstall}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D50000] via-[#FF3D00] to-[#FFA000] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md hover:brightness-105 transition hover:shadow-[var(--fb-glow-primary)] cursor-pointer"
                  >
                    <DownloadCloud className="w-4 h-4" />
                    Install VidyaOS on Android Now
                  </motion.button>
                ) : (
                  <div className="space-y-2 pt-2 border-t border-[#DADCE0]/50 dark:border-[#3C4043]/50">
                    <p className="text-xs font-medium text-[#202124] dark:text-white">
                      Manual 2-step setup:
                    </p>
                    <ol className="text-xs text-[#5F6368] dark:text-[#9AA0A6] space-y-1.5 list-decimal list-inside pl-1">
                      <li>Tap the <strong>three dots (⋮)</strong> menu in Chrome or your browser top bar.</li>
                      <li>Select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home Screen&quot;</strong>.</li>
                      <li>Tap <strong>&quot;Install&quot;</strong> to confirm.</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* iOS View */}
          {activeTab === 'ios' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-[#F8F9FA] dark:bg-[#282A2C] rounded-xl border border-[#DADCE0] dark:border-[#3C4043] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#202124] dark:text-[#F8F9FA]">
                    Apple Safari Setup (iOS / iPadOS)
                  </span>
                  <span className="text-[10px] font-mono text-[#5F6368] dark:text-[#9AA0A6]">
                    Safari Browser
                  </span>
                </div>
                <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] leading-relaxed">
                  Apple Safari requires adding to home screen through the Share sheet. Follow these simple steps:
                </p>

                <div className="space-y-2.5 text-xs text-[#3C4043] dark:text-[#BDC1C6]">
                  <div className="flex items-start gap-3 p-2 bg-white dark:bg-[#1E1F20] rounded-lg border border-[#DADCE0] dark:border-[#3C4043]">
                    <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-[#202124] dark:text-white flex items-center gap-1.5">
                        Tap Share Button <Share className="w-3.5 h-3.5 text-blue-500 inline" />
                      </p>
                      <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                        At the bottom of Safari (or top right on iPad), tap the Share icon.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2 bg-white dark:bg-[#1E1F20] rounded-lg border border-[#DADCE0] dark:border-[#3C4043]">
                    <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-[#202124] dark:text-white flex items-center gap-1.5">
                        Choose &quot;Add to Home Screen&quot; <PlusSquare className="w-3.5 h-3.5 text-[#FFA000] inline" />
                      </p>
                      <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                        Scroll down the share sheet and tap <strong>Add to Home Screen</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2 bg-white dark:bg-[#1E1F20] rounded-lg border border-[#DADCE0] dark:border-[#3C4043]">
                    <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                      3
                    </div>
                    <div>
                      <p className="font-semibold text-[#202124] dark:text-white">
                        Tap &quot;Add&quot; in Top-Right
                      </p>
                      <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                        The VidyaOS Diya icon will appear on your iPhone/iPad home screen like a native app.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Desktop/Laptop View */}
          {activeTab === 'desktop' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-[#F8F9FA] dark:bg-[#282A2C] rounded-xl border border-[#DADCE0] dark:border-[#3C4043] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#202124] dark:text-[#F8F9FA]">
                    Desktop & Laptop Experience (Windows / Mac / Linux / Chromebook)
                  </span>
                  <span className="text-[10px] font-mono text-[#5F6368] dark:text-[#9AA0A6]">
                    Chrome / Edge / Brave
                  </span>
                </div>
                <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] leading-relaxed">
                  Run VidyaOS in its own high-speed desktop window without browser tabs. Perfect for coaching center reception, admin desks, and multi-monitor management.
                </p>

                {canPromptDirectly ? (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={handleDirectInstall}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D50000] via-[#FF3D00] to-[#FFA000] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md hover:brightness-105 transition hover:shadow-[var(--fb-glow-primary)] cursor-pointer"
                  >
                    <DownloadCloud className="w-4 h-4" />
                    Install VidyaOS on Laptop / PC
                  </motion.button>
                ) : (
                  <div className="space-y-2 pt-2 border-t border-[#DADCE0]/50 dark:border-[#3C4043]/50">
                    <p className="text-xs font-medium text-[#202124] dark:text-white">
                      Install via URL Bar:
                    </p>
                    <ol className="text-xs text-[#5F6368] dark:text-[#9AA0A6] space-y-1.5 list-decimal list-inside pl-1">
                      <li>Look at the right side of your browser&apos;s address/URL bar.</li>
                      <li>Click the <strong>Install VidyaOS icon</strong> (monitor with down arrow or circle plus).</li>
                      <li>Click <strong>Install</strong> to launch into a clean dedicated app window.</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
              )}
              </motion.div>

              {/* Benefits Grid */}
              <motion.div variants={fadeUp} className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                <div className="p-2 rounded-lg bg-[#F1F3F4]/60 dark:bg-[#282A2C]/60 flex flex-col items-center text-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-[#FFA000]" />
                  <span className="font-semibold text-[#202124] dark:text-white">Instant Load</span>
                  <span className="text-[10px]">Zero app store downloads</span>
                </div>
                <div className="p-2 rounded-lg bg-[#F1F3F4]/60 dark:bg-[#282A2C]/60 flex flex-col items-center text-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-semibold text-[#202124] dark:text-white">Offline Ready</span>
                  <span className="text-[10px]">Works when network drops</span>
                </div>
                <div className="p-2 rounded-lg bg-[#F1F3F4]/60 dark:bg-[#282A2C]/60 flex flex-col items-center text-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  <span className="font-semibold text-[#202124] dark:text-white">Lightweight</span>
                  <span className="text-[10px]">&lt; 2MB storage use</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Modal Footer */}
            <motion.div variants={fadeUp} className="p-4 bg-[#F8F9FA] dark:bg-[#18191A] border-t border-[#DADCE0] dark:border-[#3C4043] flex items-center justify-between">
              <span className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                VidyaOS Progressive Web Application v2.5
              </span>
              <ConsoleButton variant="secondary" size="xs" onClick={onClose}>
                Close
              </ConsoleButton>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
