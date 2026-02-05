import React, { useState, useRef, useEffect } from 'react';
import { Shield, X, ArrowRight, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { TEXTS } from '../constants/texts';

interface AdminLoginModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Security State
  const [attempts, setAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);
  const MAX_ATTEMPTS = 3;
  const LOCKOUT_DURATION = 30; // seconds

  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus email field on mount
    if (emailRef.current) {
        emailRef.current.focus();
    }
    
    // Check for existing lockout in localStorage
    const storedLockout = localStorage.getItem('admin_lockout_until');
    if (storedLockout) {
        const remaining = Math.ceil((parseInt(storedLockout) - Date.now()) / 1000);
        if (remaining > 0) {
            setLockoutTime(remaining);
        } else {
            localStorage.removeItem('admin_lockout_until');
        }
    }
  }, []);

  // Timer for lockout
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (lockoutTime > 0) {
        timer = setInterval(() => {
            setLockoutTime(prev => {
                if (prev <= 1) {
                    setAttempts(0); // Reset attempts after lockout
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutTime]);

  // Lock scroll when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (lockoutTime > 0) return;

    setLoading(true);
    setError(false);
    setErrorMessage('');
    
    if (!auth) {
      setError(true);
      setErrorMessage('Firebase is niet geconfigureerd. Controleer de .env instellingen.');
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setLoading(false);
      // Reset security state on success
      setAttempts(0);
      localStorage.removeItem('admin_lockout_until');
      onSuccess();
    } catch (err: any) {
      setLoading(false);
      setError(true);
      
      // Increment failed attempts
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
          const lockoutUntil = Date.now() + (LOCKOUT_DURATION * 1000);
          localStorage.setItem('admin_lockout_until', lockoutUntil.toString());
          setLockoutTime(LOCKOUT_DURATION);
          setErrorMessage(`Te veel inlogpogingen. Probeer het opnieuw over ${LOCKOUT_DURATION} seconden.`);
          return;
      }

      console.error("Login failed:", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setErrorMessage(`Ongeldig e-mailadres of wachtwoord. (Poging ${newAttempts}/${MAX_ATTEMPTS})`);
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMessage('Te veel inlogpogingen bij Firebase. Probeer het later opnieuw.');
      } else {
        setErrorMessage('Er is een fout opgetreden bij het inloggen.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-exact-panel border border-white/20 rounded-lg max-w-md w-full p-8 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
            {lockoutTime > 0 ? (
                <AlertTriangle className="w-8 h-8 text-exact-red animate-pulse" />
            ) : (
                <Shield className="w-8 h-8 text-neon-cyan" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{TEXTS.MODALS.ADMIN.TITLE}</h2>
          <p className="text-gray-400 text-sm">
            {lockoutTime > 0 
                ? `Toegang geblokkeerd voor ${lockoutTime}s` 
                : TEXTS.MODALS.ADMIN.DESC}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1">{TEXTS.MODALS.ADMIN.EMAIL}</label>
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => {
                  setEmail(e.target.value);
                  setError(false);
              }}
              className="w-full bg-black/50 border border-white/20 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-neon-cyan transition-all"
              required
              tabIndex={1}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1">{TEXTS.MODALS.ADMIN.PASS}</label>
            <div className="relative">
                <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                    setPassword(e.target.value);
                    setError(false);
                }}
                className="w-full bg-black/50 border border-white/20 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-neon-cyan transition-all pr-10"
                required
                tabIndex={2}
                autoComplete="new-password"
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    tabIndex={-1}
                >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
          </div>
          
          {error && (
            <div className="flex items-center text-exact-red text-xs p-2 bg-exact-red/10 rounded border border-exact-red/20">
                <AlertTriangle className="w-3 h-3 mr-2" />
                {errorMessage || 'Er is iets misgegaan.'}
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || lockoutTime > 0}
              className={`w-full py-3 px-4 rounded font-bold text-white transition-all transform flex items-center justify-center
                ${loading || lockoutTime > 0 
                  ? 'bg-gray-700 cursor-not-allowed opacity-50' 
                  : 'bg-gradient-to-r from-exact-red to-red-700 hover:from-red-500 hover:to-exact-red hover:scale-[1.02] shadow-lg shadow-exact-red/20'}`}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {TEXTS.MODALS.ADMIN.BUTTON_LOADING}
                </span>
              ) : lockoutTime > 0 ? (
                   `Geblokkeerd (${lockoutTime}s)`
              ) : (
                <>
                  {TEXTS.MODALS.ADMIN.BUTTON_DEFAULT} <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginModal;