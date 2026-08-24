import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { ToastContext, type ToastSeverity } from './ToastContext';

interface ToastState {
  key: number;
  message: string;
  severity: ToastSeverity;
}

/** Non-blocking mutation feedback (§21 — "a toast, not a blocking alert, for mutations"). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, severity: ToastSeverity = 'success') => {
    setToast({ key: Date.now(), message, severity });
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        key={toast?.key}
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {toast ? (
          <Alert onClose={() => setToast(null)} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </ToastContext.Provider>
  );
}
