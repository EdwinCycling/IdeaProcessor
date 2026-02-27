import React, { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { TEXTS } from '../constants/texts';

interface SuccessScreenProps {
  onClose: () => void;
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({ onClose }) => {
  // Lock scroll when success screen is shown
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-brand-dark z-50 flex flex-col items-center justify-center overflow-hidden animate-in fade-in duration-500">
      
      {/* Fireworks Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="firework" style={{ left: '15%', top: '30%', '--x': '-50%', '--initialY': '0%', '--initialSize': '0.5vmin', '--finalSize': '45vmin' } as React.CSSProperties}></div>
        <div className="firework" style={{ left: '85%', top: '20%', '--x': '-50%', '--initialY': '0%', '--initialSize': '0.5vmin', '--finalSize': '45vmin', animationDelay: '0.5s' } as React.CSSProperties}></div>
        <div className="firework" style={{ left: '50%', top: '50%', '--x': '-50%', '--initialY': '0%', '--initialSize': '0.5vmin', '--finalSize': '55vmin', animationDelay: '1s' } as React.CSSProperties}></div>
      </div>

      {/* Floating moving items */}
      <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-neon-purple/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-brand-primary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 p-8 text-center max-w-md w-full">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-neon-green/10 rounded-full mb-8 ring-4 ring-neon-green/20 animate-bounce">
            <CheckCircle className="w-12 h-12 text-neon-green" />
        </div>
        
        <h2 className="text-4xl md:text-5xl font-black text-white mb-4 neon-text-glow">
            {TEXTS.SUCCESS.TITLE}
        </h2>
        <p className="text-xl text-gray-300 mb-12">
            {TEXTS.SUCCESS.DESC}
        </p>

        <div className="space-y-4">
          <button
              onClick={onClose}
              className="w-full py-4 bg-white text-brand-dark font-black rounded-sm transition-all uppercase tracking-widest hover:bg-gray-200 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
              {TEXTS.SUCCESS.BTN_CLOSE}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessScreen;