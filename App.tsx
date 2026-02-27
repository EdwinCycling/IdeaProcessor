import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import Footer from './components/Footer';
import CookieConsent from './components/CookieConsent';

// Modals & Screens
import AccessModal from './components/AccessModal';
import AdminLoginModal from './components/AdminLoginModal';
import IdeaForm from './components/IdeaForm';
import SuccessScreen from './components/SuccessScreen';
import AdminDashboard from './components/AdminDashboard';
import { db, auth, COLLECTIONS } from './services/firebase';
import { TEXTS } from './constants/texts';
import { APP_CONFIG } from './config';

type ViewState = 'LANDING' | 'IDEA_FORM' | 'SUCCESS' | 'ADMIN_DASHBOARD';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('LANDING');
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [firebaseError, setFirebaseError] = useState(false);
  
  // Lifted State for Access Code (shared between Admin Dashboard and Access Modal)
  const [accessCode, setAccessCode] = useState(APP_CONFIG.ACCESS_CODE);
  const [scannedCode, setScannedCode] = useState('');
  const [targetSessionId, setTargetSessionId] = useState('idea-live-event');

  useEffect(() => {
    if (!db) {
      setFirebaseError(true);
      console.error("Firebase is not initialized. Check your .env file.");
    }

    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    if (codeParam) {
      setScannedCode(codeParam);
      setShowAccessModal(true);
    }
  }, []);

  // --- Handlers for Public Flow ---
  
  const handleStartIdea = () => {
    setShowAccessModal(true);
  };

  const handleAccessGranted = (sessionId: string) => {
    setTargetSessionId(sessionId);
    setShowAccessModal(false);
    setCurrentView('IDEA_FORM');
  };

  const handleIdeaSubmitted = () => {
    setCurrentView('SUCCESS');
  };

  const handleCloseSuccess = () => {
    setCurrentView('LANDING');
  };

  // --- Handlers for Admin Flow ---

  const handleAdminLoginClick = () => {
    setShowAdminModal(true);
  };

  const handleAdminLoggedin = () => {
    setShowAdminModal(false);
    setCurrentView('ADMIN_DASHBOARD');
  };

  const handleAdminLogout = () => {
    setCurrentView('LANDING');
  };


  // --- Render Logic ---

  // 1. Full Screen View: Admin Dashboard
  if (currentView === 'ADMIN_DASHBOARD') {
    return (
      <AdminDashboard 
        onLogout={handleAdminLogout} 
        currentAccessCode={accessCode}
        onUpdateAccessCode={setAccessCode}
      />
    );
  }

  // 2. Full Screen View: Idea Form (Mobile First)
  if (currentView === 'IDEA_FORM') {
    return (
      <IdeaForm 
        onCancel={() => setCurrentView('LANDING')} 
        onSubmit={handleIdeaSubmitted} 
        sessionId={targetSessionId}
      />
    );
  }

  // 3. Full Screen View: Success Screen
  if (currentView === 'SUCCESS') {
    return <SuccessScreen onClose={handleCloseSuccess} />;
  }

  // 4. Default View: Landing Page
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  return (
    <div className="min-h-screen bg-brand-dark text-white font-sans selection:bg-brand-primary selection:text-white relative">
      {firebaseError && isLocalhost && (
        <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-[10px] py-1 px-4 z-[9999] text-center font-mono">
          WAARSCHUWING: Firebase is niet geconfigureerd. Controleer je .env bestand.
        </div>
      )}
      <CookieConsent />
      <Navbar onAdminLogin={handleAdminLoginClick} />
      
      <main>
        <Hero onStart={handleStartIdea} />
        <Features />
        
        {/* USP / Trust Signal Section */}
        <section className="py-10 bg-brand-primary/10 border-y border-brand-primary/20">
             <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-8 md:gap-16 items-center opacity-70">
                 <div className="flex items-center space-x-2">
                     <span className="font-bold text-white">{TEXTS.USP.POWERED}</span>
                     <span className="font-mono text-neon-purple">{TEXTS.USP.AI}</span>
                 </div>
                 <div className="flex items-center space-x-2">
                     <span className="font-bold text-white">{TEXTS.USP.REALTIME}</span>
                     <span className="font-mono text-blue-400">{TEXTS.USP.SOCKET}</span>
                 </div>
                 <div className="flex items-center space-x-2">
                     <span className="font-bold text-white">{TEXTS.USP.SECURED}</span>
                     <span className="font-mono text-yellow-500">{TEXTS.USP.FIREBASE}</span>
                 </div>
             </div>
        </section>

        <HowItWorks />
        
        {/* Final CTA */}
        <section className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/20 to-transparent pointer-events-none"></div>
            <div className="max-w-4xl mx-auto text-center px-4 relative z-10">
                <h2 className="text-4xl md:text-5xl font-black mb-6">{TEXTS.CTA_BOTTOM.TITLE}</h2>
                <p className="text-xl text-gray-400 mb-10">
                    {TEXTS.CTA_BOTTOM.DESC}
                </p>
                <button 
                  onClick={handleStartIdea}
                  className="px-10 py-5 bg-white text-brand-dark font-black text-lg rounded-sm hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.3)] uppercase"
                >
                    {TEXTS.CTA_BOTTOM.BTN}
                </button>
            </div>
        </section>
      </main>
      
      <Footer />

      {/* Modals */}
      {showAccessModal && (
        <AccessModal 
          requiredCode={accessCode}
          initialCode={scannedCode}
          onClose={() => setShowAccessModal(false)} 
          onSuccess={handleAccessGranted} 
        />
      )}

      {showAdminModal && (
        <AdminLoginModal 
          onClose={() => setShowAdminModal(false)}
          onSuccess={handleAdminLoggedin}
        />
      )}
    </div>
  );
};

export default App;