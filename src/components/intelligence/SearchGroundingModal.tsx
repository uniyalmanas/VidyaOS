import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  ExternalLink,
  Globe,
  Copy,
  Check,
  X,
  BookOpen,
  Calendar,
  AlertCircle,
  RefreshCw,
  Award,
  ChevronRight
} from 'lucide-react';
import { auth } from '../../lib/firebase';

interface GroundedSource {
  title: string;
  url: string;
}

interface GroundingResponse {
  text: string;
  sources: GroundedSource[];
  searchQueries: string[];
}

interface SearchGroundingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_QUERIES = [
  {
    title: 'CBSE 2026/2027 Board Exam Schedule',
    desc: 'Official exam dates, practical exam guidelines & circulars',
    query: 'What are the official latest dates and guidelines for CBSE Class 10 and Class 12 board examinations and practicals?',
    icon: Calendar,
    tag: 'CBSE'
  },
  {
    title: 'JEE Main & NEET Latest Notification',
    desc: 'NTA session dates, syllabus reductions & scoring pattern',
    query: 'What are the latest official NTA notifications, syllabus changes, and dates for JEE Main and NEET UG?',
    icon: Award,
    tag: 'NTA'
  },
  {
    title: 'CISCE / ICSE Class 10 Syllabus Updates',
    desc: 'Assessment weightage & sample question papers',
    query: 'What are the latest updates on ICSE Class 10 exam syllabus, specimen papers, and passing criteria from CISCE?',
    icon: BookOpen,
    tag: 'ICSE'
  },
  {
    title: 'CUET UG Subject Mapping & Criteria',
    desc: 'University admissions eligibility & test formats',
    query: 'What are the current CUET UG domain subject requirements and registration guidelines for central universities in India?',
    icon: Globe,
    tag: 'CUET'
  },
  {
    title: 'SSC CGL / CHSL Latest Notification',
    desc: 'Exam calendar, vacancies, tier pattern & syllabus',
    query: 'What are the latest official SSC CGL and CHSL notifications, exam calendar, vacancies and tier-wise pattern?',
    icon: Award,
    tag: 'SSC'
  },
  {
    title: 'IBPS & SBI Banking Exam Updates',
    desc: 'PO/Clerk notifications, prelims & mains dates',
    query: 'What are the latest IBPS and SBI PO and Clerk notifications, exam dates and selection process?',
    icon: BookOpen,
    tag: 'Banking'
  },
  {
    title: 'UPSC & State PSC Notifications',
    desc: 'Civil services calendar, syllabus & eligibility',
    query: 'What are the latest UPSC Civil Services and State PSC notifications, exam dates, syllabus and eligibility?',
    icon: Globe,
    tag: 'UPSC'
  }
];

export const SearchGroundingModal: React.FC<SearchGroundingModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GroundingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setQuery(searchQuery);

    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error('Sign in with your VidyaOS account to use grounded search.');
      }
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch('/api/search-grounding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status}: Failed to fetch search grounded data`);
      }

      const data: GroundingResponse = await res.json();
      setResult(data);
    } catch (err: any) {
      console.error('Grounding search error:', err);
      setError(err.message || 'Unable to connect to Google Search Grounding service.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.text) return;
    navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#202124] rounded-3xl w-full max-w-3xl shadow-2xl border border-[#DADCE0] dark:border-[#3C4043] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#1A73E8] to-[#174EA6] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold">Exam & Syllabus Radar</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white tracking-wide uppercase">
                  Google Search Grounded
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-400/30 text-emerald-100 border border-emerald-300/30">
                  Gemini 3.5 Flash
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Live verified dates, notifications & syllabus directly from official Indian educational portals
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-blue-100 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Search Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(query);
            }}
            className="relative flex items-center"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search CBSE dates, JEE/NEET/CUET syllabus, SSC & UPSC updates..."
              className="w-full pl-11 pr-28 py-3.5 bg-[#F8F9FA] dark:bg-[#303134] border border-[#DADCE0] dark:border-[#5F6368] rounded-2xl text-sm text-[#202124] dark:text-[#E3E3E3] placeholder-[#80868B] focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent transition"
            />
            <Search className="w-5 h-5 text-[#80868B] absolute left-3.5" />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 px-4 py-2 bg-[#1A73E8] hover:bg-[#1557B0] disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ground Search</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Preset Queries */}
          {!result && !loading && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-[#5F6368] dark:text-[#9AA0A6] uppercase tracking-wider">
                Quick Intelligence Topics
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESET_QUERIES.map((preset, idx) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSearch(preset.query)}
                      className="p-3.5 rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] hover:border-[#1A73E8] dark:hover:border-[#8AB4F8] hover:bg-blue-50/40 dark:hover:bg-blue-950/20 text-left transition group cursor-pointer flex items-start space-x-3"
                    >
                      <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-[#1A73E8] dark:text-[#8AB4F8] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-[#202124] dark:text-[#E3E3E3]">
                            {preset.title}
                          </span>
                          <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-sm bg-slate-100 dark:bg-[#3C4043] text-slate-600 dark:text-slate-300">
                            {preset.tag}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-0.5 line-clamp-1">
                          {preset.desc}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#1A73E8] transition self-center" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-[#1A73E8] flex items-center justify-center animate-pulse">
                <Globe className="w-6 h-6 animate-spin text-[#1A73E8]" />
              </div>
              <div className="text-sm font-semibold text-[#202124] dark:text-[#E3E3E3]">
                Querying Google Search Grounding Index...
              </div>
              <div className="text-xs text-[#5F6368] dark:text-[#9AA0A6] max-w-sm">
                Retrieving live data from official portals (cbse.gov.in, nta.ac.in, cisce.org, and academic databases)
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start space-x-3 text-rose-800 dark:text-rose-200 text-xs">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm">Failed to retrieve search data</div>
                <div className="mt-1">{error}</div>
              </div>
            </div>
          )}

          {/* Results State */}
          {result && !loading && (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Grounded Text Answer */}
              <div className="bg-[#F8F9FA] dark:bg-[#303134] p-5 rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] relative">
                <div className="flex items-center justify-between pb-3 border-b border-[#DADCE0] dark:border-[#3C4043] mb-4">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-[#1A73E8] dark:text-[#8AB4F8]" />
                    <span className="text-xs font-bold text-[#202124] dark:text-[#E3E3E3]">
                      Verified Grounded Answer
                    </span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#202124] border border-[#DADCE0] dark:border-[#5F6368] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy for WhatsApp</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-xs sm:text-sm text-[#202124] dark:text-[#E3E3E3] leading-relaxed whitespace-pre-line font-normal">
                  {result.text}
                </div>
              </div>

              {/* Web Search Queries Used */}
              {result.searchQueries && result.searchQueries.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#5F6368] dark:text-[#9AA0A6] uppercase tracking-wider flex items-center space-x-1.5">
                    <Search className="w-3.5 h-3.5" />
                    <span>Google Search Queries Executed</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.searchQueries.map((q, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#1A73E8] dark:text-[#8AB4F8] text-xs font-medium border border-blue-200 dark:border-blue-900"
                      >
                        "{q}"
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Citations & Sources */}
              {result.sources && result.sources.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#5F6368] dark:text-[#9AA0A6] uppercase tracking-wider flex items-center space-x-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Grounding Sources & Citations</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {result.sources.map((source, idx) => (
                      <a
                        key={idx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-xl bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] hover:border-[#1A73E8] dark:hover:border-[#8AB4F8] hover:bg-slate-50 dark:hover:bg-[#303134] transition flex items-center justify-between group"
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <Globe className="w-4 h-4 text-[#5F6368] dark:text-[#9AA0A6] flex-shrink-0" />
                          <span className="text-xs font-medium text-[#202124] dark:text-[#E3E3E3] truncate">
                            {source.title || source.url}
                          </span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1A73E8] flex-shrink-0 ml-2" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F8F9FA] dark:bg-[#303134] border-t border-[#DADCE0] dark:border-[#3C4043] flex items-center justify-between text-xs text-[#5F6368] dark:text-[#9AA0A6]">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Grounding API Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white dark:bg-[#202124] border border-[#DADCE0] dark:border-[#5F6368] hover:bg-slate-50 dark:hover:bg-[#282A2C] font-semibold text-xs transition cursor-pointer text-[#202124] dark:text-[#E3E3E3]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
