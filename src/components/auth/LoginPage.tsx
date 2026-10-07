import React from 'react';
import { motion } from 'motion/react';
import { useRouter } from '../../context/RouterContext';
import { VidyaLogo, Reveal } from '../ui';
import { AuthCard } from './AuthCard';
import { fadeUp, fadeUpLg, tDefault, tFast, tSoftSpring } from '../../lib/motion';
import {
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  Smartphone,
  ArrowLeft,
  Sparkles,
  Users
} from 'lucide-react';

interface LoginPageProps {
  onOpenRegister?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onOpenRegister }) => {
  const { navigate } = useRouter();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F5F5F7_0%,#F8F9FA_100%)] dark:bg-[linear-gradient(180deg,#000000_0%,#0D0D0F_100%)] text-[#202124] dark:text-[#E8EAED] flex flex-col font-['Inter',system-ui,sans-serif]">
      {/* Top Mobile Bar */}
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={tFast}
        className="lg:hidden border-b border-[#DADCE0] dark:border-[#3C4043] bg-white/90 dark:bg-[#1E1F20]/90 px-4 py-3 flex items-center justify-between backdrop-blur-xl"
      >
        <VidyaLogo size="sm" badgeText="PORTAL SIGN IN" />
        <button
          onClick={() => navigate('/')}
          className="text-xs font-semibold text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-white flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </button>
      </motion.header>

      {/* Main Dual-Column Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 max-w-7xl mx-auto w-full">
        {/* Left Side: Product Showcase (Visible on lg+) */}
        <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between p-12 bg-white/60 dark:bg-[#101113]/70 border-r border-[#DADCE0] dark:border-[#3C4043]/60 relative overflow-hidden backdrop-blur-sm">
          <div className="absolute inset-x-10 top-0 h-40 bg-[radial-gradient(circle_at_top,_rgba(120,120,128,0.1),_transparent_70%)] pointer-events-none"></div>
          {/* Soft saffron orb (decorative, very low contrast so text stays readable) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(234,88,12,0.10),transparent_65%)] blur-3xl animate-float"
          ></div>

          {/* Top Brand & Back Button */}
          <div className="space-y-6 relative z-10">
            <Reveal variant="fade" delay={0.03}>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#E65100] dark:hover:text-[#FFD54F] transition cursor-pointer group"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition" />
                <span>Back to VidyaOS Home</span>
              </button>
            </Reveal>

            <div>
              <Reveal variant="up" delay={0.06}>
                <VidyaLogo size="lg" badgeText="INSTITUTE OS" />
              </Reveal>
              <Reveal variant="up-lg" delay={0.12}>
                <h1 className="text-3xl font-extrabold font-google-sans text-slate-900 dark:text-white mt-4 leading-tight tracking-[-0.05em]">
                  Operating System for <br />
                  <span className="text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Coaching & Education Centers
                  </span>
                </h1>
              </Reveal>
              <Reveal variant="up" delay={0.2}>
                <p className="text-sm text-slate-600 dark:text-[#9AA0A6] mt-3 max-w-lg leading-relaxed">
                  Empowering Indian coaching institutes with a calmer, faster, and more reliable daily workflow for admin, faculty, students, and parents.
                </p>
              </Reveal>
            </div>
          </div>

          {/* Middle Value Bullets */}
          <div className="space-y-4 my-8 relative z-10">
            <Reveal variant="up" delay={0.24}>
              <div className="flex items-start space-x-3.5 p-3.5 rounded-2xl bg-white/80 dark:bg-[#1E1F20]/80 backdrop-blur-sm border border-[#DADCE0] dark:border-[#3C4043] shadow-[0_2px_14px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)]">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    0% Commission UPI Fee Counter
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Dynamic UPI QR codes link directly to your center's bank account with zero middleman deductions.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal variant="up" delay={0.29}>
              <div className="flex items-start space-x-3.5 p-3.5 rounded-2xl bg-white/80 dark:bg-[#1E1F20]/80 backdrop-blur-sm border border-[#DADCE0] dark:border-[#3C4043] shadow-[0_2px_14px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)]">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    30-Second Attendance & WhatsApp Alerts
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Teachers mark classroom attendance in seconds; parents get instant absent notifications.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal variant="up" delay={0.34}>
              <div className="flex items-start space-x-3.5 p-3.5 rounded-2xl bg-white/80 dark:bg-[#1E1F20]/80 backdrop-blur-sm border border-[#DADCE0] dark:border-[#3C4043] shadow-[0_2px_14px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)]">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Test Marks & Percentile Report Cards
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Automated performance metrics, batch rank percentiles, and homework tracking.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Bottom Director Quote */}
          <Reveal variant="up" delay={0.36} className="p-4 rounded-2xl bg-white/80 dark:bg-[#1E1F20]/80 border border-[#DADCE0] dark:border-[#3C4043] relative z-10">
            <p className="text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed">
              "VidyaOS completely eliminated the awkwardness of manual fee calls. Parents love the instant UPI receipts and our collections increased by 30%."
            </p>
            <div className="flex items-center space-x-3 mt-3">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"
                alt="Director"
                className="w-8 h-8 rounded-full object-cover ring-2 ring-[#FFA000]"
              />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">Er. Manoj Verma</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Director, Apex IIT Academy (Kota, Rajasthan)</div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Right Side: Sign-In Engine Card */}
        <div className="lg:col-span-6 xl:col-span-5 flex items-center justify-center p-4 sm:p-8 lg:p-12 relative">
          {/* Ambient indigo/saffron orbs (decorative; low alpha keeps contrast high) */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(79,70,229,0.16),transparent_65%)] blur-3xl animate-float" />
            <div
              className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(234,88,12,0.14),transparent_65%)] blur-3xl animate-float"
              style={{ animationDelay: '1.6s' }}
            />
            <div className="absolute top-1/4 left-1/3 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,70,229,0.10),transparent_65%)] blur-3xl animate-gradient-pan" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...tSoftSpring, delay: 0.03 }}
            className="w-full max-w-md bg-white/90 dark:bg-[#1E1F20]/90 rounded-[28px] shadow-[0_24px_70px_rgba(0,0,0,0.08)] dark:shadow-[0_28px_80px_rgba(0,0,0,0.36)] border border-black/[0.06] dark:border-white/[0.08] p-5 sm:p-7 space-y-5 backdrop-blur-xl relative z-10"
          >
            <div className="text-center space-y-1.5">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                transition={{ ...tDefault, delay: 0.08 }}
                className="flex justify-center mb-2"
              >
                <VidyaLogo size="md" />
              </motion.div>
              <motion.h2
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                transition={{ ...tDefault, delay: 0.13 }}
                className="text-xl font-bold font-google-sans text-slate-900 dark:text-white"
              >
                Sign In to Your Workspace
              </motion.h2>
              <motion.p
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                transition={{ ...tDefault, delay: 0.18 }}
                className="text-xs text-slate-500 dark:text-slate-400"
              >
                Access your Center Admin, Faculty, Student, or Parent Console
              </motion.p>
            </div>

            {/* Auth Engine Card */}
            <AuthCard
              onSuccess={() => {}}
              onOpenRegister={onOpenRegister}
              isModal={false}
            />

            {/* Privacy & Cloud SLA */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...tDefault, delay: 0.36 }}
              className="text-center pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-center space-x-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#188038]" />
              <span>Secured by Firebase Auth & Google Cloud Platform</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
