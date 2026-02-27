import React, { useState } from 'react';
import { X } from 'lucide-react';
import { TEXTS } from '../constants/texts';

const Footer: React.FC = () => {
  const [modalType, setModalType] = useState<'privacy' | 'cookies' | 'contact' | 'disclaimer' | null>(null);

  const renderModalContent = () => {
    switch (modalType) {
      case 'disclaimer':
        return (
          <>
            <h3 className="text-xl font-bold mb-4 text-white">{TEXTS.MODALS.DISCLAIMER.TITLE}</h3>
            <p className="text-gray-300 leading-relaxed">
              {TEXTS.MODALS.DISCLAIMER.CONTENT}
            </p>
          </>
        );
      case 'privacy':
        return (
          <>
            <h3 className="text-xl font-bold mb-4 text-white">{TEXTS.MODALS.PRIVACY.TITLE}</h3>
            <p className="text-gray-300 leading-relaxed">
              {TEXTS.MODALS.PRIVACY.CONTENT}
            </p>
          </>
        );
      case 'cookies':
        return (
          <>
            <h3 className="text-xl font-bold mb-4 text-white">{TEXTS.MODALS.COOKIES.TITLE}</h3>
            <p className="text-gray-300">
              {TEXTS.MODALS.COOKIES.CONTENT}
            </p>
          </>
        );
      case 'contact':
        return (
          <>
            <h3 className="text-xl font-bold mb-4 text-white">{TEXTS.MODALS.CONTACT.TITLE}</h3>
            <p className="text-gray-300 mb-2">
              {TEXTS.MODALS.CONTACT.DESC}
            </p>
            <div className="bg-white/5 p-4 rounded border border-white/10 font-mono text-sm">
              <p className="text-brand-primary font-bold">{TEXTS.MODALS.CONTACT.NAME}</p>
              <p className="text-gray-400">{TEXTS.MODALS.CONTACT.ROLE}</p>
              <p className="mt-2 text-white">{TEXTS.MODALS.CONTACT.EMAIL}</p>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <footer className="bg-black border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <span className="font-sans font-black text-xl tracking-tighter text-white">
                  <span className="text-brand-primary text-2xl">{TEXTS.APP_NAME.PREFIX}</span> {TEXTS.APP_NAME.MAIN} <span className="text-gray-500 font-light">{TEXTS.APP_NAME.SUFFIX}</span>
                </span>
              <p className="text-gray-600 text-xs mt-2 font-mono">
                  {TEXTS.FOOTER.COPYRIGHT}
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2 text-sm text-gray-400">
              <button onClick={() => setModalType('privacy')} className="hover:text-white transition-colors">{TEXTS.FOOTER.LINKS.PRIVACY}</button>
              <button onClick={() => setModalType('disclaimer')} className="hover:text-white transition-colors">{TEXTS.FOOTER.LINKS.DISCLAIMER}</button>
              <button onClick={() => setModalType('cookies')} className="hover:text-white transition-colors">{TEXTS.FOOTER.LINKS.COOKIES}</button>
              <button onClick={() => setModalType('contact')} className="hover:text-white transition-colors">{TEXTS.FOOTER.LINKS.CONTACT}</button>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal Overlay */}
      {modalType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setModalType(null)}>
          <div className="bg-brand-panel border border-white/20 rounded-lg max-w-lg w-full p-6 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setModalType(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
            <div className="mt-2">
              {renderModalContent()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Footer;