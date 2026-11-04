'use client';

import { useCallback, useEffect, useState } from 'react';

export type NotificationPermissionState = NotificationPermission | 'unsupported';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermissionState>('default');

  // Safe client-side API authorization check
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      queueMicrotask(() => {
        setPermission('unsupported');
      });
      return;
    }
    
    if (Notification.permission !== permission) {
      queueMicrotask(() => {
        setPermission(Notification.permission);
      });
    }
  }, [permission]);

  // Request system authorization triggered strictly by direct user intent actions
  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch {
      const result = Notification.permission;
      setPermission(result);
      return result;
    }
  }, []);

  // Dispatch system level alert frames with fallback browser sound drivers
  const sendNotification = useCallback((
    title: string,
    options?: NotificationOptions & { audioUrl?: string }
  ) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return null;
    if (Notification.permission !== 'granted') return null;

    const { audioUrl, ...nativeOptions } = options || {};

    // Play synchronized system notification chime safely
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.volume = 0.5;
      audio.play().catch((err) => console.debug('Audio interaction blocked by browser rule:', err));
    }

    // Enforce type assertion wrapper to handle platform-specific parameters
    const defaultOptions = {
      badge: '/icon.png',
      icon: '/icon.png',
      tag: 'nensync-interval-alert',
      renotify: true,
      ...nativeOptions
    } as NotificationOptions & { renotify?: boolean };

    return new Notification(title, defaultOptions);
  }, []);

  return {
    permission,
    requestPermission,
    sendNotification,
    isSupported: permission !== 'unsupported'
  };
}
