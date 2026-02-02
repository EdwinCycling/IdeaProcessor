import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, User, Bot, Download, Trash2, Copy, Sparkles } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Idea, IdeaDetails } from '../types';
import { chatWithIdeaProfessor } from '../services/ai';
import ConfirmationModal from './ConfirmationModal';

interface ChatAssistantProps {
  idea: Idea;
  analysis: IdeaDetails;
  context: string;
  isOpen: boolean;
  onToggle: () => void;
  width: number;
  onWidthChange: (width: number) => void;
  pastedText?: string;
  onClearPastedText?: () => void;
}

type Role = 'PRODUCT_MANAGER' | 'INVESTOR' | 'SALES';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  roleLabel?: string; // To show which professor answered
  suggestedFollowUp?: string;
}

const ROLES: { id: Role; label: string; description: string; color: string }[] = [
  { id: 'PRODUCT_MANAGER', label: 'Professor Product Manager', description: 'Focus op uitvoering & roadmap', color: 'text-neon-cyan' },
  { id: 'INVESTOR', label: 'Professor Investor', description: 'Focus op ROI & Business Model', color: 'text-neon-green' },
  { id: 'SALES', label: 'Professor Sales', description: 'Focus op Kansen & Pitch', color: 'text-exact-red' }
];

const ChatAssistant: React.FC<ChatAssistantProps> = ({ 
  idea, 
  analysis, 
  context, 
  isOpen, 
  onToggle, 
  width, 
  onWidthChange,
  pastedText,
  onClearPastedText 
}) => {
  const [currentRole, setCurrentRole] = useState<Role>('PRODUCT_MANAGER');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [showCopySuccessModal, setShowCopySuccessModal] = useState(false);

  // Initialize chat with default context
  useEffect(() => {
    if (messages.length === 0) {
      const initialMessage: Message = {
        id: 'init',
        role: 'assistant',
        content: `Hallo! Ik ben jouw **Idea Professor**. \n\nIk heb het idee van **"${idea.name}"** geanalyseerd. \n\nSelecteer hierboven een rol (Product Manager, Investor, of Sales) en stel me een vraag, of laat me een vervolgvraag bedenken!`,
        timestamp: Date.now(),
        roleLabel: 'System'
      };
      setMessages([initialMessage]);
    }
  }, [idea.name]);

  // Handle pasted text
  useEffect(() => {
    if (pastedText) {
      setInputValue(pastedText);
      if (onClearPastedText) onClearPastedText();
    }
  }, [pastedText, onClearPastedText]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Resizing Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 300 && newWidth < 800) {
        onWidthChange(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onWidthChange]);

  const handleSendMessage = async (text: string = inputValue) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const apiHistory = messages
        .filter(m => m.id !== 'init')
        .map(m => ({ role: m.role, content: m.content }));
      
      apiHistory.push({ role: 'user', content: text });

      const rawResponse = await chatWithIdeaProfessor(apiHistory, currentRole, context, idea, analysis);

      // Parse response for follow-up and remove "Edwin"
      let cleanContent = rawResponse;
      let suggestedFollowUp = undefined;

      // Extract Follow Up
      const followUpMatch = rawResponse.match(/\[FOLLOW_UP: "(.*?)"\]/);
      if (followUpMatch) {
        suggestedFollowUp = followUpMatch[1];
        cleanContent = cleanContent.replace(followUpMatch[0], '').trim();
      }

      // Remove "Edwin"
      cleanContent = cleanContent.replace(/\*\*Edwin\*\*/gi, '').replace(/Edwin/gi, '');

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: cleanContent,
        timestamp: Date.now(),
        roleLabel: ROLES.find(r => r.id === currentRole)?.label,
        suggestedFollowUp
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, ik kon geen verbinding maken. Probeer het opnieuw.",
        timestamp: Date.now(),
        roleLabel: 'System'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateFollowUp = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const apiHistory = messages
        .filter(m => m.id !== 'init')
        .map(m => ({ role: m.role, content: m.content }));
      
      // Add the hidden instruction to generate a question
      apiHistory.push({ 
        role: 'user', 
        content: "Bedenk een kritische of inspirerende vervolgvraag die ik (als gebruiker) aan jou zou kunnen stellen over dit idee. Geef ALLEEN de vraag terug, zonder introductie of quotes. Zorg dat de vraag kort en krachtig is." 
      });

      const generatedQuestion = await chatWithIdeaProfessor(apiHistory, currentRole, context, idea, analysis);
      
      setIsLoading(false);

      if (generatedQuestion && generatedQuestion.trim()) {
        const cleanQuestion = generatedQuestion.replace(/^["']|["']$/g, '').trim();
        handleSendMessage(cleanQuestion);
      }
    } catch (error) {
      console.error("Failed to generate follow-up:", error);
      setIsLoading(false);
    }
  };

  const handleRoleChange = (newRole: Role) => {
    if (currentRole === newRole) return;
    
    setCurrentRole(newRole);
    const roleInfo = ROLES.find(r => r.id === newRole);
    
    const systemMsg: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `🔄 **Rol Gewijzigd**: Ik spreek nu als **${roleInfo?.label}**. \n_${roleInfo?.description}_`,
      timestamp: Date.now(),
      roleLabel: 'System'
    };
    setMessages(prev => [...prev, systemMsg]);
  };

  const handleClearHistory = () => {
    setShowClearHistoryModal(true);
  };

  const confirmClearHistory = () => {
    setMessages([{
      id: 'init',
      role: 'assistant',
      content: `Geschiedenis gewist. Klaar voor een nieuwe start met **"${idea.name}"**.`,
      timestamp: Date.now(),
      roleLabel: 'System'
    }]);
  };

  const handleCopyHistory = () => {
    const text = messages.map(m => `[${m.roleLabel || m.role}]: ${m.content}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setShowCopySuccessModal(true);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Idea Professor Chat Log - ${idea.name}`, 10, 10);
    doc.setFontSize(10);
    let y = 20;
    
    messages.forEach(msg => {
      if (y > 280) {
        doc.addPage();
        y = 10;
      }
      const role = msg.roleLabel || (msg.role === 'user' ? 'User' : 'AI');
      doc.setFont("helvetica", "bold");
      doc.text(`${role} (${new Date(msg.timestamp).toLocaleTimeString()}):`, 10, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(msg.content, 180);
      doc.text(lines, 10, y);
      y += (lines.length * 5) + 5;
    });

    doc.save(`chat-export-${idea.id}.pdf`);
  };

  // Simple Markdown Formatter (Bold only for now)
  const formatMessage = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="text-neon-green">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed bottom-32 right-8 z-50 bg-neon-green text-black p-4 rounded-full shadow-lg shadow-neon-green/20 hover:scale-110 transition-transform animate-in zoom-in duration-300 group"
          title="Open Idea Professor"
        >
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping"></div>
          <MessageSquare className="w-6 h-6" />
          <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-black/80 text-white px-3 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
             Chat met Professor
          </span>
        </button>
      )}

      {isOpen && (
        <div 
          className="h-full bg-[#121212] border-l border-white/10 shadow-2xl z-40 flex flex-col flex-shrink-0 animate-in slide-in-from-right duration-300 relative"
          style={{ width: `${width}px` }}
        >
          <ConfirmationModal
            isOpen={showClearHistoryModal}
            onClose={() => setShowClearHistoryModal(false)}
            onConfirm={confirmClearHistory}
            title="Geschiedenis Wissen"
            message="Weet je zeker dat je de volledige chatgeschiedenis van deze sessie wilt wissen?"
            confirmText="Wissen"
            cancelText="Annuleren"
            variant="danger"
          />

          {/* Resize Handle */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-neon-green/50 transition-colors z-50"
            onMouseDown={() => setIsResizing(true)}
          />

          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#1A1A1A]">
             <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-green to-blue-500 flex items-center justify-center mr-3 shadow-lg">
                   <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                   <h3 className="font-bold text-white">Idea Professor</h3>
                   <p className="text-xs text-gray-400">AI-simulatie van mogelijke antwoorden op basis van context.</p>
                </div>
             </div>
             <button onClick={onToggle} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
             </button>
          </div>

        {/* Role Selector */}
        <div className="p-3 bg-black/20 border-b border-white/5 flex-shrink-0">
            <div className="flex space-x-1 bg-white/5 p-1 rounded-lg">
                {ROLES.map(role => (
                    <button
                        key={role.id}
                        onClick={() => handleRoleChange(role.id)}
                        className={`flex-1 py-2 px-1 text-xs font-bold rounded-md transition-all text-center whitespace-nowrap overflow-hidden text-ellipsis ${
                            currentRole === role.id 
                            ? 'bg-exact-red text-white shadow-lg' 
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                        title={role.description}
                    >
                        {role.label.replace('Professor ', '')}
                    </button>
                ))}
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center italic truncate">
                {ROLES.find(r => r.id === currentRole)?.description}
            </p>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-exact-dark/50">
          {messages.map((msg) => (
            <div 
                key={msg.id} 
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
                <div className={`flex items-center space-x-2 mb-1 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-gray-600' : 'bg-exact-red'}`}>
                        {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                    </div>
                    <span className="text-xs text-gray-400">
                        {msg.roleLabel || (msg.role === 'user' ? 'Jij' : 'AI')}
                    </span>
                </div>
                
                <div 
                    className={`max-w-[90%] p-3 rounded-lg text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user' 
                        ? 'bg-blue-600/20 border border-blue-500/30 text-white rounded-tr-none' 
                        : 'bg-white/10 border border-white/10 text-gray-200 rounded-tl-none'
                    }`}
                >
                    {formatMessage(msg.content)}

                    {/* Suggested Follow Up */}
                    {msg.suggestedFollowUp && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                            <p className="text-xs text-gray-500 mb-2 italic">Suggestie:</p>
                            <button 
                                onClick={() => handleSendMessage(msg.suggestedFollowUp)}
                                className="text-left w-full p-2 bg-neon-green/10 border border-neon-green/30 rounded hover:bg-neon-green/20 text-neon-green text-xs flex items-start transition-colors group"
                            >
                                <Sparkles className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0 group-hover:rotate-12 transition-transform" />
                                {msg.suggestedFollowUp}
                            </button>
                        </div>
                    )}
                </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start space-x-2">
                <div className="w-6 h-6 rounded-full bg-exact-red flex items-center justify-center animate-pulse">
                    <Bot size={12} />
                </div>
                <div className="bg-white/5 p-3 rounded-lg rounded-tl-none">
                    <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-exact-panel border-t border-white/10 flex-shrink-0">
           {/* Suggestions */}
           {!isLoading && (
               <div className="flex mb-3 overflow-x-auto space-x-2 pb-2 scrollbar-hide">
                   <button 
                    onClick={handleGenerateFollowUp}
                    className="flex items-center whitespace-nowrap px-3 py-1.5 bg-neon-purple/10 border border-neon-purple/30 hover:bg-neon-purple/20 text-neon-purple text-xs rounded-full transition-colors"
                   >
                       <Sparkles className="w-3 h-3 mr-1" />
                       Genereer vervolgvraag
                   </button>
               </div>
           )}

           <div className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Stel een vraag aan de professor..."
                className="w-full bg-black/30 border border-white/10 rounded-lg pl-4 pr-12 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-exact-red focus:ring-1 focus:ring-exact-red transition-all"
                disabled={isLoading}
              />
              <button 
                onClick={() => handleSendMessage()}
                disabled={isLoading || !inputValue.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-exact-red text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
           </div>
        </div>
        </div>
      )}
    </>
  );
};

export default ChatAssistant;
