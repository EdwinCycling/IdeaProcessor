import React, { useState, useEffect } from 'react';
import { TEXTS } from '../constants/texts';
import { Cookie } from 'lucide-react';

const CookieConsent: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Delay slightly for smooth entrance
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] flex items-end justify-center pointer-events-none p-4 pb-[10vh] md:pb-[15vh]">
      <div className="bg-brand-panel border border-white/20 rounded-lg shadow-2xl p-6 max-w-lg w-full pointer-events-auto transform transition-all duration-500 ease-out translate-y-0 animate-in slide-in-from-bottom-20 fade-in">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-white/5 rounded-full flex-shrink-0">
            <Cookie className="w-6 h-6 text-brand-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-2">{TEXTS.MODALS.COOKIES.TITLE}</h3>
            <p className="text-gray-300 text-sm mb-4 leading-relaxed">
              {TEXTS.MODALS.COOKIES.BANNER.TEXT}
            </p>
            <button 
              onClick={handleAccept}
              className="w-full bg-brand-primary hover:opacity-90 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              {TEXTS.MODALS.COOKIES.BANNER.BTN_ACCEPT}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
