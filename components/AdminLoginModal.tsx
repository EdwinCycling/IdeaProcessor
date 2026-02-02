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
  
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus email field on mount
    if (emailRef.current) {
        emailRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      onSuccess();
    } catch (err: any) {
      setLoading(false);
      setError(true);
      console.error("Login failed:", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setErrorMessage('Ongeldig e-mailadres of wachtwoord. (Controleer in Firebase Console of deze gebruiker bestaat)');
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMessage('Te veel inlogpogingen. Probeer het later opnieuw.');
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
            <Shield className="w-8 h-8 text-neon-cyan" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{TEXTS.MODALS.ADMIN.TITLE}</h2>
          <p className="text-gray-400 text-sm">
            {TEXTS.MODALS.ADMIN.DESC}
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
              disabled={loading}
              className="w-full px-4 py-3 bg-white text-black font-bold rounded-sm hover:bg-gray-200 transition-all flex items-center justify-center"
            >
              {loading ? TEXTS.MODALS.ADMIN.BUTTON_LOADING : TEXTS.MODALS.ADMIN.BUTTON_DEFAULT}
              {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginModal;