import React, { useState, useEffect } from 'react';
import { ArrowRight, QrCode, Monitor } from 'lucide-react';
import { TEXTS } from '../constants/texts';

interface HeroProps {
  onStart: () => void;
}

const Hero: React.FC<HeroProps> = ({ onStart }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX - window.innerWidth / 2) / 40;
      const y = (e.clientY - window.innerHeight / 2) / 40;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full grid-bg -z-10 opacity-30"></div>
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-exact-red/20 blur-[120px] rounded-full -z-10 transition-transform duration-100 ease-out"
        style={{ transform: `translate(calc(-50% + ${mousePos.x * -2}px), calc(-50% + ${mousePos.y * -2}px))` }}
      ></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <div className="text-left space-y-8">
            <div className="inline-flex items-center px-3 py-1 rounded-full border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan text-xs font-mono mb-4">
              <span className="w-2 h-2 rounded-full bg-neon-cyan mr-2 animate-pulse"></span>
              {TEXTS.HERO.BADGE}
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight text-white">
              {TEXTS.HERO.TITLE_PREFIX} <span className="text-transparent bg-clip-text bg-gradient-to-r from-exact-red to-orange-600 neon-text-glow">{TEXTS.HERO.TITLE_HIGHLIGHT}</span>.
            </h1>
            
            <p className="text-xl text-gray-400 max-w-lg font-light">
              {TEXTS.HERO.DESCRIPTION}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={onStart}
                className="group relative px-8 py-4 bg-exact-red hover:bg-red-700 text-white font-bold rounded-sm transition-all neon-glow flex items-center justify-center"
              >
                {TEXTS.HERO.CTA_PRIMARY}
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <div className="relative h-[400px] md:h-[500px] w-full flex items-center justify-center perspective-1000">
             <div 
               className="absolute top-0 right-0 w-3/4 h-3/4 bg-gradient-to-br from-gray-800 to-black border border-gray-700 rounded-lg shadow-2xl p-4 flex flex-col z-10 transition-transform duration-75 ease-out"
               style={{ 
                 transform: `rotateY(-12deg) rotateX(5deg) translate(${mousePos.x}px, ${mousePos.y}px)` 
               }}
             >
                <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                    <div className="flex space-x-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-xs font-mono text-gray-500">AI_ANALYSIS_MODE</span>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <div className="inline-block p-4 bg-exact-red/10 rounded-full">
                            <Monitor className="w-12 h-12 text-exact-red" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-2 w-32 bg-gray-700 rounded mx-auto animate-pulse"></div>
                            <div className="h-2 w-24 bg-gray-700 rounded mx-auto animate-pulse delay-75"></div>
                            <div className="h-2 w-28 bg-gray-700 rounded mx-auto animate-pulse delay-150"></div>
                        </div>
                    </div>
                </div>
                <div className="absolute -left-12 bottom-12 w-24 h-0.5 bg-gradient-to-r from-transparent via-neon-cyan to-transparent"></div>
             </div>

             <div 
               className="absolute bottom-0 left-8 w-1/3 h-2/3 bg-black border-4 border-gray-800 rounded-[2rem] shadow-[0_0_30px_rgba(0,243,255,0.2)] z-20"
               style={{ 
                 transform: `rotate(-6deg) translate(${mousePos.x * 2}px, ${mousePos.y * 2}px)` 
               }}
             >
                <div className="h-full w-full bg-gray-900 rounded-[1.7rem] overflow-hidden relative">
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black">
                         <QrCode className="w-20 h-20 text-white mb-4" />
                         <div className="text-xs font-mono text-neon-cyan">SCAN TO JOIN</div>
                         <div className="mt-8 px-4 w-full">
                             <div className="h-10 w-full bg-white/10 rounded border border-white/20 mb-2"></div>
                             <div className="h-8 w-20 bg-exact-red rounded mx-auto"></div>
                         </div>
                    </div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-xl"></div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;