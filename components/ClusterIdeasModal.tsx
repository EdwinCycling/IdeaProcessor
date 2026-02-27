import React, { useState } from 'react';
import { X, Calendar, MessageSquare, Check, Layers, Sparkles, Edit2, Save, User } from 'lucide-react';
import { Idea, Cluster } from '../types';

interface ClusterIdeasModalProps {
  isOpen: boolean;
  onClose: () => void;
  clusters: Cluster[];
  ideas: Idea[];
  isClustering: boolean;
  onSelectCluster: (cluster: Cluster) => void;
}

const ClusterIdeasModal: React.FC<ClusterIdeasModalProps> = ({
  isOpen,
  onClose,
  clusters: initialClusters,
  ideas,
  isClustering,
  onSelectCluster
}) => {
  const [clusters, setClusters] = useState<Cluster[]>(initialClusters);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; summary: string }>({ name: '', summary: '' });

  // Update local clusters when initialClusters changes
  React.useEffect(() => {
    setClusters(initialClusters);
  }, [initialClusters]);

  // Lock scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartEdit = (cluster: Cluster) => {
    setEditingId(cluster.id);
    setEditForm({ name: cluster.name, summary: cluster.summary });
  };

  const handleSaveEdit = () => {
    if (editingId) {
        setClusters(prev => prev.map(c => 
            c.id === editingId ? { ...c, name: editForm.name, summary: editForm.summary } : c
        ));
        setEditingId(null);
    }
  };

  const today = new Date().toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-brand-panel border border-white/20 rounded-lg max-w-6xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-brand-panel border-b border-white/10 p-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          
          <div className="pr-12">
            <div className="flex items-center text-brand-primary text-xs font-mono uppercase tracking-widest mb-2">
              <Calendar className="w-3 h-3 mr-2" />
              {today}
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight flex items-center">
              <Layers className="mr-3 w-8 h-8 text-neon-purple" />
              Geclusterde Ideeën
            </h2>
            <p className="text-gray-400 mt-2">
              AI heeft de inzendingen geanalyseerd en samengevoegd tot krachtige concepten.
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-black/20">
            {isClustering ? (
                <div className="flex flex-col items-center justify-center h-full space-y-8 animate-in fade-in duration-700">
                    <div className="relative">
                        {/* Outer pulsing rings */}
                        <div className="absolute inset-0 bg-neon-purple/20 blur-3xl rounded-full animate-pulse scale-150"></div>
                        <div className="absolute inset-0 bg-neon-cyan/10 blur-2xl rounded-full animate-ping delay-75"></div>
                        
                        {/* Central icon */}
                        <div className="relative z-10 bg-black/50 p-6 rounded-full border border-white/10 shadow-[0_0_30px_rgba(139,92,246,0.3)] backdrop-blur-sm">
                             <Sparkles className="w-16 h-16 text-neon-purple animate-spin-slow" />
                        </div>
                    </div>
                    
                    <div className="text-center max-w-md mx-auto space-y-3">
                        <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-neon-purple to-neon-cyan animate-pulse">
                            Ideeën worden samengevoegd...
                        </h3>
                        <p className="text-gray-400 text-lg font-light">
                            Onze AI analyseert <span className="text-white font-bold">{ideas.length}</span> inzendingen op patronen en synergie.
                        </p>
                        
                        {/* Fake progress bar */}
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-6">
                             <div className="h-full bg-gradient-to-r from-neon-purple to-neon-cyan w-1/2 animate-pulse"></div>
                        </div>
                    </div>
                </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {clusters.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500">
                    <Layers size={48} className="mb-4 opacity-20" />
                    <p className="text-xl">Geen clusters gevonden.</p>
                  </div>
                ) : (
                  clusters.map((cluster) => {
                    const isEditing = editingId === cluster.id;
                    const originalIdeas = ideas.filter(idea => cluster.originalIdeaIds.includes(idea.id));

                    return (
                    <div 
                      key={cluster.id}
                      className="bg-exact-panel border border-neon-purple/30 rounded-xl overflow-hidden flex flex-col h-full group relative hover:border-neon-purple/60 transition-all shadow-lg shadow-purple-900/10"
                    >
                      {/* Cluster Header */}
                      <div className="p-6 pb-4 bg-gradient-to-b from-white/5 to-transparent">
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-xs font-bold text-neon-purple bg-neon-purple/10 px-2 py-1 rounded border border-neon-purple/20">
                              {originalIdeas.length} {originalIdeas.length === 1 ? 'INZENDING' : 'INZENDINGEN'}
                            </span>
                            {!isEditing ? (
                                <button 
                                    onClick={() => handleStartEdit(cluster)}
                                    className="text-gray-500 hover:text-white transition-colors"
                                    title="Bewerk Cluster"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            ) : (
                                <button 
                                    onClick={handleSaveEdit}
                                    className="text-neon-green hover:text-green-400 transition-colors flex items-center text-xs font-bold uppercase tracking-wider"
                                >
                                    <Save className="w-4 h-4 mr-1" /> Opslaan
                                </button>
                            )}
                          </div>
                          
                          {isEditing ? (
                              <input 
                                value={editForm.name}
                                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                className="w-full bg-black/50 border border-white/20 rounded p-2 text-lg font-bold text-white focus:border-neon-purple focus:outline-none mb-2"
                                autoFocus
                              />
                          ) : (
                              <h4 className="font-bold text-white text-xl leading-tight mb-2 min-h-[3.5rem] flex items-center">
                                  {cluster.name}
                              </h4>
                          )}
                          
                          {isEditing ? (
                              <textarea 
                                value={editForm.summary}
                                onChange={(e) => setEditForm({...editForm, summary: e.target.value})}
                                className="w-full bg-black/50 border border-white/20 rounded p-2 text-sm text-gray-300 focus:border-neon-purple focus:outline-none min-h-[100px]"
                              />
                          ) : (
                              <p className="text-gray-300 text-sm leading-relaxed italic min-h-[80px]">
                                "{cluster.summary}"
                              </p>
                          )}
                      </div>

                      {/* Action Button - Moved Up */}
                      <div className="px-6 pb-4 bg-transparent">
                          <button
                            onClick={() => {
                              onSelectCluster(cluster);
                              onClose();
                            }}
                            className="w-full py-3 bg-neon-purple hover:bg-purple-600 text-white text-xs font-bold rounded flex items-center justify-center transition-all uppercase tracking-widest shadow-lg shadow-purple-900/20 group-hover:scale-[1.02]"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Selecteer Concept
                          </button>
                      </div>

                      {/* Original Ideas Visuals */}
                      <div className="flex-1 bg-black/20 p-4 border-t border-white/5">
                          <h5 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-3 flex items-center">
                              <Sparkles className="w-3 h-3 mr-1" /> Gebaseerd op
                          </h5>
                          <div className="space-y-3">
                              {originalIdeas.map((idea) => (
                                  <div key={idea.id} className="bg-white/5 rounded-md p-3 border border-white/5 hover:bg-white/10 transition-colors group/idea">
                                      <div className="flex items-center justify-between mb-1">
                                          <div className="flex items-center">
                                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-[10px] font-bold text-gray-400 border border-white/10 mr-2">
                                                  <User className="w-3 h-3" />
                                              </div>
                                              <span className="text-xs font-bold text-gray-400 group-hover/idea:text-white transition-colors">
                                                  {idea.name}
                                              </span>
                                          </div>
                                      </div>
                                      <p className="text-xs text-gray-500 line-clamp-2 group-hover/idea:text-gray-300 transition-colors pl-7">
                                          {idea.content}
                                      </p>
                                  </div>
                              ))}
                          </div>
                      </div>
                      
                      {/* Action Footer - Removed (moved up) */}
                      {/* <div className="p-4 bg-black/40 border-t border-white/5">
                         
                      </div> */}
                    </div>
                    );
                  })
                )}
              </div>
            )}
        </div>

        <div className="flex-shrink-0 p-4 bg-black/40 border-t border-white/5 text-center">
          <p className="text-[10px] text-gray-600 font-mono">
            CLUSTERS: {clusters.length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClusterIdeasModal;
