import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Idea } from '../types';
import { Check, User, Quote, PartyPopper } from 'lucide-react';

interface RevealIdeaModalProps {
    isOpen: boolean;
    onClose: () => void;
    idea: Idea | null;
    context: string;
    onConfirm: () => void;
}

const RevealIdeaModal: React.FC<RevealIdeaModalProps> = ({ isOpen, onClose, idea, context, onConfirm }) => {
    const [count, setCount] = useState(5);
    const [showContent, setShowContent] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCount(5);
            setShowContent(false);
            
            const timer = setInterval(() => {
                setCount((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setShowContent(true);
                        triggerFireworks();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            // Lock scroll
            const originalStyle = window.getComputedStyle(document.body).overflow;
            document.body.style.overflow = 'hidden';

            return () => {
                clearInterval(timer);
                document.body.style.overflow = originalStyle;
            };
        }
    }, [isOpen]);

    const triggerFireworks = () => {
        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => {
            return Math.random() * (max - min) + min;
        }

        const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            
            // since particles fall down, start a bit higher than random
            confetti({
                ...defaults, 
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
                zIndex: 1000
            });
            confetti({
                ...defaults, 
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
                zIndex: 1000
            });
        }, 250);
    };

    if (!isOpen || !idea) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-primary/10 via-transparent to-transparent ${!showContent ? 'animate-spin-slow' : ''}`}></div>
            </div>

            {/* Content Container */}
            <div className="relative z-10 max-w-5xl w-full p-4 md:p-8 text-center max-h-[90vh] overflow-y-auto scrollbar-hide">
                
                {/* COUNTDOWN PHASE */}
                {!showContent && (
                    <div className="flex flex-col items-center justify-center min-h-[50vh]">
                        <h2 className="text-2xl md:text-4xl font-black text-white mb-8 tracking-wider uppercase animate-pulse">
                            Onthulling Top Idee
                        </h2>
                        <div className="relative scale-75 md:scale-100">
                            <div className="text-[12rem] md:text-[15rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-br from-neon-cyan via-white to-neon-purple drop-shadow-[0_0_50px_rgba(255,255,255,0.5)] transition-all duration-300 transform">
                                {count}
                            </div>
                        </div>
                    </div>
                )}

                {/* REVEAL PHASE */}
                {showContent && (
                    <div className="flex flex-col items-center animate-in zoom-in-50 duration-700 slide-in-from-bottom-10 py-4">
                        {/* 1. Context / Question */}
                        <div className="mb-6 md:mb-10 max-w-3xl mx-auto">
                            <div className="text-brand-primary font-mono text-[10px] md:text-xs uppercase tracking-[0.2em] mb-2 md:mb-4 flex items-center justify-center">
                                <PartyPopper className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                                De Uitdaging
                            </div>
                            <h3 className="text-lg md:text-2xl font-bold text-gray-300 leading-relaxed italic line-clamp-3">
                                "{context}"
                            </h3>
                        </div>

                        {/* 2. User Name */}
                        <div className="mb-6 md:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
                            <div className="inline-flex items-center px-4 py-2 md:px-6 md:py-3 bg-white/10 rounded-full border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                <User className="w-4 h-4 md:w-6 md:h-6 mr-2 md:mr-3 text-neon-cyan" />
                                <span className="text-base md:text-xl font-mono text-neon-cyan tracking-wider uppercase font-bold">
                                    {idea.name}
                                </span>
                            </div>
                        </div>

                        {/* 3. The Idea */}
                <div className="mb-8 md:mb-12 relative animate-in fade-in zoom-in-90 duration-700 delay-500 fill-mode-both w-full">
                    <div className="absolute -top-6 -left-6 md:-top-10 md:-left-10 text-white/5 scale-50 md:scale-100">
                        <Quote size={120} />
                    </div>
                    <div className="relative bg-gradient-to-br from-white/10 to-transparent border border-white/20 p-6 md:p-14 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-sm max-w-4xl mx-auto">
                        <p className="text-xl md:text-4xl font-black text-white leading-tight line-clamp-4">
                            "{idea.content}"
                        </p>
                    </div>
                    <div className="absolute -bottom-6 -right-6 md:-bottom-10 md:-right-10 text-white/5 rotate-180 scale-50 md:scale-100">
                        <Quote size={120} />
                    </div>
                </div>

                {/* 4. Action Button */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1000 fill-mode-both pb-4">
                    <button
                        onClick={onConfirm}
                        className="group relative px-6 py-4 md:px-10 md:py-6 bg-neon-green text-black font-black text-lg md:text-2xl uppercase tracking-widest rounded-lg hover:bg-green-400 transition-all shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:shadow-[0_0_50px_rgba(34,197,94,0.6)] hover:scale-105 active:scale-95"
                    >
                        <span className="flex items-center">
                            <Check className="w-6 h-6 md:w-8 md:h-8 mr-2 md:mr-3 stroke-[3]" />
                            Kies Dit Idee
                        </span>
                    </button>
                </div>

                    </div>
                )}
            </div>
        </div>
    );
};

export default RevealIdeaModal;
