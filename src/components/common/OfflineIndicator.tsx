import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, CloudCheck } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showReconnectedBanner, setShowReconnectedBanner] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnectedBanner(true);
      const timer = setTimeout(() => setShowReconnectedBanner(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnectedBanner(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnectedBanner) return null;

  if (showReconnectedBanner) {
    return (
      <aside aria-label="Network status" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="bg-[#188038] text-white px-4 py-2 rounded-full shadow-lg border border-emerald-400 flex items-center space-x-2 text-xs font-semibold">
          <CloudCheck className="w-4 h-4 text-emerald-200" />
          <span>Back Online — All data synced to VidyaOS Cloud</span>
        </div>
      </aside>
    );
  }

  return (
    <aside aria-label="Network status" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-[#202124] text-white px-4 py-2.5 rounded-full shadow-xl border border-[#FFA000] flex items-center space-x-2.5 text-xs font-medium">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FFA000]"></span>
        </span>
        <WifiOff className="w-3.5 h-3.5 text-[#FFA000]" />
        <span>Offline Mode Active — You can still take attendance & view batches</span>
      </div>
    </aside>
  );
};
