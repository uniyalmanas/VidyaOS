/**
 * G2 — compact push-notifications control rendered inside the profile editor.
 * Shows the master switch and (when enabled) per-category preferences.
 */
import React from 'react';
import { Bell, BellOff, Loader2, ShieldAlert } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { ALL_PUSH_PREFS } from '../../lib/pushPrefs';

export const PushNotificationsSection: React.FC = () => {
  const { supported, enabled, busy, permissionDenied, prefs, enable, disable, setPref } = usePushNotifications();

  if (!supported) {
    return (
      <div className="rounded-xl border border-[#DADCE0] dark:border-[#3C4043] p-4">
        <div className="flex items-start space-x-3">
          <BellOff className="w-4 h-4 text-[#5F6368] dark:text-[#9AA0A6] shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-[#202124] dark:text-[#E8EAED]">Device push notifications</div>
            <p className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6] mt-0.5 leading-relaxed">
              Unavailable in this browser or configuration. Push needs a modern browser, notification
              permission, and the center&apos;s FCM VAPID key configured in Firebase.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#DADCE0] dark:border-[#3C4043] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-start space-x-3">
          <Bell className="w-4 h-4 text-[#1A73E8] dark:text-[#8AB4F8] shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-[#202124] dark:text-[#E8EAED]">Device push notifications</div>
            <p className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6] mt-0.5 leading-relaxed">
              {enabled
                ? 'This device receives alerts while the app is closed.'
                : 'Get absent, fee-due, result and announcement alerts on this device.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { void (enabled ? disable() : enable()); }}
          disabled={busy}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer transition disabled:opacity-60 ${
            enabled
              ? 'bg-[#E6F4EA] dark:bg-[#1B3A24] border-[#188038]/40 text-[#188038] dark:text-[#81C995]'
              : 'bg-[#E8F0FE] dark:bg-[#1B2C4F] border-[#1A73E8]/40 text-[#1A73E8] dark:text-[#8AB4F8]'
          }`}
          title={enabled ? 'Turn off push notifications for this device' : 'Enable push notifications for this device'}
        >
          {busy ? (
            <span className="inline-flex items-center space-x-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Working…</span>
            </span>
          ) : (
            enabled ? 'Enabled' : 'Enable'
          )}
        </button>
      </div>

      {permissionDenied && (
        <div className="flex items-center space-x-2 text-[10px] text-[#A50E0E] dark:text-[#F28B82] bg-[#FCE8E6] dark:bg-[#3C1B1B] rounded-lg px-3 py-2">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>
            Notifications are blocked in your browser settings. Allow them for this site, then try again.
          </span>
        </div>
      )}

      {enabled && (
        <div className="grid grid-cols-1 gap-1.5 pt-2 border-t border-[#DADCE0]/60 dark:border-[#3C4043]/60">
          {ALL_PUSH_PREFS.map(({ key, label, description }) => (
            <label
              key={key}
              className="flex items-center justify-between rounded-lg px-2.5 py-2 cursor-pointer hover:bg-[#F8F9FA] dark:hover:bg-[#282A2C] transition"
            >
              <div>
                <div className="text-[11px] font-semibold text-[#202124] dark:text-[#E8EAED]">{label}</div>
                <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">{description}</div>
              </div>
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={e => setPref(key, e.target.checked)}
                className="w-3.5 h-3.5 accent-[#1A73E8] cursor-pointer"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
};