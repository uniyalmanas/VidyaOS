import React from 'react';
import { useRouter } from '../../context/RouterContext';
import { VidyaLogo } from '../ui';
import { AuthCard } from './AuthCard';
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
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#131314] text-[#202124] dark:text-[#E8EAED] flex flex-col font-['Inter',system-ui,sans-serif]">
      {/* Top Mobile Bar */}
      <header className="lg:hidden border-b border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] px-4 py-3 flex items-center justify-between">
        <VidyaLogo size="sm" badgeText="PORTAL SIGN IN" />
        <button
          onClick={() => navigate('/')}
          className="text-xs font-semibold text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-white flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </button>
      </header>

      {/* Main Dual-Column Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 max-w-7xl mx-auto w-full">
        {/* Left Side: Product Showcase (Visible on lg+) */}
        <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between p-12 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-r border-[#DADCE0] dark:border-[#3C4043]/60 relative overflow-hidden">
          {/* Subtle fiery ambient glow discs */}
          <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-gradient-to-br from-[#FF3D00]/15 to-[#FF9100]/20 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-gradient-to-tr from-[#FFD54F]/10 to-[#FF6D00]/15 blur-3xl pointer-events-none"></div>

          {/* Top Brand & Back Button */}
          <div className="space-y-6 relative z-10">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#E65100] dark:hover:text-[#FFD54F] transition cursor-pointer group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition" />
              <span>Back to VidyaOS Home</span>
            </button>

            <div>
              <VidyaLogo size="lg" badgeText="INSTITUTE OS" />
              <h1 className="text-3xl font-extrabold font-google-sans text-slate-900 dark:text-white mt-4 leading-tight">
                Operating System for <br />
                <span className="bg-gradient-to-r from-[#D50000] via-[#FF3D00] to-[#FF9100] bg-clip-text text-transparent">
                  Coaching & Education Centers
                </span>
              </h1>
              <p className="text-sm text-slate-600 dark:text-[#9AA0A6] mt-3 max-w-lg leading-relaxed">
                Empowering Indian coaching centers, entrance institutes, faculty, students, and parents with isolated workspaces, automated fee collection, and instant WhatsApp alerts.
              </p>
            </div>
          </div>

          {/* Middle Value Bullets */}
          <div className="space-y-4 my-8 relative z-10">
            <div className="flex items-start space-x-3.5 p-3.5 rounded-2xl bg-white/70 dark:bg-[#1E1F20]/70 backdrop-blur-sm border border-[#DADCE0] dark:border-[#3C4043] shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
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

            <div className="flex items-start space-x-3.5 p-3.5 rounded-2xl bg-white/70 dark:bg-[#1E1F20]/70 backdrop-blur-sm border border-[#DADCE0] dark:border-[#3C4043] shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
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

            <div className="flex items-start space-x-3.5 p-3.5 rounded-2xl bg-white/70 dark:bg-[#1E1F20]/70 backdrop-blur-sm border border-[#DADCE0] dark:border-[#3C4043] shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
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
          </div>

          {/* Bottom Director Quote */}
          <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#1E1F20]/80 border border-[#DADCE0] dark:border-[#3C4043] relative z-10">
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
          </div>
        </div>

        {/* Right Side: Sign-In Engine Card */}
        <div className="lg:col-span-6 xl:col-span-5 flex items-center justify-center p-4 sm:p-8 lg:p-12">
          <div className="w-full max-w-md bg-white dark:bg-[#1E1F20] rounded-3xl shadow-xl border border-[#DADCE0] dark:border-[#3C4043] p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-1.5">
              <div className="flex justify-center mb-2">
                <VidyaLogo size="md" />
              </div>
              <h2 className="text-xl font-bold font-google-sans text-slate-900 dark:text-white">
                Sign In to Your Workspace
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Access your Center Admin, Faculty, Student, or Parent Console
              </p>
            </div>

            {/* Auth Engine Card */}
            <AuthCard
              onSuccess={() => {}}
              onOpenRegister={onOpenRegister}
              isModal={false}
            />

            {/* Privacy & Cloud SLA */}
            <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#188038]" />
              <span>Secured by Firebase Auth & Google Cloud Platform</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
