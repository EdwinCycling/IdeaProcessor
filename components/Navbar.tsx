import React from 'react';
import { Menu, X } from 'lucide-react';
import { TEXTS } from '../constants/texts';

interface NavbarProps {
  onAdminLogin: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onAdminLogin }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <nav className="fixed w-full z-50 top-0 bg-exact-dark/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="font-sans font-black text-2xl tracking-tighter group flex items-baseline">
                <span className="text-exact-red text-3xl">{TEXTS.APP_NAME.PREFIX}</span> 
                <span className="ml-1">{TEXTS.APP_NAME.MAIN}</span> 
                <span className="text-gray-400 font-light ml-1">{TEXTS.APP_NAME.SUFFIX}</span>
                <span className="ml-2 text-[10px] font-mono text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  {TEXTS.APP_NAME.VERSION}
                </span>
              </span>
            </div>
          </div>
          <div className="hidden md:block">
            <button 
              onClick={onAdminLogin}
              className="bg-white/5 hover:bg-white/10 text-white border border-white/20 px-4 py-2 rounded-sm text-sm font-mono transition-all hover:border-exact-red/50"
            >
              {TEXTS.NAV.ADMIN_LOGIN}
            </button>
          </div>
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-exact-panel border-b border-white/10">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <button onClick={onAdminLogin} className="text-exact-red block px-3 py-2 rounded-md text-base font-bold w-full text-left">
              {TEXTS.NAV.LOGIN}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;