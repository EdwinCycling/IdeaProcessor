import React from 'react';
import { X, Calendar, MessageSquare, Check } from 'lucide-react';
import { Idea } from '../types';

interface IdeasOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  ideas: Idea[];
  question: string;
  onSelectIdea: (idea: Idea) => void;
}

const IdeasOverviewModal: React.FC<IdeasOverviewModalProps> = ({
  isOpen,
  onClose,
  ideas,
  question,
  onSelectIdea
}) => {
  if (!isOpen) return null;

  const today = new Date().toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-exact-panel border border-white/20 rounded-lg max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-exact-panel border-b border-white/10 p-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          
          <div className="pr-12">
            <div className="flex items-center text-exact-red text-xs font-mono uppercase tracking-widest mb-2">
              <Calendar className="w-3 h-3 mr-2" />
              {today}
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
              {question || "Alle Inzendingen"}
            </h2>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ideas.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500">
                <MessageSquare size={48} className="mb-4 opacity-20" />
                <p className="text-xl">Nog geen ideeën ontvangen.</p>
              </div>
            ) : (
              ideas.sort((a, b) => b.timestamp - a.timestamp).map((idea) => (
                <div 
                  key={idea.id}
                  className="bg-white/5 border border-white/10 p-6 rounded-lg hover:border-white/30 hover:bg-white/10 transition-all flex flex-col h-full group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-mono text-gray-500 bg-white/5 px-2 py-1 rounded">
                      {new Date(idea.timestamp).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-xs font-bold text-exact-red opacity-0 group-hover:opacity-100 transition-opacity">
                      IDEE #{idea.id.slice(-4).toUpperCase()}
                    </span>
                  </div>
                  
                  <h4 className="font-bold text-white mb-2">{idea.name}</h4>
                  <p className="text-gray-300 text-sm leading-relaxed flex-1 italic mb-6">
                    "{idea.content}"
                  </p>
                  
                  <button
                    onClick={() => onSelectIdea(idea)}
                    className="w-full py-3 bg-exact-red hover:bg-red-700 text-white text-xs font-bold rounded flex items-center justify-center transition-all uppercase tracking-widest"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Selecteer voor Analyse
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="flex-shrink-0 p-4 bg-black/40 border-t border-white/5 text-center">
          <p className="text-[10px] text-gray-600 font-mono">
            TOTAL_IDEAS: {ideas.length} // SESSION_ID: {window.location.hostname}
          </p>
        </div>
      </div>
    </div>
  );
};

export default IdeasOverviewModal;
