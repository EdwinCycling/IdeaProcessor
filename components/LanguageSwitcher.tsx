import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../services/i18n';

interface LanguageSwitcherProps {
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = '' }) => {
  const { language, setLanguage, texts } = useLanguage();

  return (
    <div className={`fixed left-4 md:left-auto md:right-4 z-[130] ${className}`}>
      <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/60 p-1 shadow-xl backdrop-blur-md">
        <div className="flex items-center px-2 text-gray-400">
          <Languages className="h-4 w-4" />
        </div>
        <button
          type="button"
          onClick={() => setLanguage('nl')}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${language === 'nl' ? 'bg-brand-primary text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
          aria-label={texts.COMMON.DUTCH}
        >
          NL
        </button>
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${language === 'en' ? 'bg-brand-primary text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
          aria-label={texts.COMMON.ENGLISH}
        >
          EN
        </button>
      </div>
    </div>
  );
};

export default LanguageSwitcher;
