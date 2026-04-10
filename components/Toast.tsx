import React, { useEffect } from 'react';
import { CheckCircle, X, AlertTriangle, Info } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastProps {
  isOpen: boolean;
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ isOpen, message, variant = 'info', durationMs = 3000, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => onClose(), durationMs);
    return () => window.clearTimeout(timer);
  }, [isOpen, durationMs, onClose]);

  if (!isOpen) return null;

  const icon =
    variant === 'success' ? <CheckCircle className="w-5 h-5 text-neon-green" /> :
    variant === 'error' ? <AlertTriangle className="w-5 h-5 text-red-500" /> :
    <Info className="w-5 h-5 text-neon-cyan" />;

  const border =
    variant === 'success' ? 'border-neon-green/30' :
    variant === 'error' ? 'border-red-500/30' :
    'border-neon-cyan/30';

  const bg =
    variant === 'success' ? 'bg-neon-green/10' :
    variant === 'error' ? 'bg-red-500/10' :
    'bg-neon-cyan/10';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[400] px-4 w-full max-w-lg">
      <div className={`flex items-start gap-3 rounded-xl border ${border} ${bg} backdrop-blur-md px-4 py-3 shadow-2xl`}>
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1 text-sm text-white leading-snug">{message}</div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors -mt-1 -mr-1 p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
