import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2, Play } from 'lucide-react';
import { IdeaDetails } from '../types';

interface PowerPointViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  ideaDetails: IdeaDetails | null;
  ideaName: string;
}

const PowerPointViewerModal: React.FC<PowerPointViewerModalProps> = ({ isOpen, onClose, ideaDetails, ideaName }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Safe access to slides, ensuring hooks don't depend on early return
  const slides = ideaDetails?.pptOutline?.slides || [];
  const currentSlide = slides[currentSlideIndex];

  useEffect(() => {
    if (isOpen) {
      setCurrentSlideIndex(0);
    }
  }, [isOpen]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Listen for fullscreen change events to update state if user presses ESC
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        if (slides.length > 0 && currentSlideIndex < slides.length - 1) {
            setCurrentSlideIndex(prev => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentSlideIndex > 0) {
            setCurrentSlideIndex(prev => prev - 1);
        }
      } else if (e.key === 'Escape') {
        if (!document.fullscreenElement) {
           onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentSlideIndex, slides]);

  // Early return MUST be after all hooks
  if (!isOpen || !ideaDetails?.pptOutline) return null;

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  return (
    <div className={`fixed inset-0 z-[400] bg-black flex flex-col items-center justify-center animate-in fade-in duration-300 ${isFullscreen ? 'p-0' : 'p-4 backdrop-blur-md bg-black/90'}`}>
      
      {/* Controls Header (hidden in fullscreen unless hovered, but kept simple for now) */}
      <div className={`absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 transition-opacity duration-300 ${isFullscreen ? 'opacity-0 hover:opacity-100 bg-gradient-to-b from-black/80 to-transparent' : ''}`}>
        <div className="text-white font-bold flex items-center">
            <Play className="w-5 h-5 text-exact-red mr-2" />
            <span className="opacity-80">{ideaName}</span>
            <span className="mx-2 text-gray-500">/</span>
            <span className="text-sm text-gray-400">Slide {currentSlideIndex + 1} van {slides.length}</span>
        </div>
        
        <div className="flex items-center space-x-4">
            <button 
                onClick={toggleFullscreen}
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
                {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
            </button>
            <button 
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
            >
                <X size={24} />
            </button>
        </div>
      </div>

      {/* Slide Content Area */}
      <div className="relative w-full max-w-6xl aspect-video bg-white text-black shadow-2xl overflow-hidden flex flex-col">
        {/* Slide Master Background Elements */}
        <div className="absolute top-0 left-0 w-full h-2 bg-exact-red"></div>
        <div className="absolute bottom-4 left-8 right-8 h-px bg-gray-200"></div>
        <div className="absolute bottom-1 right-8 text-[10px] text-gray-400 font-sans">EXACT IDEA PROCESSOR</div>

        {/* Slide Content */}
        <div className="flex-1 p-12 flex flex-col relative z-10">
            <h2 className="text-4xl font-bold text-black mb-8 font-sans">{currentSlide?.title}</h2>
            
            <div className="flex-1 overflow-y-auto">
                {currentSlide?.content && currentSlide.content.length > 0 ? (
                    <div className="space-y-6">
                        {currentSlide.content.map((paragraph, idx) => (
                            <p key={idx} className="text-xl text-gray-700 leading-relaxed font-sans">
                                {paragraph}
                            </p>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 italic">
                        Geen inhoud voor deze slide.
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className={`absolute bottom-8 flex items-center space-x-8 z-50 ${isFullscreen ? 'opacity-0 hover:opacity-100 transition-opacity duration-300 bg-black/50 px-6 py-2 rounded-full backdrop-blur-sm' : ''}`}>
        <button 
            onClick={handlePrev}
            disabled={currentSlideIndex === 0}
            className={`p-4 rounded-full transition-all ${currentSlideIndex === 0 ? 'text-gray-600 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20 text-white'}`}
        >
            <ChevronLeft size={32} />
        </button>
        
        <div className="flex space-x-2">
            {slides.map((_, idx) => (
                <button
                    key={idx}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`w-3 h-3 rounded-full transition-all ${idx === currentSlideIndex ? 'bg-exact-red scale-125' : 'bg-gray-600 hover:bg-gray-400'}`}
                />
            ))}
        </div>

        <button 
            onClick={handleNext}
            disabled={currentSlideIndex === slides.length - 1}
            className={`p-4 rounded-full transition-all ${currentSlideIndex === slides.length - 1 ? 'text-gray-600 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20 text-white'}`}
        >
            <ChevronRight size={32} />
        </button>
      </div>

    </div>
  );
};

export default PowerPointViewerModal;
