import { useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { getToken } from '@/api/client';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:3001/api';

interface Props {
  onVerified: () => void;
}

export function useWorldIdVerify({ onVerified }: Props) {
  const open = useCallback(async () => {
    const token = await getToken();
    if (!token) return;

    // Open the backend-served verification page in SFSafariViewController.
    // IDKit runs in a real browser so World App deep-links work correctly.
    const url = `${API_BASE}/worldid/verify-page?token=${encodeURIComponent(token)}`;
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: '#f43f5e',
      createTask: false,
    });

    // When user returns from browser, refresh to pick up verified status
    onVerified();
  }, [onVerified]);

  return { open };
}
