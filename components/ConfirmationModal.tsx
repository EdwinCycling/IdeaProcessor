import React, { useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Bevestigen',
  cancelText = 'Annuleren',
  variant = 'danger'
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-exact-panel border border-white/20 rounded-lg max-w-md w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-6">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 border ${
            variant === 'danger' 
              ? 'bg-red-900/20 border-red-500/30' 
              : 'bg-yellow-900/20 border-yellow-500/30'
          }`}>
            <AlertTriangle className={`w-7 h-7 ${
              variant === 'danger' ? 'text-exact-red' : 'text-yellow-500'
            }`} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
          <p className="text-gray-300">
            {message}
          </p>
        </div>

        <div className="flex gap-3">
          {cancelText && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-transparent border border-white/10 text-gray-300 font-medium rounded hover:text-white hover:border-white/30 hover:bg-white/5 transition-all"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-2.5 font-bold rounded text-white shadow-lg transition-all ${
              variant === 'danger'
                ? 'bg-exact-red hover:bg-red-700 shadow-red-900/20'
                : variant === 'warning'
                ? 'bg-yellow-600 hover:bg-yellow-700 shadow-yellow-900/20'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
