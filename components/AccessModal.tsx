import React, { useState, useEffect, useRef } from 'react';
import { Lock, X, ArrowRight, Loader, AlertCircle } from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, COLLECTIONS, CURRENT_SESSION_ID } from '../services/firebase';
import { TEXTS } from '../constants/texts';

interface AccessModalProps {
  onClose: () => void;
  onSuccess: (sessionId: string) => void;
  requiredCode: string;
  initialCode?: string;
}

const AccessModal: React.FC<AccessModalProps> = ({ onClose, onSuccess, requiredCode, initialCode = '' }) => {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasActiveSession, setHasActiveSession] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkActiveSessions = async () => {
      if (!db) return;
      
      setIsCheckingSession(true);
      try {
        const sessionsRef = collection(db, COLLECTIONS.SESSIONS);
        const q = query(sessionsRef, where("isActive", "==", true), limit(1));
        const querySnapshot = await getDocs(q);
        
        setHasActiveSession(!querySnapshot.empty);
      } catch (err) {
        console.error("Error checking active sessions:", err);
        // Fallback to true to allow attempt if check fails
        setHasActiveSession(true);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkActiveSessions();
  }, []);

  useEffect(() => {
    // Force focus when component mounts and session check is done
    if (!isCheckingSession && hasActiveSession && inputRef.current) {
        inputRef.current.focus();
    }
  }, [isCheckingSession, hasActiveSession]);

  // Timer effect for countdown
  useEffect(() => {
    if (!blockedUntil) return;

    const interval = setInterval(() => {
      const remaining = Math.ceil((blockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setBlockedUntil(null);
        setAttempts(0);
        setTimeRemaining(0);
      } else {
        setTimeRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [blockedUntil]);

  const isValid = code.length >= 3 && !blockedUntil && !isChecking;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blockedUntil || isChecking || !hasActiveSession) return;

    setIsChecking(true);
    const trimmedCode = code.trim().toUpperCase();

    try {
        // Re-check session activity on submit for extra security
        const sessionsRef = collection(db!, COLLECTIONS.SESSIONS);
        const q = query(sessionsRef, where("isActive", "==", true), limit(1));
        const activeSnap = await getDocs(q);
        
        if (activeSnap.empty) {
            setHasActiveSession(false);
            setIsChecking(false);
            return;
        }

        let foundSessionId: string | null = null;
        
        // 1. Check Global Code (Legacy/Default)
        if (trimmedCode === requiredCode.toUpperCase()) {
            foundSessionId = CURRENT_SESSION_ID;
        } else if (db) {
            // 2. Check Session Codes in Firestore
            const codeRef = doc(db, COLLECTIONS.SESSION_CODES, trimmedCode);
            const codeSnap = await getDoc(codeRef);
            
            if (codeSnap.exists()) {
                foundSessionId = codeSnap.data().sessionId;
            }
        }

        if (foundSessionId && db) {
            // Check if the session is actually active
            const sessionRef = doc(db, COLLECTIONS.SESSIONS, foundSessionId);
            const sessionSnap = await getDoc(sessionRef);
            
            if (sessionSnap.exists()) {
                const sessionData = sessionSnap.data();
                if (sessionData.isActive === true) {
                    onSuccess(foundSessionId);
                    return;
                } else {
                    // Session exists but is not active
                    setError(true);
                    setIsChecking(false);
                    // Custom error message for closed session could be added here
                    // For now, use the default error but maybe a more specific one
                    return;
                }
            }
        }
    } catch (err) {
        console.error("Error checking session code:", err);
    }

    // If we reach here, it's either invalid or not active
    setIsChecking(false);
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setError(true);
        
        if (newAttempts >= 3) {
            const blockTime = Date.now() + 30000; // 30 seconds block
            setBlockedUntil(blockTime);
            setTimeRemaining(30);
        } else {
            setTimeout(() => setError(false), 2000);
        }
  };

  if (isCheckingSession) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <div className="bg-exact-panel border border-white/20 rounded-lg max-w-md w-full p-8 shadow-2xl flex flex-col items-center">
          <Loader className="w-12 h-12 text-exact-red animate-spin mb-4" />
          <p className="text-white font-medium">Sessie controleren...</p>
        </div>
      </div>
    );
  }

  if (hasActiveSession === false) {
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
            onClick={onClose}
            className="w-full px-4 py-3 bg-exact-red text-white font-bold rounded-sm hover:bg-red-700 transition-all shadow-[0_0_15px_rgba(225,0,0,0.3)]"
          >
            {TEXTS.MODALS.ACCESS.CLOSE}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-exact-panel border border-white/20 rounded-lg max-w-md w-full p-8 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          tabIndex={4}
        >
          <X size={24} />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
            <Lock className="w-8 h-8 text-exact-red" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{TEXTS.MODALS.ACCESS.TITLE}</h2>
          <p className="text-gray-400 text-sm">
            {TEXTS.MODALS.ACCESS.DESC}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              ref={inputRef}
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (!blockedUntil) setError(false);
              }}
              placeholder={blockedUntil ? `GEBLOKKEERD (${timeRemaining}s)` : TEXTS.MODALS.ACCESS.PLACEHOLDER}
              disabled={!!blockedUntil}
              className={`w-full bg-black/50 border ${error ? 'border-exact-red animate-pulse' : 'border-white/20'} rounded-sm px-4 py-4 text-center text-2xl tracking-widest font-mono text-white focus:outline-none focus:border-exact-red transition-all placeholder:text-gray-700 uppercase ${blockedUntil ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {error && !blockedUntil && <p className="text-exact-red text-xs text-center mt-2">{TEXTS.MODALS.ACCESS.ERROR}</p>}
            {blockedUntil && <p className="text-exact-red text-xs text-center mt-2">Te veel pogingen. Wacht {timeRemaining} seconden.</p>}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-transparent border border-white/10 text-gray-400 font-medium rounded-sm hover:text-white hover:border-white/30 transition-all"
            >
              {TEXTS.MODALS.ACCESS.CANCEL}
            </button>
            <button
              type="submit"
              disabled={!isValid}
              tabIndex={2}
              className={`flex-1 px-4 py-3 font-bold rounded-sm transition-all flex items-center justify-center ${
                isValid 
                  ? 'bg-exact-red text-white hover:bg-red-700 shadow-[0_0_15px_rgba(225,0,0,0.3)]' 
                  : 'bg-white/10 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isChecking ? <Loader className="animate-spin w-4 h-4" /> : <>{TEXTS.MODALS.ACCESS.SUBMIT} <ArrowRight className="ml-2 w-4 h-4" /></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccessModal;