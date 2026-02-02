import React, { useState, useEffect, useRef } from 'react';
import { Power, Users, Activity, LogOut, Brain, Check, ArrowRight, Play, FileText, List, HelpCircle, ArrowLeft, RotateCcw, Download, X, Settings, Save, LayoutDashboard, Clock, Zap, MessageSquare, Briefcase, TrendingUp, AlertTriangle, EyeOff, Skull, Megaphone, Share2, Hash, Target, File as FileIcon } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { collection, query, orderBy, onSnapshot, doc, setDoc, getDoc, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db, COLLECTIONS, CURRENT_SESSION_ID } from '../services/firebase';
import { TEXTS } from '../constants/texts';
import { Idea, AIAnalysisResult, IdeaDetails } from '../types';
import { analyzeIdeas, generateIdeaDetails } from '../services/ai';
import ChatAssistant from './ChatAssistant';

interface AdminDashboardProps {
  onLogout: () => void;
  currentAccessCode: string;
  onUpdateAccessCode: (code: string) => void;
}

type DashboardPhase = 'MENU' | 'SETUP' | 'LIVE' | 'ANALYSIS' | 'DETAIL';
type DetailTab = 'GENERAL' | 'QUESTIONS' | 'AI_ANSWERS' | 'BUSINESS_CASE' | 'DEVILS_ADVOCATE' | 'MARKETING';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, currentAccessCode, onUpdateAccessCode }) => {
  const [phase, setPhase] = useState<DashboardPhase>('MENU');
  const [context, setContext] = useState('');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [tempAccessCode, setTempAccessCode] = useState(currentAccessCode);
  const [defaultContext, setDefaultContext] = useState('');
  
  // Analysis State
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [animatedScore, setAnimatedScore] = useState(0);

  // Detail State
  const [ideaDetails, setIdeaDetails] = useState<IdeaDetails | null>(null);
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
  const [showPBIModal, setShowPBIModal] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('GENERAL');

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(450);
  const [chatPastedText, setChatPastedText] = useState('');

  const handleCopyToChat = (text: string) => {
    setChatPastedText(`Ik wil graag dieper ingaan op dit punt: "${text}"`);
    setIsChatOpen(true);
  };

  const handleAddToChat = (text: string) => {
    handleCopyToChat(text);
  };

  // Timer States
  const [sessionDuration, setSessionDuration] = useState(0); // In seconds
  const [isClosing, setIsClosing] = useState(false);
  const [closingCountdown, setClosingCountdown] = useState(10);

  // Scroll ref for log
  const logEndRef = useRef<HTMLDivElement>(null);

  // Pre-fill context from default when entering setup
  useEffect(() => {
    if (phase === 'SETUP' && !context) {
        // First try to use the loaded default context
        if (defaultContext) {
            setContext(defaultContext);
        } else {
            // Fallback: Try to fetch fresh if needed (though useEffect on mount should have handled it)
            const fetchContext = async () => {
                if (!db) return;
                try {
                    const sessionRef = doc(db, COLLECTIONS.SESSIONS, CURRENT_SESSION_ID);
                    const sessionSnap = await getDoc(sessionRef);
                    if (sessionSnap.exists() && sessionSnap.data().defaultContext) {
                         setContext(sessionSnap.data().defaultContext);
                         setDefaultContext(sessionSnap.data().defaultContext);
                    }
                } catch (e) {
                    console.error("Error fetching context:", e);
                }
            };
            fetchContext();
        }
    }
  }, [phase, defaultContext, context]);

  // Load settings from Firestore on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!db) return;
      try {
        const sessionRef = doc(db, COLLECTIONS.SESSIONS, CURRENT_SESSION_ID);
        const sessionSnap = await getDoc(sessionRef);
        if (sessionSnap.exists()) {
          const data = sessionSnap.data();
          if (data.accessCode) {
            onUpdateAccessCode(data.accessCode);
            setTempAccessCode(data.accessCode);
          }
          if (data.defaultContext) {
            setDefaultContext(data.defaultContext);
          }
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      }
    };
    loadSettings();
  }, []);

  // Reports State
  const [showReports, setShowReports] = useState(false);
  const [savedReports, setSavedReports] = useState<any[]>([]);

  useEffect(() => {
    if (showReports && db) {
        const q = query(collection(db, COLLECTIONS.SESSIONS, CURRENT_SESSION_ID, 'reports'), orderBy('generatedAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setSavedReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }
  }, [showReports]);

  // Phase 2: Live Data & Timer
  useEffect(() => {
    let timerInterval: ReturnType<typeof setInterval>;
    let unsubscribe: () => void;

    if (phase === 'LIVE' && !isClosing) {
      if (!db) {
        console.error("Firestore not initialized");
        return;
      }
      // 1. Real-time Firestore Listener
      const q = query(
        collection(db, COLLECTIONS.SESSIONS, CURRENT_SESSION_ID, COLLECTIONS.IDEAS), 
        orderBy("timestamp", "asc")
      );
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const newIdeas = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        })) as Idea[];
        setIdeas(newIdeas);
      });

      // 2. Session Duration Timer
      timerInterval = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(timerInterval);
    };
  }, [phase, isClosing]);

  // Phase 2b: Closing Countdown Logic
  useEffect(() => {
    let countdownInterval: ReturnType<typeof setInterval>;

    if (isClosing && closingCountdown > 0) {
      countdownInterval = setInterval(() => {
        setClosingCountdown(prev => prev - 1);
      }, 1000);
    } else if (isClosing && closingCountdown === 0) {
       // Timer finished, switch phase
       setIsClosing(false);
       setPhase('ANALYSIS');
       
       // Close session for public
       if (db) {
          setDoc(doc(db, COLLECTIONS.SESSIONS, CURRENT_SESSION_ID), {
            isActive: false,
            updatedAt: Date.now()
          }, { merge: true }).catch(err => console.error("Error closing session:", err));
       }
    }

    return () => clearInterval(countdownInterval);
  }, [isClosing, closingCountdown]);


  // Auto-scroll log
  useEffect(() => {
    if (phase === 'LIVE' && logEndRef.current) {
        logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ideas, phase]);

  // Phase 3: Trigger Analysis
  useEffect(() => {
    if (phase === 'ANALYSIS' && !analysis) {
      const runAnalysis = async () => {
        setIsAnalyzing(true);
        const result = await analyzeIdeas(context, ideas);
        setAnalysis(result);
        setIsAnalyzing(false);
      };
      runAnalysis();
    }
  }, [phase, context, ideas]);

  // Phase 3b: Animate Score
  useEffect(() => {
    if (phase === 'ANALYSIS' && analysis && animatedScore < analysis.innovationScore) {
      const timeout = setTimeout(() => {
        setAnimatedScore(prev => Math.min(prev + 2, analysis.innovationScore));
      }, 30);
      return () => clearTimeout(timeout);
    }
  }, [phase, analysis, animatedScore]);

  const handleStartSession = async () => {
    if (!context.trim()) return;
    
    // Clear local state
    setIdeas([]);
    setSessionDuration(0); // Reset timer
    setAnimatedScore(0);
    
    if (db) {
      try {
        // 1. Clear existing ideas from Firestore (Clean Slate) FIRST
        const ideasRef = collection(db, COLLECTIONS.SESSIONS, CURRENT_SESSION_ID, COLLECTIONS.IDEAS);
        const snapshot = await getDocs(ideasRef);
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        // 2. Save session status to Firestore
        await setDoc(doc(db, COLLECTIONS.SESSIONS, CURRENT_SESSION_ID), {
          isActive: true,
          context: context, // Save the context so users can see it
          updatedAt: Date.now()
        }, { merge: true });

        // 3. ONLY THEN Start listener (Phase change triggers useEffect)
        setPhase('LIVE');
      } catch (err) {
        console.error("Error starting session:", err);
        // Fallback: start anyway if cleanup fails, but warn
        setPhase('LIVE');
      }
    } else {
        // Mock mode
        setPhase('LIVE');
    }
  };

  const handleStopSession = async () => {
    // Instead of immediate stop, trigger countdown
    setIsClosing(true);
    setClosingCountdown(10);
  };

  const handleCancelSession = async () => {
      if (confirm("Weet je zeker dat je de sessie wilt annuleren? Alle data van deze sessie gaat verloren.")) {
           if (db) {
              try {
                  await setDoc(doc(db, COLLECTIONS.SESSIONS, CURRENT_SESSION_ID), {
                  isActive: false,
                  updatedAt: Date.now()
                  }, { merge: true });
              } catch (err) {
                  console.error("Error cancelling session:", err);
              }
            }
            handleReset();
      }
  };

  const handleSelectIdea = async () => {
    if (!selectedIdeaId || !analysis) return;
    
    setIsGeneratingDetails(true);
    // Reset tab to general
    setActiveTab('GENERAL');
    
    const selectedIdea = analysis.topIdeas.find(i => i.id === selectedIdeaId);
    
    if (selectedIdea) {
        const details = await generateIdeaDetails(context, selectedIdea);
        setIdeaDetails(details);
        setPhase('DETAIL');
    }
    setIsGeneratingDetails(false);
  };

  const handleReset = () => {
      setPhase('MENU');
      setContext('');
      setIdeas([]);
      setAnalysis(null);
      setSelectedIdeaId(null);
      setIdeaDetails(null);
      setSessionDuration(0);
      setIsClosing(false);
      setAnimatedScore(0);
  };

  const handleBackToAnalysis = () => {
      setPhase('ANALYSIS');
      setIdeaDetails(null);
  };

  const handleSaveSettings = async () => {
      if (tempAccessCode.length >= 3) {
        onUpdateAccessCode(tempAccessCode);
        
        // Save to Firestore for persistence
        if (db) {
          try {
            await setDoc(doc(db, COLLECTIONS.SESSIONS, CURRENT_SESSION_ID), {
              accessCode: tempAccessCode,
              defaultContext: defaultContext,
              updatedAt: Date.now()
            }, { merge: true });
          } catch (err) {
            console.error("Error saving settings to Firestore:", err);
          }
        }
      }
      setShowSettings(false);
      // If we are in setup, update current context too if empty
      if (phase === 'SETUP' && !context) {
          setContext(defaultContext);
      }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownloadPDF = async () => {
    if (!selectedIdea || !ideaDetails) return;

    const doc = new jsPDF();
    const margin = 20;
    let yPos = 20;

    // --- PAGE 1: TITLE & RATIONALE ---
    
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Exact Idea Processor - Plan", margin, yPos);
    yPos += 15;

    // Context
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Context: ${context}`, margin, yPos);
    yPos += 15;

    // Selected Idea
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(`Idee: ${selectedIdea.name}`, margin, yPos);
    yPos += 8;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    const ideaLines = doc.splitTextToSize(selectedIdea.content, 170);
    doc.text(ideaLines, margin, yPos);
    yPos += ideaLines.length * 6 + 10;

    // Rationale
    doc.setFont("helvetica", "bold");
    doc.text("Waarom dit een goed idee is:", margin, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    const rationaleLines = doc.splitTextToSize(ideaDetails.rationale, 170);
    doc.text(rationaleLines, margin, yPos);
    yPos += rationaleLines.length * 6 + 10;

    // Steps
    doc.setFont("helvetica", "bold");
    doc.text("Implementatie Stappen:", margin, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    ideaDetails.steps.forEach((step, i) => {
        doc.text(`${i + 1}. ${step}`, margin, yPos);
        yPos += 7;
    });
    yPos += 15;

    // --- BUSINESS CASE (Added) ---
    if (yPos > 240) { doc.addPage(); yPos = 20; }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Business Case Report", margin, yPos);
    yPos += 10;
    
    doc.setFontSize(11);
    const bc = ideaDetails.businessCase;
    
    const printBCItem = (label: string, content: string) => {
        if (yPos > 260) { doc.addPage(); yPos = 20; }
        doc.setFont("helvetica", "bold");
        doc.text(label, margin, yPos);
        yPos += 5;
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(content, 170);
        doc.text(lines, margin, yPos);
        yPos += lines.length * 5 + 5;
    };

    printBCItem("Probleemstelling:", bc.problemStatement);
    printBCItem("Oplossing:", bc.proposedSolution);
    printBCItem("Strategische Fit:", bc.strategicFit);
    printBCItem("Financiële Impact:", bc.financialImpact);
    
    // Risks
    if (yPos > 260) { doc.addPage(); yPos = 20; }
    doc.setFont("helvetica", "bold");
    doc.text("Risico's:", margin, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    bc.risks.forEach(risk => {
        doc.text(`- ${risk}`, margin, yPos);
        yPos += 5;
    });
    yPos += 15;

    // --- DEVIL'S ADVOCATE (Added) ---
    if (ideaDetails.devilsAdvocate) {
        if (yPos > 220) { doc.addPage(); yPos = 20; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Devil's Advocate Analysis", margin, yPos);
        yPos += 10;
        doc.setFontSize(11);

        printBCItem("Kritiek:", ideaDetails.devilsAdvocate.critique);
        printBCItem("Pre-Mortem (Waarom faalde het?):", ideaDetails.devilsAdvocate.preMortem);

        if (yPos > 260) { doc.addPage(); yPos = 20; }
        doc.setFont("helvetica", "bold");
        doc.text("Blinde Vlekken:", margin, yPos);
        yPos += 5;
        doc.setFont("helvetica", "normal");
        ideaDetails.devilsAdvocate.blindSpots.forEach(bs => {
             doc.text(`- ${bs}`, margin, yPos);
             yPos += 5;
        });
        yPos += 15;
    }

    // --- MARKETING (Added) ---
    if (ideaDetails.marketing) {
        if (yPos > 220) { doc.addPage(); yPos = 20; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Marketing & Pitch Assets", margin, yPos);
        yPos += 10;
        doc.setFontSize(11);

        printBCItem("Slogan:", ideaDetails.marketing.slogan);
        printBCItem("Doelgroep:", ideaDetails.marketing.targetAudience);
        printBCItem("LinkedIn Post:", ideaDetails.marketing.linkedInPost);
        printBCItem("Viral Tweet:", ideaDetails.marketing.viralTweet);
    }

    // --- Q&A SIMULATION ---
    if (yPos > 240) { doc.addPage(); yPos = 20; }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("AI Simulatie: Vraag & Antwoord", margin, yPos);
    yPos += 10;
    
    doc.setFontSize(11);
    ideaDetails.questions.forEach((q, i) => {
        if (yPos > 250) { doc.addPage(); yPos = 20; }
        
        doc.setFont("helvetica", "bold");
        doc.setTextColor(200, 0, 0); // Dark Red
        const qLines = doc.splitTextToSize(`Q: ${q}`, 170);
        doc.text(qLines, margin, yPos);
        yPos += qLines.length * 5 + 2;

        if (ideaDetails.questionAnswers && ideaDetails.questionAnswers[i]) {
            doc.setFont("helvetica", "italic");
            doc.setTextColor(50, 50, 50);
            const aLines = doc.splitTextToSize(`A: ${ideaDetails.questionAnswers[i]}`, 170);
            doc.text(aLines, margin, yPos);
            yPos += aLines.length * 5 + 6;
        } else {
            yPos += 6;
        }
        doc.setTextColor(0);
    });

    // --- PBIs ---
    doc.addPage();
    yPos = 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Product Backlog Items:", margin, yPos);
    yPos += 10;
    
    doc.setFontSize(11);
    ideaDetails.pbis.forEach((pbi) => {
        if (yPos > 260) {
            doc.addPage();
            yPos = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.text(`[${pbi.storyPoints} PTS] ${pbi.title}`, margin, yPos);
        yPos += 5;
        doc.setFont("helvetica", "normal");
        const descLines = doc.splitTextToSize(pbi.description, 170);
        doc.text(descLines, margin, yPos);
        yPos += descLines.length * 6 + 5;
    });

    // --- APPENDIX PAGE: ALL IDEAS ---
    doc.addPage();
    yPos = 20;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.text("Appendix: Alle Ingezonden Ideeën", margin, yPos);
    yPos += 15;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    ideas.forEach((idea, index) => {
        // Check for page break
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }

        // Idea Header
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}. ${idea.name}`, margin, yPos);
        const timeStr = new Date(idea.timestamp).toLocaleTimeString('nl-NL');
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100);
        doc.text(timeStr, 170, yPos);
        yPos += 5;

        // Idea Content
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0);
        const contentLines = doc.splitTextToSize(idea.content, 170);
        doc.text(contentLines, margin, yPos);
        
        yPos += contentLines.length * 5 + 8; // Spacing between items
    });

    // --- SAVE PDF TO FIRESTORE (Base64) ---
    try {
        if (db) {
            const pdfBase64 = doc.output('datauristring');
            const fileName = `Exact_Idea_${selectedIdea.name.replace(/\s+/g, '_')}_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`;
            
            await addDoc(collection(db, COLLECTIONS.SESSIONS, CURRENT_SESSION_ID, 'reports'), {
                name: fileName,
                ideaName: selectedIdea.name,
                generatedAt: Date.now(),
                content: pdfBase64, // Note: Firestore has a 1MB limit per doc. For large PDFs, use Storage.
                type: 'pdf'
            });
            console.log("PDF saved to database");
        }
    } catch (e) {
        console.error("Error saving PDF to DB:", e);
    }

    doc.save(`Exact_Idea_${selectedIdea.name.replace(/\s+/g, '_')}.pdf`);
  };
  
  const handleExportCSV = () => {
    if (!ideaDetails || !selectedIdea) return;
    
    const headers = ["Title", "Story Points", "Description"];
    // Map data to CSV rows
    const rows = ideaDetails.pbis.map(pbi => [
      `"${pbi.title.replace(/"/g, '""')}"`,
      pbi.storyPoints,
      `"${pbi.description.replace(/"/g, '""')}"`
    ]);
    
    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PBI_${selectedIdea.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedIdea = analysis?.topIdeas.find(i => i.id === selectedIdeaId);

  return (
    <div className="h-screen bg-exact-dark text-white font-sans flex flex-col overflow-hidden relative">
      
      {/* --- COUNTDOWN OVERLAY --- */}
      {isClosing && (
        <div className="absolute inset-0 z-[200] bg-black flex flex-col items-center justify-center animate-in fade-in duration-300">
           <h2 className="text-4xl text-gray-500 font-mono tracking-widest mb-4">CLOSING SESSION</h2>
           <div className={`text-[15rem] leading-none font-black text-exact-red transition-all duration-75 ${closingCountdown <= 3 ? 'animate-pulse' : ''}`}>
             {closingCountdown}
           </div>
           <p className="mt-8 text-xl text-white">Saving data & Initializing AI...</p>
        </div>
      )}

      {/* Admin Navbar */}
      <nav className="bg-exact-panel border-b border-white/10 px-6 h-16 flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center space-x-4">
             <span className="font-sans font-black text-xl tracking-tighter">
                <span className="text-exact-red text-2xl">{TEXTS.APP_NAME.PREFIX}</span> {TEXTS.APP_NAME.MAIN} <span className="text-gray-400 font-light text-sm uppercase">{TEXTS.ADMIN_DASHBOARD.TITLE}</span>
                <span className="text-gray-600 text-xs ml-2 font-mono">{TEXTS.APP_NAME.VERSION}</span>
              </span>
             <span className={`px-2 py-0.5 rounded-full text-xs font-mono border ${phase === 'LIVE' ? 'border-neon-green text-neon-green' : 'border-gray-600 text-gray-500'}`}>
                {phase === 'MENU' && 'DASHBOARD'}
                {phase === 'SETUP' && 'SETUP'}
                {phase === 'LIVE' && TEXTS.ADMIN_DASHBOARD.LIVE.STATUS_ACTIVE}
                {phase === 'ANALYSIS' && TEXTS.ADMIN_DASHBOARD.ANALYSIS.STATUS_DONE}
                {phase === 'DETAIL' && 'DEEP DIVE'}
             </span>
        </div>
        <div className="flex items-center space-x-4">
            {phase === 'LIVE' && (
                <div className="flex items-center bg-black/50 px-3 py-1 rounded border border-white/10 text-neon-cyan font-mono animate-pulse-slow">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>{formatDuration(sessionDuration)}</span>
                </div>
            )}
            <div className="h-4 w-px bg-white/20"></div>
            <button 
                onClick={() => setShowSettings(true)}
                className="text-gray-400 hover:text-white flex items-center text-sm font-mono transition-colors"
                title={TEXTS.NAV.SETTINGS}
            >
                <Settings className="w-5 h-5" />
            </button>
            <div className="h-4 w-px bg-white/20"></div>
            <button onClick={onLogout} className="text-gray-400 hover:text-white flex items-center text-sm font-mono">
                {TEXTS.ADMIN_DASHBOARD.LOGOUT} <LogOut className="ml-2 w-4 h-4" />
            </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-6 flex flex-col overflow-hidden relative">
        
        {/* PHASE 0: MENU (HUB) */}
        {phase === 'MENU' && (
            <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
                    {/* Settings Card */}
                    <button 
                        onClick={() => setShowSettings(true)}
                        className="group bg-exact-panel border border-white/10 p-10 rounded-lg hover:border-white/30 hover:bg-white/5 transition-all text-left flex flex-col"
                    >
                        <div className="p-4 bg-white/5 rounded-full w-fit mb-6 group-hover:scale-110 transition-transform">
                            <Settings className="w-10 h-10 text-gray-400 group-hover:text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">{TEXTS.ADMIN_DASHBOARD.HUB.BTN_SETTINGS}</h3>
                        <p className="text-gray-400">{TEXTS.ADMIN_DASHBOARD.HUB.DESC_SETTINGS}</p>
                    </button>

                    {/* Start Session Card */}
                    <button 
                        onClick={() => setPhase('SETUP')}
                        className="group bg-exact-panel border border-white/10 p-10 rounded-lg hover:border-exact-red/50 hover:bg-exact-red/5 transition-all text-left flex flex-col"
                    >
                        <div className="p-4 bg-exact-red/10 rounded-full w-fit mb-6 group-hover:scale-110 transition-transform">
                            <Play className="w-10 h-10 text-exact-red" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">{TEXTS.ADMIN_DASHBOARD.HUB.BTN_START}</h3>
                        <p className="text-gray-400">{TEXTS.ADMIN_DASHBOARD.HUB.DESC_START}</p>
                    </button>
                    {/* Reports Card */}
                    <button 
                        onClick={() => setShowReports(true)}
                        className="group bg-exact-panel border border-white/10 p-10 rounded-lg hover:border-white/30 hover:bg-white/5 transition-all text-left flex flex-col"
                    >
                        <div className="p-4 bg-white/5 rounded-full w-fit mb-6 group-hover:scale-110 transition-transform">
                            <FileIcon className="w-10 h-10 text-gray-400 group-hover:text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Rapportages</h3>
                        <p className="text-gray-400">Bekijk eerder gegenereerde PDF's van sessies.</p>
                    </button>
                </div>
            </div>
        )}

        {/* Saved Reports Modal */}
        {showReports && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowReports(false)}>
                <div className="bg-exact-panel border border-white/20 rounded-lg max-w-4xl w-full p-8 shadow-2xl relative animate-in fade-in zoom-in duration-300 flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
                    <button 
                        onClick={() => setShowReports(false)}
                        className="absolute top-6 right-6 text-gray-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                    
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center flex-shrink-0">
                        <FileIcon className="mr-3 text-exact-red" />
                        Opgeslagen Rapportages
                    </h2>

                    <div className="overflow-y-auto flex-1 pr-2">
                        {savedReports.length === 0 ? (
                            <div className="text-center text-gray-500 py-10">
                                Nog geen rapportages gevonden voor deze sessie.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {savedReports.map((report) => (
                                    <div key={report.id} className="bg-white/5 border border-white/10 p-4 rounded hover:bg-white/10 transition-colors flex items-center justify-between group">
                                        <div>
                                            <h4 className="font-bold text-white">{report.ideaName}</h4>
                                            <p className="text-xs text-gray-400 font-mono mt-1">
                                                {new Date(report.generatedAt).toLocaleString('nl-NL')}
                                            </p>
                                        </div>
                                        <a 
                                            href={report.content} 
                                            download={report.name}
                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded text-sm flex items-center transition-colors"
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Download PDF
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* PHASE 1: SETUP */}
        {phase === 'SETUP' && (
          <div className="flex-1 flex items-center justify-center animate-in fade-in zoom-in duration-300 overflow-y-auto">
            <div className="max-w-2xl w-full bg-exact-panel border border-white/10 rounded-lg p-10 shadow-2xl relative">
              <button 
                onClick={() => setPhase('MENU')}
                className="absolute top-4 right-4 text-gray-500 hover:text-white"
              >
                  <X size={20} />
              </button>
              <div className="flex items-center mb-6 text-exact-red">
                <Brain className="w-8 h-8 mr-3" />
                <h2 className="text-2xl font-bold text-white">{TEXTS.ADMIN_DASHBOARD.SETUP.TITLE}</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">{TEXTS.ADMIN_DASHBOARD.SETUP.LABEL}</label>
                  <textarea 
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    className="w-full bg-black/50 border border-white/20 rounded-md p-4 text-xl text-white focus:border-exact-red focus:outline-none min-h-[120px]"
                    placeholder={TEXTS.ADMIN_DASHBOARD.SETUP.PLACEHOLDER}
                  />
                </div>
                
                <button 
                  onClick={handleStartSession}
                  disabled={context.length < 5}
                  className={`w-full py-5 text-lg font-bold rounded-md flex items-center justify-center transition-all ${
                    context.length >= 5 
                      ? 'bg-neon-green text-black hover:bg-green-400 shadow-[0_0_20px_rgba(10,255,10,0.3)]' 
                      : 'bg-white/5 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Play className="mr-2 w-5 h-5" />
                  {TEXTS.ADMIN_DASHBOARD.SETUP.BTN_START}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PHASE 2: LIVE */}
        {phase === 'LIVE' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full animate-in fade-in duration-500">
             {/* Left: QR Code */}
             <div className="bg-black/40 border border-white/10 rounded-lg p-8 flex flex-col items-center justify-center relative overflow-hidden h-full">
                <div className="text-center">
                    <div className="bg-white p-4 rounded-lg shadow-[0_0_50px_rgba(255,255,255,0.1)] mb-6 mx-auto inline-block">
                        <img 
                            src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=ExactIdeaProcessor" 
                            alt="Scan QR" 
                            className="w-64 h-64 md:w-80 md:h-80 object-contain"
                        />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{TEXTS.ADMIN_DASHBOARD.LIVE.SCAN_TITLE}</h2>
                    <p className="text-gray-400 font-mono text-xl">{TEXTS.ADMIN_DASHBOARD.LIVE.CODE_LABEL} <span className="text-exact-red font-bold">{currentAccessCode.toUpperCase()}</span></p>
                </div>
             </div>

             {/* Right: Stats & Logs */}
             <div className="flex flex-col gap-6 h-full min-h-0">
                <div className="grid grid-cols-2 gap-4 flex-shrink-0">
                    <div className="bg-exact-panel border border-white/10 p-6 rounded-lg">
                        <div className="flex items-center text-gray-400 mb-2">
                            <Users className="w-4 h-4 mr-2" />
                            <span className="text-xs font-mono uppercase">{TEXTS.ADMIN_DASHBOARD.LIVE.PARTICIPANTS}</span>
                        </div>
                        <div className="text-4xl font-black">{Math.floor(ideas.length * 1.5)}</div>
                    </div>
                    <div className="bg-exact-panel border border-white/10 p-6 rounded-lg">
                        <div className="flex items-center text-gray-400 mb-2">
                            <Activity className="w-4 h-4 mr-2" />
                            <span className="text-xs font-mono uppercase">{TEXTS.ADMIN_DASHBOARD.LIVE.IDEAS}</span>
                        </div>
                        <div className="text-4xl font-black text-neon-cyan">{ideas.length}</div>
                    </div>
                </div>

                <div className="flex-1 bg-exact-panel border border-white/10 rounded-lg relative flex flex-col min-h-0">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-exact-red to-transparent opacity-20 z-10"></div>
                    
                    <div className="p-6 pb-2 flex-shrink-0 flex justify-between items-center">
                         <h3 className="font-bold text-lg">{TEXTS.ADMIN_DASHBOARD.LIVE.LOG_TITLE}</h3>
                         <span className="text-xs font-mono text-gray-500">LIVE FEED</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-3 font-mono text-xs text-gray-400">
                        <p className="text-white">Context: "{context}"</p>
                        <p className="border-t border-white/5 pt-2">Waiting for input...</p>
                        {ideas.map((idea, i) => (
                           <div key={idea.id} className="text-neon-green animate-in slide-in-from-left-2 fade-in duration-300 flex justify-between">
                             <span>&gt; New idea received from {idea.name}</span>
                             <span className="text-gray-600">
                               {new Date(idea.timestamp).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                             </span>
                           </div>
                        ))}
                        <div ref={logEndRef} />
                    </div>
                </div>

                <div className="flex gap-4 w-full flex-shrink-0">
                    <button
                        onClick={handleStopSession}
                        className="flex-1 py-6 text-xl font-bold rounded-lg shadow-lg bg-neon-green hover:bg-green-400 text-black shadow-green-900/20 flex items-center justify-center transition-all group"
                    >
                        <Power className="mr-3 w-6 h-6 group-hover:scale-110 transition-transform" />
                        {TEXTS.ADMIN_DASHBOARD.LIVE.BTN_STOP}
                    </button>
                    <button
                        onClick={handleCancelSession}
                        className="w-24 py-6 text-xs font-bold rounded-lg shadow-lg bg-exact-red hover:bg-red-700 text-white shadow-red-900/20 flex flex-col items-center justify-center transition-all"
                    >
                        <X className="w-5 h-5 mb-1" />
                        Annuleren
                    </button>
                </div>
             </div>
          </div>
        )}

        {/* PHASE 3: ANALYSIS DASHBOARD */}
        {phase === 'ANALYSIS' && (
          <div className="flex flex-col h-full animate-in slide-in-from-bottom-4 duration-500 overflow-y-auto">
            {isAnalyzing || isGeneratingDetails ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-exact-red border-t-transparent rounded-full animate-spin mb-6"></div>
                <h2 className="text-2xl font-bold text-white animate-pulse">
                    {isGeneratingDetails ? TEXTS.ADMIN_DASHBOARD.DETAIL.LOADING : TEXTS.ADMIN_DASHBOARD.ANALYSIS.LOADING}
                </h2>
              </div>
            ) : (
              <div className="space-y-8 pb-8">
                {/* Header Stats */}
                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                  <div>
                    <h2 className="text-3xl font-black text-white mb-1">{TEXTS.ADMIN_DASHBOARD.ANALYSIS.TITLE}</h2>
                    <p className="text-gray-400">Context: <span className="text-white italic">"{context}"</span></p>
                  </div>
                  <div className="text-right">
                     <span className="block text-3xl font-bold text-neon-cyan">{ideas.length}</span>
                     <span className="text-xs text-gray-500 uppercase">{TEXTS.ADMIN_DASHBOARD.LIVE.IDEAS}</span>
                  </div>
                </div>

                {/* Innovation Intelligence Display */}
                {analysis && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Innovation Score Gauge */}
                        <div className="bg-exact-panel border border-white/10 rounded-lg p-6 flex flex-col items-center justify-center relative overflow-hidden group hover:border-exact-red/30 transition-colors h-[280px]">
                            <div className="absolute top-0 right-0 p-2 text-xs font-mono text-gray-600">AI_CALC_V1</div>
                            
                            <div className="flex-1 flex items-center justify-center">
                                <div className="relative w-40 h-40 flex items-center justify-center">
                                    <svg viewBox="0 0 128 128" className="w-full h-full transform -rotate-90 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r="56"
                                            fill="transparent"
                                            stroke="#333"
                                            strokeWidth="8"
                                        />
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r="56"
                                            fill="transparent"
                                            stroke={animatedScore > 80 ? "#0aff0a" : animatedScore > 50 ? "#00f3ff" : "#E10000"}
                                            strokeWidth="8"
                                            strokeDasharray={351}
                                            strokeDashoffset={351 - (351 * animatedScore) / 100}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000 ease-out"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                         <span className="text-5xl font-black">{animatedScore}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mt-4">Innovation Score</h3>
                        </div>

                        {/* Future Headline & Keywords */}
                        <div className="md:col-span-2 bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-lg p-8 flex flex-col justify-center relative overflow-hidden h-[280px]">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-exact-red/10 rounded-full blur-3xl"></div>
                            
                            <div className="flex items-center space-x-2 text-exact-red font-mono text-xs mb-4">
                                <Zap className="w-4 h-4" />
                                <span>FUTURE INSIGHT GENERATED</span>
                            </div>

                            <h2 className="text-2xl md:text-4xl font-black text-white leading-tight mb-6 italic">
                                "{analysis.headline}"
                            </h2>

                            <div className="flex flex-wrap gap-2">
                                {analysis.keywords.map((keyword, idx) => (
                                    <span 
                                        key={idx} 
                                        className="px-3 py-1 bg-white/10 border border-white/10 rounded-full text-sm font-mono text-neon-cyan animate-in zoom-in duration-500"
                                        style={{ animationDelay: `${idx * 100}ms` }}
                                    >
                                        #{keyword}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Summary Section */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <Brain className="w-6 h-6 text-neon-purple mr-2" />
                    <h3 className="text-xl font-bold text-white">{TEXTS.ADMIN_DASHBOARD.ANALYSIS.SUMMARY_TITLE}</h3>
                  </div>
                  <p className="text-gray-300 leading-relaxed text-lg">
                    {analysis?.summary}
                  </p>
                </div>

                {/* Top Ideas Grid */}
                <div>
                   <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                     {TEXTS.ADMIN_DASHBOARD.ANALYSIS.TOP_3_TITLE}
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {analysis?.topIdeas.map((idea) => (
                        <div 
                          key={idea.id}
                          onClick={() => setSelectedIdeaId(idea.id)}
                          className={`p-6 rounded-lg border cursor-pointer transition-all duration-300 relative ${
                            selectedIdeaId === idea.id 
                              ? 'bg-exact-red/10 border-exact-red shadow-[0_0_20px_rgba(225,0,0,0.2)] transform -translate-y-2' 
                              : 'bg-exact-panel border-white/10 hover:border-white/30 hover:bg-white/5'
                          }`}
                        >
                          {selectedIdeaId === idea.id && (
                            <div className="absolute top-4 right-4 text-exact-red">
                              <Check className="w-6 h-6" />
                            </div>
                          )}
                          <div className="mb-4">
                            <span className="text-xs font-mono text-gray-500">
                                {new Date(idea.timestamp).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <h4 className="font-bold text-white mt-1">{idea.name}</h4>
                          </div>
                          <p className="text-gray-300 text-sm leading-relaxed">
                            "{idea.content}"
                          </p>
                        </div>
                      ))}
                   </div>
                </div>

                {/* Next Step Action */}
                <div className="flex justify-end pt-4 gap-4">
                  <button 
                    onClick={handleReset}
                    className="px-6 py-4 bg-exact-red text-white hover:bg-red-700 font-bold rounded flex items-center transition-all"
                  >
                    <RotateCcw className="mr-2 w-5 h-5" />
                    {TEXTS.ADMIN_DASHBOARD.DETAIL.BTN_RESET}
                  </button>
                  <button 
                    onClick={handleSelectIdea}
                    disabled={!selectedIdeaId}
                    className={`px-8 py-4 font-bold rounded-md flex items-center transition-all ${
                      selectedIdeaId 
                        ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/20' 
                        : 'bg-white/10 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {TEXTS.ADMIN_DASHBOARD.ANALYSIS.BTN_NEXT}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </button>
                </div>

              </div>
            )}
          </div>
        )}

        {/* PHASE 4: DETAIL VIEW (WITH TABS) */}
        {phase === 'DETAIL' && selectedIdea && ideaDetails && (
            <div className="flex h-full animate-in zoom-in-95 duration-500 overflow-hidden">
                <div className="flex flex-col flex-1 overflow-hidden min-w-0 relative">
                {/* Header */}
                <div className="flex-shrink-0 bg-exact-panel border border-white/20 p-6 rounded-lg mb-4 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-exact-red/10 rounded-bl-full -mr-8 -mt-8"></div>
                    <div className="relative z-10">
                        <div className="flex items-center text-exact-red mb-2 font-mono text-sm uppercase tracking-widest">
                            <Check className="w-4 h-4 mr-2" /> Selected Idea
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2">{selectedIdea.name}</h2>
                        <p className="text-xl text-gray-200 italic">"{selectedIdea.content}"</p>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex-shrink-0 flex flex-wrap gap-1 mb-4 border-b border-white/10">
                    <button 
                        onClick={() => setActiveTab('GENERAL')}
                        className={`whitespace-nowrap px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'GENERAL' ? 'border-exact-red text-white bg-white/5' : 'border-transparent text-gray-500 hover:text-white hover:bg-white/5'}`}
                    >
                       <span className="flex items-center"><Brain className="w-4 h-4 mr-2" /> {TEXTS.ADMIN_DASHBOARD.DETAIL.TABS.GENERAL}</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('QUESTIONS')}
                        className={`whitespace-nowrap px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'QUESTIONS' ? 'border-neon-cyan text-white bg-white/5' : 'border-transparent text-gray-500 hover:text-white hover:bg-white/5'}`}
                    >
                       <span className="flex items-center"><HelpCircle className="w-4 h-4 mr-2" /> {TEXTS.ADMIN_DASHBOARD.DETAIL.TABS.QUESTIONS}</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('AI_ANSWERS')}
                        className={`whitespace-nowrap px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'AI_ANSWERS' ? 'border-neon-purple text-white bg-white/5' : 'border-transparent text-gray-500 hover:text-white hover:bg-white/5'}`}
                    >
                       <span className="flex items-center"><MessageSquare className="w-4 h-4 mr-2" /> {TEXTS.ADMIN_DASHBOARD.DETAIL.TABS.AI_ANSWERS}</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('BUSINESS_CASE')}
                        className={`whitespace-nowrap px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'BUSINESS_CASE' ? 'border-neon-green text-white bg-white/5' : 'border-transparent text-gray-500 hover:text-white hover:bg-white/5'}`}
                    >
                       <span className="flex items-center"><Briefcase className="w-4 h-4 mr-2" /> {TEXTS.ADMIN_DASHBOARD.DETAIL.TABS.BUSINESS_CASE}</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('DEVILS_ADVOCATE')}
                        className={`whitespace-nowrap px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'DEVILS_ADVOCATE' ? 'border-orange-500 text-white bg-white/5' : 'border-transparent text-gray-500 hover:text-white hover:bg-white/5'}`}
                    >
                       <span className="flex items-center"><Skull className="w-4 h-4 mr-2" /> {TEXTS.ADMIN_DASHBOARD.DETAIL.TABS.DEVILS_ADVOCATE}</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('MARKETING')}
                        className={`whitespace-nowrap px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'MARKETING' ? 'border-pink-500 text-white bg-white/5' : 'border-transparent text-gray-500 hover:text-white hover:bg-white/5'}`}
                    >
                       <span className="flex items-center"><Megaphone className="w-4 h-4 mr-2" /> {TEXTS.ADMIN_DASHBOARD.DETAIL.TABS.MARKETING}</span>
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto min-h-0 pr-2 pb-4">
                    {activeTab === 'GENERAL' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                             <div className="bg-white/5 border border-white/10 p-6 rounded-lg">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-white">{TEXTS.ADMIN_DASHBOARD.DETAIL.RATIONALE_TITLE}</h3>
                                    <button onClick={() => handleCopyToChat(ideaDetails.rationale)} className="text-gray-400 hover:text-neon-green transition-colors" title="Kopieer naar chat"><MessageSquare className="w-4 h-4" /></button>
                                </div>
                                <p className="text-gray-300 leading-relaxed text-lg">{ideaDetails.rationale}</p>
                            </div>
                            
                            <div className="bg-white/5 border border-white/10 p-6 rounded-lg">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-white flex items-center">
                                        <List className="w-5 h-5 mr-2 text-neon-green" />
                                        {TEXTS.ADMIN_DASHBOARD.DETAIL.PLAN_TITLE}
                                    </h3>
                                    <button onClick={() => handleCopyToChat(ideaDetails.steps?.map((s, i) => `${i+1}. ${s}`).join('\n') || '')} className="text-gray-400 hover:text-neon-green transition-colors" title="Kopieer naar chat"><MessageSquare className="w-4 h-4" /></button>
                                </div>
                                <div className="space-y-6">
                                    {ideaDetails.steps?.map((step, idx) => (
                                        <div key={idx} className="flex">
                                            <div className="flex-shrink-0 mr-4 flex flex-col items-center">
                                                <div className="w-8 h-8 rounded-full bg-neon-green/10 text-neon-green border border-neon-green/30 flex items-center justify-center font-bold text-sm">
                                                    {idx + 1}
                                                </div>
                                                {idx < (ideaDetails.steps?.length || 0) - 1 && (
                                                    <div className="w-0.5 h-full bg-white/10 mt-2"></div>
                                                )}
                                            </div>
                                            <div className="pt-1 pb-4">
                                                <p className="text-gray-200">{step}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'QUESTIONS' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-white/5 border border-white/10 p-8 rounded-lg">
                                <div className="flex justify-center items-center mb-6 space-x-2">
                                    <h3 className="text-xl font-bold text-white">{TEXTS.ADMIN_DASHBOARD.DETAIL.QUESTIONS_TITLE}</h3>
                                    <button onClick={() => handleCopyToChat(ideaDetails.questions?.map((q, i) => `Q${i+1}: ${q}`).join('\n') || '')} className="text-gray-400 hover:text-neon-green transition-colors" title="Kopieer naar chat"><MessageSquare className="w-4 h-4" /></button>
                                </div>
                                <ul className="space-y-6 max-w-2xl mx-auto">
                                    {ideaDetails.questions?.map((q, idx) => (
                                        <li key={idx} className="bg-black/40 border border-white/5 p-6 rounded-lg flex items-start text-lg group">
                                            <span className="mr-4 text-neon-cyan font-black text-2xl">Q{idx + 1}</span>
                                            <div className="flex-1 flex items-start justify-between">
                                                <span className="text-gray-200 pt-1">{q}</span>
                                                <button 
                                                    onClick={() => handleAddToChat(q)}
                                                    className="opacity-0 group-hover:opacity-100 ml-2 p-1 hover:bg-white/10 rounded transition-all"
                                                    title="Bespreken in Chat"
                                                >
                                                    <MessageSquare className="w-4 h-4 text-gray-400 hover:text-white" />
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeTab === 'AI_ANSWERS' && (
                         <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                            <div className="p-4 bg-neon-purple/10 border border-neon-purple/20 rounded mb-4 text-neon-purple text-sm flex items-center">
                                <Zap className="w-4 h-4 mr-2" />
                                AI-simulatie van mogelijke antwoorden op basis van context.
                            </div>
                            {ideaDetails.questions?.map((q, idx) => (
                                <div key={idx} className="bg-white/5 border border-white/10 p-6 rounded-lg">
                                    <div className="text-gray-400 text-sm mb-2 font-mono">QUESTION {idx + 1}</div>
                                    <h4 className="text-white font-bold mb-4">{q}</h4>
                                    <div className="bg-black/30 border-l-4 border-neon-purple p-4 rounded-r">
                                        <p className="text-gray-300 italic">
                                            "{ideaDetails.questionAnswers ? ideaDetails.questionAnswers[idx] : 'Analysing...'}"
                                        </p>
                                    </div>
                                </div>
                            ))}
                         </div>
                    )}

                    {activeTab === 'BUSINESS_CASE' && (
                         <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white/5 border border-white/10 p-6 rounded-lg">
                                <h4 className="text-neon-green font-mono text-xs uppercase mb-2">Problem</h4>
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-white font-bold text-lg">Probleemstelling</h3>
                                    <button onClick={() => handleCopyToChat(ideaDetails.businessCase?.problemStatement || '')} className="text-gray-400 hover:text-neon-green transition-colors" title="Kopieer"><MessageSquare className="w-4 h-4" /></button>
                                </div>
                                <p className="text-gray-400">{ideaDetails.businessCase?.problemStatement}</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-6 rounded-lg">
                                <h4 className="text-neon-green font-mono text-xs uppercase mb-2">Solution</h4>
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-white font-bold text-lg">Oplossing</h3>
                                    <button onClick={() => handleCopyToChat(ideaDetails.businessCase?.proposedSolution || '')} className="text-gray-400 hover:text-neon-green transition-colors" title="Kopieer"><MessageSquare className="w-4 h-4" /></button>
                                </div>
                                <p className="text-gray-400">{ideaDetails.businessCase?.proposedSolution}</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-6 rounded-lg">
                                <h4 className="text-neon-green font-mono text-xs uppercase mb-2">Strategy</h4>
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-white font-bold text-lg">Strategische Fit</h3>
                                    <button onClick={() => handleCopyToChat(ideaDetails.businessCase?.strategicFit || '')} className="text-gray-400 hover:text-neon-green transition-colors" title="Kopieer"><MessageSquare className="w-4 h-4" /></button>
                                </div>
                                <p className="text-gray-400">{ideaDetails.businessCase?.strategicFit}</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-6 rounded-lg">
                                <h4 className="text-neon-green font-mono text-xs uppercase mb-2">Finance</h4>
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-white font-bold text-lg">Financiële Impact</h3>
                                    <button onClick={() => handleCopyToChat(ideaDetails.businessCase?.financialImpact || '')} className="text-gray-400 hover:text-neon-green transition-colors" title="Kopieer"><MessageSquare className="w-4 h-4" /></button>
                                </div>
                                <p className="text-gray-400">{ideaDetails.businessCase?.financialImpact}</p>
                            </div>
                            <div className="md:col-span-2 bg-exact-red/5 border border-exact-red/20 p-6 rounded-lg">
                                <h4 className="text-exact-red font-mono text-xs uppercase mb-2">Risk Analysis</h4>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-white font-bold text-lg">Risico's</h3>
                                    <button onClick={() => handleCopyToChat(ideaDetails.businessCase?.risks?.join('\n') || '')} className="text-gray-400 hover:text-exact-red transition-colors" title="Kopieer"><MessageSquare className="w-4 h-4" /></button>
                                </div>
                                <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {ideaDetails.businessCase?.risks?.map((risk, idx) => (
                                        <li key={idx} className="flex items-start text-gray-300 text-sm">
                                            <TrendingUp className="w-4 h-4 mr-2 text-exact-red flex-shrink-0 mt-1" />
                                            {risk}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                         </div>
                    )}

                    {activeTab === 'DEVILS_ADVOCATE' && ideaDetails.devilsAdvocate && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                            <div className="bg-orange-500/10 border border-orange-500/30 p-6 rounded-lg">
                                <div className="flex items-center justify-between mb-4 text-orange-500">
                                    <div className="flex items-center">
                                        <AlertTriangle className="w-6 h-6 mr-2" />
                                        <h3 className="text-xl font-bold">De Kritische Blik</h3>
                                    </div>
                                    <button 
                                        onClick={() => handleAddToChat(ideaDetails.devilsAdvocate.critique)}
                                        className="p-1 hover:bg-white/10 rounded transition-all"
                                        title="Bespreken in Chat"
                                    >
                                        <MessageSquare className="w-4 h-4 text-gray-400 hover:text-white" />
                                    </button>
                                </div>
                                <p className="text-gray-300 italic text-lg border-l-2 border-orange-500 pl-4 py-2">
                                    "{ideaDetails.devilsAdvocate.critique}"
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white/5 border border-white/10 p-6 rounded-lg">
                                    <div className="flex items-center mb-4 text-gray-400">
                                        <EyeOff className="w-5 h-5 mr-2" />
                                        <h4 className="font-bold">Blinde Vlekken</h4>
                                    </div>
                                    <ul className="space-y-3">
                                        {ideaDetails.devilsAdvocate.blindSpots?.map((spot, idx) => (
                                            <li key={idx} className="flex items-start justify-between text-gray-400 text-sm group">
                                                <div className="flex items-start">
                                                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                                                    {spot}
                                                </div>
                                                <button 
                                                    onClick={() => handleAddToChat(spot)}
                                                    className="opacity-0 group-hover:opacity-100 ml-2 p-1 hover:bg-white/10 rounded transition-all"
                                                    title="Bespreken in Chat"
                                                >
                                                    <MessageSquare className="w-3 h-3 text-gray-400 hover:text-white" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-white/5 border border-white/10 p-6 rounded-lg">
                                    <div className="flex items-center justify-between mb-4 text-gray-400">
                                        <div className="flex items-center">
                                            <Skull className="w-5 h-5 mr-2" />
                                            <h4 className="font-bold">Pre-Mortem (Waarom faalde dit?)</h4>
                                        </div>
                                        <button 
                                            onClick={() => handleAddToChat(ideaDetails.devilsAdvocate.preMortem)}
                                            className="p-1 hover:bg-white/10 rounded transition-all"
                                            title="Bespreken in Chat"
                                        >
                                            <MessageSquare className="w-4 h-4 text-gray-400 hover:text-white" />
                                        </button>
                                    </div>
                                    <p className="text-gray-400 text-sm">
                                        "{ideaDetails.devilsAdvocate.preMortem}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'MARKETING' && ideaDetails.marketing && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                             {/* Slogan Hero */}
                             <div className="bg-gradient-to-r from-pink-500/20 to-purple-600/20 border border-white/10 p-10 rounded-lg text-center">
                                 <div className="flex justify-center items-center mb-4 space-x-2">
                                     <h4 className="text-xs font-mono text-pink-400 uppercase tracking-widest">Campagne Slogan</h4>
                                     <button onClick={() => handleCopyToChat(ideaDetails.marketing.slogan)} className="text-gray-400 hover:text-pink-500 transition-colors" title="Kopieer"><MessageSquare className="w-3 h-3" /></button>
                                 </div>
                                 <h2 className="text-3xl md:text-5xl font-black text-white italic">
                                     "{ideaDetails.marketing.slogan}"
                                 </h2>
                                 <div className="mt-6 inline-flex items-center px-4 py-2 bg-black/30 rounded-full text-sm text-gray-300">
                                     <Target className="w-4 h-4 mr-2 text-pink-500" />
                                     Doelgroep: {ideaDetails.marketing.targetAudience}
                                 </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 {/* LinkedIn Post */}
                                 <div className="bg-[#0077b5]/10 border border-[#0077b5]/30 p-6 rounded-lg">
                                     <div className="flex items-center mb-4 text-[#0077b5]">
                                         <Share2 className="w-5 h-5 mr-2" />
                                         <div className="flex justify-between items-center w-full">
                                             <h3 className="font-bold">LinkedIn Post</h3>
                                             <button onClick={() => handleCopyToChat(ideaDetails.marketing.linkedInPost)} className="text-[#0077b5] hover:text-white transition-colors" title="Kopieer"><MessageSquare className="w-4 h-4" /></button>
                                         </div>
                                     </div>
                                     <div className="bg-white p-4 rounded text-black text-sm shadow-lg">
                                         <div className="flex items-center mb-3">
                                             <div className="w-8 h-8 bg-gray-300 rounded-full mr-2"></div>
                                             <div>
                                                 <div className="font-bold text-xs">Exact Life</div>
                                                 <div className="text-[10px] text-gray-500">Just now • 🌐</div>
                                             </div>
                                         </div>
                                         <p className="whitespace-pre-line">{ideaDetails.marketing.linkedInPost}</p>
                                     </div>
                                 </div>

                                 {/* Viral Tweet */}
                                 <div className="bg-white/5 border border-white/10 p-6 rounded-lg">
                                     <div className="flex items-center mb-4 text-white">
                                         <Hash className="w-5 h-5 mr-2" />
                                         <div className="flex justify-between items-center w-full">
                                             <h3 className="font-bold">Viral X / Tweet</h3>
                                             <button onClick={() => handleCopyToChat(ideaDetails.marketing.viralTweet)} className="text-white hover:text-gray-400 transition-colors" title="Kopieer"><MessageSquare className="w-4 h-4" /></button>
                                         </div>
                                     </div>
                                     <div className="bg-black border border-gray-800 p-4 rounded-xl text-white text-lg font-medium">
                                          <p>"{ideaDetails.marketing.viralTweet}"</p>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex-shrink-0 border-t border-white/10 pt-4 pb-4 bg-exact-dark z-20 flex flex-nowrap overflow-x-auto gap-4 justify-between items-center sticky bottom-0 shadow-2xl">
                     <div className="flex gap-4 flex-nowrap">
                        <button 
                            onClick={() => setShowPBIModal(true)}
                            className="whitespace-nowrap px-6 py-3 bg-neon-purple/10 text-neon-purple border border-neon-purple/50 hover:bg-neon-purple/20 font-bold rounded flex items-center transition-all"
                        >
                            <FileText className="mr-2 w-4 h-4" />
                            {TEXTS.ADMIN_DASHBOARD.DETAIL.BTN_PBI}
                        </button>
                        <button 
                            onClick={handleDownloadPDF}
                            className="whitespace-nowrap px-6 py-3 bg-white/5 text-gray-300 border border-white/20 hover:bg-white/10 font-bold rounded flex items-center transition-all"
                        >
                            <Download className="mr-2 w-4 h-4" />
                            {TEXTS.ADMIN_DASHBOARD.DETAIL.BTN_PDF}
                        </button>
                     </div>
                     
                     <div className="flex gap-4 flex-nowrap">
                        <button 
                            onClick={handleBackToAnalysis}
                            className="whitespace-nowrap px-4 py-3 text-gray-400 hover:text-white flex items-center font-medium"
                        >
                            <ArrowLeft className="mr-2 w-4 h-4" />
                            {TEXTS.ADMIN_DASHBOARD.DETAIL.BTN_BACK}
                        </button>
                        <button 
                            onClick={handleReset}
                            className="whitespace-nowrap px-6 py-3 bg-exact-red text-white hover:bg-red-700 font-bold rounded flex items-center transition-all"
                        >
                            <RotateCcw className="mr-2 w-4 h-4" />
                            {TEXTS.ADMIN_DASHBOARD.DETAIL.BTN_RESET}
                        </button>
                     </div>
                </div>

                </div>

                {/* Chat Assistant */}
                <ChatAssistant 
                    idea={selectedIdea} 
                    analysis={ideaDetails} 
                    context={context}
                    isOpen={isChatOpen}
                    onToggle={() => setIsChatOpen(!isChatOpen)}
                    width={chatWidth}
                    onWidthChange={setChatWidth}
                    pastedText={chatPastedText}
                    onClearPastedText={() => setChatPastedText('')}
                />
            </div>
        )}

      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
            <div className="bg-exact-panel border border-white/20 rounded-lg max-w-lg w-full p-8 shadow-2xl relative animate-in fade-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
                <button 
                    onClick={() => setShowSettings(false)}
                    className="absolute top-6 right-6 text-gray-400 hover:text-white"
                >
                    <X size={24} />
                </button>
                
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                    <Settings className="mr-3 text-exact-red" />
                    {TEXTS.MODALS.SETTINGS.TITLE}
                </h2>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-white mb-1">
                            {TEXTS.MODALS.SETTINGS.ACCESS_CODE_LABEL}
                        </label>
                        <p className="text-xs text-gray-500 mb-2">{TEXTS.MODALS.SETTINGS.ACCESS_CODE_DESC}</p>
                        <input 
                            type="text" 
                            value={tempAccessCode}
                            onChange={(e) => setTempAccessCode(e.target.value.toUpperCase())}
                            className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-white font-mono tracking-wider focus:border-exact-red focus:outline-none"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-white mb-1">
                            {TEXTS.MODALS.SETTINGS.CONTEXT_LABEL}
                        </label>
                         <p className="text-xs text-gray-500 mb-2">{TEXTS.MODALS.SETTINGS.CONTEXT_DESC}</p>
                        <textarea 
                            value={defaultContext}
                            onChange={(e) => setDefaultContext(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-white focus:border-exact-red focus:outline-none min-h-[100px]"
                            placeholder={TEXTS.MODALS.SETTINGS.CONTEXT_PLACEHOLDER}
                        />
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button 
                        onClick={handleSaveSettings}
                        className="px-6 py-3 bg-exact-red text-white font-bold rounded hover:bg-red-700 transition-colors flex items-center"
                    >
                        <Save className="mr-2 w-4 h-4" /> {TEXTS.MODALS.SETTINGS.BTN_SAVE}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* PBI Modal */}
      {showPBIModal && phase === 'DETAIL' && ideaDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowPBIModal(false)}>
            <div className="bg-exact-panel border border-white/20 rounded-lg max-w-4xl w-full p-8 shadow-2xl relative animate-in fade-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
                <button 
                    onClick={() => setShowPBIModal(false)}
                    className="absolute top-6 right-6 text-gray-400 hover:text-white"
                >
                    <X size={24} />
                </button>
                
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                    <FileText className="mr-3 text-neon-purple" />
                    {TEXTS.ADMIN_DASHBOARD.DETAIL.MODAL_PBI_TITLE}
                </h2>

                <div className="grid grid-cols-1 gap-4 max-h-[70vh] overflow-y-auto">
                    {ideaDetails.pbis.map((pbi, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/10 p-5 rounded hover:border-neon-purple/50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-white">{pbi.title}</h3>
                                <span className="bg-black/40 border border-white/20 px-2 py-1 rounded text-xs font-mono text-neon-purple">
                                    {pbi.storyPoints} PTS
                                </span>
                            </div>
                            <p className="text-gray-400 text-sm">
                                {pbi.description}
                            </p>
                        </div>
                    ))}
                </div>
                
                <div className="mt-6 flex justify-end">
                    <button 
                        onClick={handleExportCSV}
                        className="px-6 py-3 bg-neon-purple text-black font-bold rounded hover:bg-purple-400 transition-colors flex items-center"
                    >
                        <Download className="mr-2 w-4 h-4" /> Export to CSV
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;