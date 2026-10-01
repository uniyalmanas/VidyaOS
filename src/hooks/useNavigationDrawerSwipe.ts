import { useEffect, useRef, useCallback } from 'react';

export interface NavigationDrawerSwipeOptions {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  enabled?: boolean;
  edgeThreshold?: number; // px from left edge to start opening swipe (default 85px)
  minSwipeDistance?: number; // minimum px moved horizontally to count as swipe (default 50px)
  maxSwipeTime?: number; // max time for swipe gesture in ms (default 650ms)
}

/**
 * useNavigationDrawerSwipe
 * High-performance mobile touch swipe hook for PWA and mobile viewports.
 * - Swiping Left-to-Right from the left screen edge opens the navigation drawer.
 * - Swiping Right-to-Left when open closes the drawer.
 * - Uses passive touch listeners for zero lag (60/120fps smooth scrolling).
 * - Includes optional haptic feedback on supported PWA devices.
 */
export function useNavigationDrawerSwipe({
  isOpen,
  setIsOpen,
  enabled = true,
  edgeThreshold = 85,
  minSwipeDistance = 50,
  maxSwipeTime = 650,
}: NavigationDrawerSwipeOptions) {
  const touchStartRef = useRef<{
    x: number;
    y: number;
    time: number;
    validEdge: boolean;
  } | null>(null);

  const triggerHaptic = useCallback((pattern: number = 10) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore if blocked by browser policy
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only handle single touch gestures
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      const target = e.target as HTMLElement | null;

      // Ignore gesture if user is adjusting sliders or interacting with elements that opt out
      if (target?.closest('input[type="range"], [data-no-swipe], .no-swipe')) {
        touchStartRef.current = null;
        return;
      }

      const clientX = touch.clientX;
      const clientY = touch.clientY;

      // For opening: allow swipe from left edge (e.g. 85px or 25% of viewport width)
      const dynamicEdge = Math.max(edgeThreshold, window.innerWidth * 0.25);
      const isNearLeftEdge = clientX <= dynamicEdge;

      touchStartRef.current = {
        x: clientX,
        y: clientY,
        time: Date.now(),
        validEdge: isNearLeftEdge,
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || e.changedTouches.length === 0) {
        touchStartRef.current = null;
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const duration = Date.now() - touchStartRef.current.time;
      const validEdge = touchStartRef.current.validEdge;

      touchStartRef.current = null;

      // Check duration to distinguish quick deliberate swipe from slow scroll/hold
      if (duration > maxSwipeTime) return;

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Must be predominantly horizontal gesture (not vertical scrolling)
      if (absX < minSwipeDistance || absX < absY * 1.25) return;

      if (!isOpen) {
        // Swiping Left to Right: OPEN sidebar drawer
        if (deltaX > 0 && validEdge) {
          triggerHaptic(12);
          setIsOpen(true);
        }
      } else {
        // Swiping Right to Left: CLOSE sidebar drawer
        if (deltaX < 0) {
          triggerHaptic(8);
          setIsOpen(false);
        }
      }
    };

    const handleTouchCancel = () => {
      touchStartRef.current = null;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [isOpen, setIsOpen, enabled, edgeThreshold, minSwipeDistance, maxSwipeTime, triggerHaptic]);
}
