import React from 'react';
import { ScanLine, Send, Sparkles } from 'lucide-react';
import { TEXTS } from '../constants/texts';

const HowItWorks: React.FC = () => {
  const steps = TEXTS.HOW_IT_WORKS.STEPS;

  return (
    <section id="how-it-works" className="py-24 bg-brand-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
         <div className="mb-16">
            <span className="text-brand-primary font-mono text-sm tracking-widest uppercase mb-2 block">{TEXTS.HOW_IT_WORKS.WORKFLOW}</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white">{TEXTS.HOW_IT_WORKS.TITLE}</h2>
         </div>

         <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 -z-10"></div>

            {/* Step 1 */}
            <div className="relative">
                <div className="w-24 h-24 bg-brand-panel border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(0,0,0,0.5)] z-10">
                    <ScanLine className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                    <div className="inline-block px-3 py-1 bg-gray-800 rounded-full text-xs font-mono text-gray-300 mb-3">{steps[0].label}</div>
                    <h3 className="text-xl font-bold mb-2">{steps[0].title}</h3>
                    <p className="text-gray-400 text-sm px-4">
                        {steps[0].desc}
                    </p>
                </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
                <div className="w-24 h-24 bg-brand-panel border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(0,0,0,0.5)] z-10">
                    <Send className="w-10 h-10 text-neon-cyan" />
                </div>
                <div className="text-center">
                    <div className="inline-block px-3 py-1 bg-gray-800 rounded-full text-xs font-mono text-gray-300 mb-3">{steps[1].label}</div>
                    <h3 className="text-xl font-bold mb-2">{steps[1].title}</h3>
                    <p className="text-gray-400 text-sm px-4">
                        {steps[1].desc}
                    </p>
                </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
                <div className="w-24 h-24 bg-brand-panel border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(168,85,247,0.2)] z-10">
                    <Sparkles className="w-10 h-10 text-brand-primary" />
                </div>
                <div className="text-center">
                    <div className="inline-block px-3 py-1 bg-gray-800 rounded-full text-xs font-mono text-gray-300 mb-3">{steps[2].label}</div>
                    <h3 className="text-xl font-bold mb-2">{steps[2].title}</h3>
                    <p className="text-gray-400 text-sm px-4">
                        {steps[2].desc}
                    </p>
                </div>
            </div>
         </div>
      </div>
    </section>
  );
};

export default HowItWorks;