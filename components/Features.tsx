import React from 'react';
import { Zap, Brain, Flag, ShieldCheck } from 'lucide-react';
import { FeatureItem } from '../types';
import { TEXTS } from '../constants/texts';

const icons = [
  <Zap className="w-8 h-8 text-yellow-400" />,
  <Brain className="w-8 h-8 text-neon-purple" />,
  <Flag className="w-8 h-8 text-exact-red" />,
  <ShieldCheck className="w-8 h-8 text-neon-green" />
];

const features: FeatureItem[] = TEXTS.FEATURES.ITEMS.map((item, index) => ({
  ...item,
  icon: icons[index]
}));

const Features: React.FC = () => {
  return (
    <section id="features" className="py-20 bg-exact-panel relative border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 font-sans">{TEXTS.FEATURES.TITLE}</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">{TEXTS.FEATURES.SUBTITLE}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="group p-8 bg-white/5 border border-white/5 rounded-sm hover:border-exact-red/50 hover:bg-white/10 transition-all duration-300">
              <div className="mb-6 inline-block p-3 rounded-lg bg-black/50 group-hover:scale-110 transition-transform duration-300 ring-1 ring-white/10">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3 font-mono text-white group-hover:text-exact-red transition-colors">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;