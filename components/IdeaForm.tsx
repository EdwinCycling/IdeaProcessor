import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Clock, AlertCircle } from 'lucide-react';
import { collection, addDoc, doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db, COLLECTIONS, CURRENT_SESSION_ID } from '../services/firebase';
import { TEXTS } from '../constants/texts';
import ConfirmationModal from './ConfirmationModal';

interface IdeaFormProps {
  onCancel: () => void;
  onSubmit: () => void;
  sessionId: string;
}

const IdeaForm: React.FC<IdeaFormProps> = ({ onCancel, onSubmit, sessionId }) => {
  const [name, setName] = useState('');
  const [idea, setIdea] = useState('');
  const [sessionContext, setSessionContext] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [alertState, setAlertState] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: '', message: '' });
  const [cooldown, setCooldown] = useState(0);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Security limits
  const MAX_NAME_LENGTH = 50;
  const MIN_IDEA_LENGTH = 5;
  const MAX_IDEA_LENGTH = 500;
  const SUBMISSION_COOLDOWN = 60000; // 60 seconds

  useEffect(() => {
    if (nameInputRef.current) {
        nameInputRef.current.focus();
    }

    // Listen for session status changes
    if (db) {
      const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);
      const unsubscribe = onSnapshot(sessionRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setIsSessionActive(data.isActive === true);
          setSessionContext(data.context || '');
        }
        setIsLoadingSession(false);
      });

      return () => unsubscribe();
    } else {
      setIsLoadingSession(false);
    }
  }, []);

  const isValid = name.trim().length > 0 && idea.trim().length >= MIN_IDEA_LENGTH && isSessionActive;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      if (!isSessionActive) {
        setAlertState({
          open: true,
          title: 'Sessie Niet Actief',
          message: 'De sessie is momenteel niet actief. Wacht tot de administrator de Idea Tank opent.'
        });
      }
      return;
    }

    setIsSubmitting(true);
    
    if (!db) {
      setAlertState({
        open: true,
        title: 'Configuratie Fout',
        message: 'Firebase is niet geconfigureerd. Controleer de .env instellingen.'
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // Security: Re-verify session is still active before writing
      const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);
      const sessionSnap = await getDoc(sessionRef);
      
      if (!sessionSnap.exists() || sessionSnap.data().isActive !== true) {
        setAlertState({
          open: true,
          title: 'Sessie Verlopen',
          message: 'Deze sessie is zojuist gesloten door de administrator.'
        });
        setIsSessionActive(false);
        setIsSubmitting(false);
        return;
      }

      // Write to Firestore
      await addDoc(collection(db, COLLECTIONS.SESSIONS, sessionId, COLLECTIONS.IDEAS), {
        name: name.trim(),
        content: idea.trim(),
        timestamp: Date.now()
      });
      
      // Set cooldown
      localStorage.setItem('last_idea_submission', Date.now().toString());
      setCooldown(SUBMISSION_COOLDOWN / 1000);

      setIsSubmitting(false);
      onSubmit();
    } catch (error) {
      console.error("Error adding document: ", error);
      setIsSubmitting(false);
      setAlertState({
        open: true,
        title: 'Fout',
        message: 'Er is iets misgegaan bij het versturen. Probeer het opnieuw.'
      });
    }
  };

  if (!isLoadingSession && !isSessionActive) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-exact-panel border border-white/20 rounded-lg max-w-md w-full p-8 shadow-2xl relative text-center">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
            <AlertCircle className="w-8 h-8 text-exact-red" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{TEXTS.MODALS.ACCESS.NO_SESSION_TITLE}</h2>
          <p className="text-gray-400 mb-8">
            {TEXTS.MODALS.ACCESS.NO_SESSION_DESC}
          </p>
          <button
            onClick={onCancel}
            className="w-full px-4 py-3 bg-exact-red text-white font-bold rounded-sm hover:bg-red-700 transition-all shadow-[0_0_15px_rgba(225,0,0,0.3)]"
          >
            {TEXTS.MODALS.ACCESS.CLOSE}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-exact-dark flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
      <ConfirmationModal
        isOpen={alertState.open}
        onClose={() => setAlertState({ ...alertState, open: false })}
        onConfirm={() => setAlertState({ ...alertState, open: false })}
        title={alertState.title}
        message={alertState.message}
        confirmText="OK"
        variant="warning"
      />
      {/* Header */}
      <div className="bg-exact-panel p-3 border-b border-white/10 flex items-center flex-shrink-0">
        <button onClick={onCancel} className="p-2 -ml-2 text-gray-400 hover:text-white" tabIndex={5}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="ml-2 font-bold text-base text-white">{TEXTS.FORM.TITLE}</h1>
      </div>

      <div className="flex-1 p-4 max-w-lg mx-auto w-full flex flex-col h-full overflow-hidden">
        
        {/* Context / Question Display - Sticky top of content - ONLY show if active */}
        {sessionContext && isSessionActive && (
           <div className="mb-4 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-4 rounded-lg shadow-sm flex-shrink-0">
              <h3 className="text-xs font-bold text-exact-red uppercase tracking-wider mb-1 flex items-center">
                <Clock className="w-3 h-3 mr-1" /> Vraag van vandaag
              </h3>
              <p className="text-white font-medium text-lg leading-snug italic">"{sessionContext}"</p>
           </div>
        )}

        {null}

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-4">
          <div className="flex-shrink-0">
            <label className="block text-xs font-bold text-gray-400 mb-1">{TEXTS.FORM.LABEL_NAME}</label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              tabIndex={1}
              maxLength={MAX_NAME_LENGTH}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-neon-green/50 rounded-sm px-3 py-2 text-white focus:outline-none focus:border-neon-green focus:bg-white/10 transition-all text-sm shadow-[0_0_10px_rgba(57,255,20,0.1)]"
              placeholder={TEXTS.FORM.PLACEHOLDER_NAME}
            />
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <label className="block text-xs font-bold text-gray-400 mb-1">{TEXTS.FORM.LABEL_IDEA}</label>
            <textarea
              value={idea}
              maxLength={MAX_IDEA_LENGTH}
              disabled={!isSessionActive}
              onChange={(e) => setIdea(e.target.value)}
              className={`flex-1 w-full bg-white/5 border rounded-sm px-3 py-3 text-white focus:outline-none focus:bg-white/10 transition-all resize-none text-base leading-relaxed ${
                isSessionActive 
                  ? 'border-neon-green focus:border-neon-green shadow-[0_0_15px_rgba(57,255,20,0.2)]' 
                  : 'border-exact-red/50 focus:border-exact-red shadow-[0_0_15px_rgba(255,0,0,0.1)] opacity-70 cursor-not-allowed'
              }`}
              placeholder={isSessionActive ? TEXTS.FORM.PLACEHOLDER_IDEA : "Wacht tot de sessie start om uw idee in te voeren..."}
            />
            <div className="text-right text-xs text-gray-500 mt-1 flex-shrink-0">
                {idea.length}/{MAX_IDEA_LENGTH}
            </div>
          </div>

          <div className="pt-2 pb-4 space-y-2 flex-shrink-0">
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className={`w-full py-3 text-base font-bold rounded-sm transition-all flex items-center justify-center ${
                isValid && !isSubmitting
                  ? 'bg-white text-exact-dark hover:bg-gray-200 shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                  : 'bg-white/10 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <span className="animate-pulse">{TEXTS.FORM.BTN_SENDING}</span>
              ) : cooldown > 0 ? (
                <span>Even geduld ({cooldown}s)...</span>
              ) : (
                <>
                  {TEXTS.FORM.BTN_SUBMIT} <Send className="ml-2 w-4 h-4" />
                </>
              )}
            </button>
            
            <button
                type="button"
                onClick={onCancel}
                tabIndex={4}
                className="w-full py-2 text-gray-500 font-medium text-xs hover:text-white transition-colors"
            >
                {TEXTS.FORM.BTN_CANCEL}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IdeaForm;