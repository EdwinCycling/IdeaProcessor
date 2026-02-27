import React, { useState, useEffect, useRef } from 'react';
import { Power, Users, Activity, LogOut, Brain, Check, ArrowRight, Play, FileText, List, HelpCircle, ArrowLeft, RotateCcw, Download, X, Settings, Save, LayoutDashboard, Clock, Zap, MessageSquare, Briefcase, TrendingUp, AlertTriangle, EyeOff, Skull, Megaphone, Share2, Hash, Target, File as FileIcon, Edit3, Sparkles, FolderOpen, Presentation } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { collection, query, orderBy, onSnapshot, doc, setDoc, getDoc, addDoc, getDocs, deleteDoc, updateDoc, where } from 'firebase/firestore';
import { db, auth, COLLECTIONS, CURRENT_SESSION_ID } from '../services/firebase';
import { TEXTS } from '../constants/texts';
import { Idea, AIAnalysisResult, IdeaDetails, ChatMessage, Cluster, SavedSession } from '../types';
import { analyzeIdeas, generateIdeaDetails, generateBlog, generatePressRelease, clusterIdeas, generatePPTContent } from '../services/ai';
import PptxGenJS from 'pptxgenjs';
import { generateSessionCode } from '../utils/codeGenerator';
import ChatAssistant from './ChatAssistant';
import ConfirmationModal from './ConfirmationModal';
import IdeasOverviewModal from './IdeasOverviewModal';
import ClusterIdeasModal from './ClusterIdeasModal';
import RevealIdeaModal from './RevealIdeaModal';
import PowerPointViewerModal from './PowerPointViewerModal';

interface AdminDashboardProps {
  onLogout: () => void;
  currentAccessCode: string;
  onUpdateAccessCode: (code: string) => void;
}

type DashboardPhase = 'MENU' | 'SETUP' | 'LIVE' | 'ANALYSIS' | 'DETAIL';
type DetailTab = 'GENERAL' | 'QUESTIONS' | 'AI_ANSWERS' | 'BUSINESS_CASE' | 'DEVILS_ADVOCATE' | 'MARKETING' | 'PRESS_RELEASE' | 'BLOG' | 'POWERPOINT';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, currentAccessCode, onUpdateAccessCode }) => {
  const [phase, setPhase] = useState<DashboardPhase>('MENU');
  const [context, setContext] = useState('');
  // Use Global Session ID for Single Tenant Event
  const [sessionId, setSessionId] = useState(CURRENT_SESSION_ID);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  
  // Saved Sessions State
  const [showLoadSessionModal, setShowLoadSessionModal] = useState(false);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  
  // Session Code State
  const [sessionCode, setSessionCode] = useState<string>('');

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [tempAccessCode, setTempAccessCode] = useState(currentAccessCode);
  const [defaultContext, setDefaultContext] = useState('');
  
  // Analysis State
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [selectedManualIdeaId, setSelectedManualIdeaId] = useState<string | null>(null);
  const [showOverview, setShowOverview] = useState(false);
  const [showClusterModal, setShowClusterModal] = useState(false);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [isClustering, setIsClustering] = useState(false);

  // Detail State
  const [ideaDetails, setIdeaDetails] = useState<IdeaDetails | null>(null);
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
  const [showPBIModal, setShowPBIModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [isGeneratingFollowUp, setIsGeneratingFollowUp] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('GENERAL');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [startProgress, setStartProgress] = useState(0);
  const [isStartingFollowUp, setIsStartingFollowUp] = useState(false);
  const [followUpProgress, setFollowUpProgress] = useState(0);

  // New Generation States
  const [isGeneratingBlog, setIsGeneratingBlog] = useState(false);
  const [isGeneratingPressRelease, setIsGeneratingPressRelease] = useState(false);
  const [isGeneratingPPT, setIsGeneratingPPT] = useState(false);
  const [blogStyle, setBlogStyle] = useState('zakelijk');
  const [pressReleaseStyle, setPressReleaseStyle] = useState('zakelijk');

  // Reveal State
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);
  const [revealedIdeaId, setRevealedIdeaId] = useState<string | null>(null);

  // Simulation of progress for AI calls
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalyzing || isGeneratingDetails || isGeneratingFollowUp || isStarting || isStartingFollowUp) {
      if (isStarting) setStartProgress(0);
      else if (isStartingFollowUp) setFollowUpProgress(0);
      else setGenerationProgress(0);
      
      interval = setInterval(() => {
        if (isStarting) {
          setStartProgress(prev => {
            if (prev >= 95) return prev;
            return prev + (100 / (20)); // Faster for start (2 seconds roughly)
          });
        } else if (isStartingFollowUp) {
          setFollowUpProgress(prev => {
            if (prev >= 95) return prev;
            return prev + (100 / (20)); // Also roughly 2 seconds
          });
        } else {
          setGenerationProgress(prev => {
            if (prev >= 95) return prev;
            return prev + (100 / (10 * 10));
          });
        }
      }, 100);
    } else {
      setGenerationProgress(0);
      setStartProgress(0);
      setFollowUpProgress(0);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing, isGeneratingDetails, isGeneratingFollowUp, isStarting, isStartingFollowUp]);

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(450);
  const [chatPastedText, setChatPastedText] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  // PPT Editing State
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
  const [editingContentIndex, setEditingContentIndex] = useState<number | null>(null); // null means editing title, otherwise index of content paragraph
  const [editValue, setEditValue] = useState('');
  const [showPPTViewer, setShowPPTViewer] = useState(false);

  const handleCopyToChat = (text: string) => {
    setChatPastedText(`Ik wil graag dieper ingaan op dit punt: "${text}"`);
    setIsChatOpen(true);
  };

  const handleAddToChat = (text: string) => {
    handleCopyToChat(text);
  };

  const handleManualSelectIdea = async (idea: Idea) => {
    if (!db) return;
    try {
      const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);
      await updateDoc(sessionRef, {
        selectedManualIdeaId: idea.id
      });
      
      // Add the idea to analysis.topIdeas if it's not already there
      if (analysis && !analysis.topIdeas.some(i => i.id === idea.id)) {
        const updatedAnalysis = {
          ...analysis,
          topIdeas: [...analysis.topIdeas.slice(0, 3), idea]
        };
        setAnalysis(updatedAnalysis);
      }

      setShowOverview(false);
      setSelectedManualIdeaId(idea.id);
      
      // NEW: Immediately set this as the revealed idea and select it
      setRevealedIdeaId(idea.id);
      setHasRevealed(true);
      setSelectedIdeaId(idea.id); 

    } catch (err) {
      console.error("Error selecting idea:", err);
    }
  };

  // Timer States
  const [sessionDuration, setSessionDuration] = useState(0); // In seconds
  const [isClosing, setIsClosing] = useState(false);
  const [closingCountdown, setClosingCountdown] = useState(10);
  const [showCancelModal, setShowCancelModal] = useState(false);

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
                    const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);
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
  }, [phase, defaultContext, context, sessionId]);

  // Load settings from Firestore on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!db) return;
      try {
        const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);
        const sessionSnap = await getDoc(sessionRef);
        if (sessionSnap.exists()) {
          const data = sessionSnap.data();
          if (data.accessCode) {
            onUpdateAccessCode(data.accessCode);
            setTempAccessCode(data.accessCode);
            
            // Also set this as sessionCode for UI consistency
            setSessionCode(data.accessCode);
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
  }, [sessionId]);

  // Reports State
  const [showReports, setShowReports] = useState(false);
  const [savedReports, setSavedReports] = useState<any[]>([]);

  useEffect(() => {
    if (showReports && db) {
        const q = query(collection(db, COLLECTIONS.SESSIONS, sessionId, 'reports'), orderBy('generatedAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setSavedReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }
  }, [showReports, sessionId]);

  // Phase 2: Live Data & Timer
  useEffect(() => {
    let timerInterval: ReturnType<typeof setInterval>;
    let unsubscribeIdeas: () => void;
    let unsubscribeSession: () => void;

    if (phase === 'LIVE' && !isClosing) {
      if (!db) {
        console.error("Firestore not initialized");
        return;
      }
      // 1. Real-time Firestore Listener for Ideas
      const q = query(
        collection(db, COLLECTIONS.SESSIONS, sessionId, COLLECTIONS.IDEAS), 
        orderBy("timestamp", "asc")
      );
      
      unsubscribeIdeas = onSnapshot(q, (snapshot) => {
        const newIdeas = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        })) as Idea[];
        setIdeas(newIdeas);
      });

      // 1b. Real-time Firestore Listener for Session (manual idea selection)
      const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);
      unsubscribeSession = onSnapshot(sessionRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.selectedManualIdeaId) {
            setSelectedManualIdeaId(data.selectedManualIdeaId);
          }
        }
      });

      // 2. Session Duration Timer
      timerInterval = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (unsubscribeIdeas) unsubscribeIdeas();
      if (unsubscribeSession) unsubscribeSession();
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
    }

    return () => clearInterval(countdownInterval);
  }, [isClosing, closingCountdown]);


  // Auto-scroll log
  useEffect(() => {
    if (phase === 'LIVE' && logEndRef.current) {
        logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ideas, phase]);

  // Lock scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = 
      showLoadSessionModal || 
      showSettings || 
      showOverview || 
      showClusterModal || 
      showPBIModal || 
      showFollowUpModal || 
      showRevealModal || 
      showCancelModal || 
      showReports;

    if (isAnyModalOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [
    showLoadSessionModal, 
    showSettings, 
    showOverview, 
    showClusterModal, 
    showPBIModal, 
    showFollowUpModal, 
    showRevealModal, 
    showCancelModal, 
    showReports
  ]);

  // Phase 3: Trigger Analysis
  useEffect(() => {
    if (phase === 'ANALYSIS' && !analysis) {
      const runAnalysis = async () => {
        // Prevent analysis if there are no ideas
        if (ideas.length === 0) {
            console.warn("Skipping analysis: No ideas provided");
            setAnalysis({
                innovationScore: 0,
                sentiment: 'neutral',
                keywords: [],
                summary: "Geen ideeën ingediend.",
                topIdeas: []
            });
            return;
        }

        setIsAnalyzing(true);
        
        // Find manual idea if selected
        const manualIdea = ideas.find(i => i.id === selectedManualIdeaId);
        
        const result = await analyzeIdeas(context, ideas);
        
        // If we have a manual idea, ensure it's in topIdeas (or add as 4th)
        if (manualIdea && result) {
            const isAlreadyTop = result.topIdeas.some(i => i.id === manualIdea.id);
            if (!isAlreadyTop) {
                result.topIdeas = [...result.topIdeas, manualIdea];
            }
            // Auto-select the manual idea if it was chosen
            setSelectedIdeaId(manualIdea.id);
        }
        
        setAnalysis(result);
        setIsAnalyzing(false);
      };
      runAnalysis();
    }
  }, [phase, context, ideas, selectedManualIdeaId]);

  // Phase 3b: Animate Score
  useEffect(() => {
    if (phase === 'ANALYSIS' && analysis && animatedScore < analysis.innovationScore) {
      const timeout = setTimeout(() => {
        setAnimatedScore(prev => Math.min(prev + 2, analysis.innovationScore));
      }, 30);
      return () => clearTimeout(timeout);
    }
  }, [phase, analysis, animatedScore]);

  const handleClusterIdeas = async () => {
    setShowClusterModal(true);
    if (clusters.length === 0) {
        setIsClustering(true);
        const result = await clusterIdeas(context, ideas);
        setClusters(result);
        setIsClustering(false);
    }
  };

  const handleSelectCluster = async (cluster: Cluster) => {
    // Create a new Idea from the cluster
    const clusterIdea: Idea = {
        id: cluster.id, // Use cluster ID
        name: cluster.name, // "Cluster idee #1"
        content: cluster.summary,
        timestamp: Date.now()
    };

    // Treat it as a manual selection
    handleManualSelectIdea(clusterIdea);
    setShowClusterModal(false);
  };

  const handleStartSession = async () => {
    if (!context.trim()) return;
    
    setIsStarting(true);
    
    // Clear local state
    setIdeas([]);
    setAnalysis(null);
    setSessionDuration(0); // Reset timer
    setAnimatedScore(0);
    setHasRevealed(false);
    setRevealedIdeaId(null);
    
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

        // Small delay to show 100% progress
        setStartProgress(100);
        setTimeout(() => {
          setIsStarting(false);
          setPhase('LIVE');
        }, 500);
      } catch (err) {
        console.error("Error starting session:", err);
        setIsStarting(false);
        // Fallback: start anyway if cleanup fails, but warn
        setPhase('LIVE');
      }
    } else {
        // Mock mode
        setStartProgress(100);
        setTimeout(() => {
          setIsStarting(false);
          setPhase('LIVE');
        }, 500);
    }
  };

  const handleStopSession = async () => {
    // 1. Immediately close the session in Firestore so users can't enter ideas
    if (db) {
      try {
        await setDoc(doc(db, COLLECTIONS.SESSIONS, sessionId), {
          isActive: false,
          updatedAt: Date.now()
        }, { merge: true });
      } catch (err) {
        console.error("Error closing session in Firestore:", err);
      }
    }

    // 2. Trigger the local 10s countdown for dramatic effect
    setIsClosing(true);
    setClosingCountdown(10);
  };

  const handleCancelSession = () => {
      setShowCancelModal(true);
  };

  const confirmCancelSession = async () => {
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
  };

  const handleSelectIdea = async () => {
    if (!selectedIdeaId || !analysis || isGeneratingDetails) return;
    
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

  const handleGenerateBlog = async () => {
    if (!selectedIdeaId || !analysis || !ideaDetails) return;
    setIsGeneratingBlog(true);
    const selectedIdea = analysis.topIdeas.find(i => i.id === selectedIdeaId);
    if (selectedIdea) {
      const blog = await generateBlog(context, selectedIdea, blogStyle);
      setIdeaDetails({
        ...ideaDetails,
        blogPost: blog
      });
    }
    setIsGeneratingBlog(false);
  };

  const handleGeneratePressRelease = async () => {
    if (!selectedIdeaId || !analysis || !ideaDetails) return;
    setIsGeneratingPressRelease(true);
    const selectedIdea = analysis.topIdeas.find(i => i.id === selectedIdeaId);
    if (selectedIdea) {
      const pr = await generatePressRelease(context, selectedIdea, pressReleaseStyle);
      setIdeaDetails({
        ...ideaDetails,
        pressRelease: pr
      });
    }
    setIsGeneratingPressRelease(false);
  };

  const handleGeneratePPT = async () => {
    if (!selectedIdeaId || !analysis || !ideaDetails) return;
    setIsGeneratingPPT(true);
    const selectedIdea = analysis.topIdeas.find(i => i.id === selectedIdeaId);
    if (selectedIdea) {
      const pptData = await generatePPTContent(context, selectedIdea);
      setIdeaDetails({
        ...ideaDetails,
        pptOutline: pptData
      });
    }
    setIsGeneratingPPT(false);
  };

  const handleSaveSlideContent = () => {
    if (!ideaDetails?.pptOutline || editingSlideIndex === null) return;

    const newSlides = [...ideaDetails.pptOutline.slides];
    const slide = { ...newSlides[editingSlideIndex] };

    if (editingContentIndex === null) {
        // Editing Title
        slide.title = editValue;
    } else {
        // Editing Content Paragraph
        const newContent = [...slide.content];
        newContent[editingContentIndex] = editValue;
        slide.content = newContent;
    }

    newSlides[editingSlideIndex] = slide;

    setIdeaDetails({
        ...ideaDetails,
        pptOutline: {
            ...ideaDetails.pptOutline,
            slides: newSlides
        }
    });

    // Reset editing state
    setEditingSlideIndex(null);
    setEditingContentIndex(null);
    setEditValue('');
  };

  const handleDownloadPPT = () => {
    if (!ideaDetails?.pptOutline || !selectedIdea) return;

    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_16x9';

    // Theme colors
    const brandPurple = 'A855F7';
    const darkBg = '111111';
    const white = 'FFFFFF';

    // Master Slide
    pres.defineSlideMaster({
      title: 'MASTER_SLIDE',
      background: { color: darkBg },
      objects: [
        { rect: { x: 0, y: 0, w: '100%', h: 0.15, fill: { color: brandPurple } } },
        { text: { text: 'IDEA PROCESSOR', options: { x: 0.5, y: 0.25, fontSize: 10, color: '888888', fontFace: 'Arial' } } },
        { line: { x: 0.5, y: 0.8, w: '90%', h: 0, line: { color: '333333', width: 1 } } }
      ]
    });

    const createSlide = (slide: { title: string; content: string[]; speakerNotes: string }) => {
        const s = pres.addSlide({ masterName: 'MASTER_SLIDE' });
        
        // Title
        s.addText(slide.title, { 
            x: 0.5, y: 1.0, w: '90%', 
            fontSize: 32, bold: true, color: white, fontFace: 'Arial' 
        });

        // Content
        if (slide.content && slide.content.length > 0) {
            // Narrative style: No bullets, larger line spacing, paragraphs
            const items = slide.content.map(p => ({ text: p + "\n\n", options: { fontSize: 16, color: 'DDDDDD', breakLine: true, bullet: false } }));
            
            s.addText(items, { 
                x: 0.5, y: 1.8, w: '90%', h: 4.7, 
                fontFace: 'Arial', lineSpacing: 24, valign: 'top', align: 'justify'
            });
        }

        // Speaker Notes
        if (slide.speakerNotes) {
            s.addNotes(slide.speakerNotes);
        }
    };

    const slides = ideaDetails.pptOutline.slides;
    
    // 1. Title Slide (First slide from AI)
    if (slides.length > 0) {
        createSlide(slides[0]);
    }

    // NEW: Original Idea Slide
    const sOriginal = pres.addSlide({ masterName: 'MASTER_SLIDE' });
    sOriginal.addText("HET OORSPRONKELIJKE IDEE", { x: 0.5, y: 1.0, w: '90%', fontSize: 32, bold: true, color: white, fontFace: 'Arial' });
    sOriginal.addText(`"${selectedIdea.content}"`, { 
        x: 1.0, y: 2.0, w: '80%', h: 3.0, 
        fontSize: 24, color: 'DDDDDD', italic: true, align: 'center', valign: 'middle', 
        shape: pres.ShapeType.rect, fill: { color: '222222' }, outline: { color: '444444', size: 1 } 
    });
    sOriginal.addText(`- ${selectedIdea.name}`, { x: 1.0, y: 5.2, w: '80%', fontSize: 14, color: brandPurple, align: 'right', bold: true });

    // 2. Press Release (if exists)
    if (ideaDetails.pressRelease) {
        const s = pres.addSlide({ masterName: 'MASTER_SLIDE' });
        s.addText("PERSBERICHT", { x: 0.5, y: 1.0, w: '90%', fontSize: 32, bold: true, color: white, fontFace: 'Arial' });
        
        s.addText(ideaDetails.pressRelease.title, { x: 0.5, y: 1.8, w: '90%', fontSize: 24, bold: true, color: brandPurple });
        s.addText(`${ideaDetails.pressRelease.location} - ${ideaDetails.pressRelease.date}`, { x: 0.5, y: 2.3, w: '90%', fontSize: 12, italic: true, color: 'AAAAAA' });
        
        s.addText(ideaDetails.pressRelease.content, { x: 0.5, y: 2.6, w: '90%', h: 4.0, fontSize: 12, color: 'DDDDDD', valign: 'top' });
    }

    // 3. Rest of the standard slides (2 to end)
    for (let i = 1; i < slides.length; i++) {
        createSlide(slides[i]);
    }

    // 4. Social Media (After Appendix)
    if (ideaDetails.marketing) {
        // LinkedIn
        const sLink = pres.addSlide({ masterName: 'MASTER_SLIDE' });
        sLink.addText("LinkedIn Campagne", { x: 0.5, y: 1.0, w: '90%', fontSize: 32, bold: true, color: white });
        
        // 1. Background Container (White Card)
        sLink.addShape(pres.ShapeType.rect, { 
            x: 1.5, y: 1.6, w: 7, h: 3.5, 
            fill: { color: 'FFFFFF' }, 
            line: { color: '0077B5', width: 1 } 
        });

        // 2. Header (Gray bg)
        sLink.addShape(pres.ShapeType.rect, { 
            x: 1.5, y: 1.6, w: 7, h: 0.8, 
            fill: { color: 'F3F2EF' } 
        });

        // 3. Header Content (Avatar & Name)
        sLink.addShape(pres.ShapeType.ellipse, { 
            x: 1.7, y: 1.75, w: 0.5, h: 0.5, 
            fill: { color: 'CCCCCC' } 
        });
        sLink.addText("Our Idea", { 
            x: 2.3, y: 1.75, w: 3, h: 0.3,
            fontSize: 12, bold: true, color: '000000', valign: 'top' 
        });
        sLink.addText("Just now • 🌐", { 
            x: 2.3, y: 2.05, w: 3, h: 0.2,
            fontSize: 9, color: '666666', valign: 'top'
        });

        // 4. Post Content (Text below header)
        sLink.addText(ideaDetails.marketing.linkedInPost, { 
            x: 1.7, y: 2.5, w: 6.6, h: 2.4, 
            fontSize: 10, color: '333333', 
            valign: 'top', align: 'left'
        });

        // Tweet
        const sTweet = pres.addSlide({ masterName: 'MASTER_SLIDE' });
        sTweet.addText("SOCIAL MEDIA: Viral Tweet", { x: 0.5, y: 1.0, w: '90%', fontSize: 32, bold: true, color: white });
        
        sTweet.addText(ideaDetails.marketing.viralTweet, { 
            x: 2.0, y: 2.0, w: 6, h: 2.5, 
            fontSize: 14, color: 'FFFFFF', 
            shape: pres.ShapeType.rect, fill: { color: '000000' }, 
            outline: { color: '333333', size: 1 },
            align: 'center', valign: 'middle'
        });
    }

    // 5. Blog Post (if exists) - 2 Columns, Font 8
    if (ideaDetails.blogPost) {
        const s = pres.addSlide({ masterName: 'MASTER_SLIDE' });
        s.addText("BLOG POST", { x: 0.5, y: 1.0, w: '90%', fontSize: 32, bold: true, color: white });
        s.addText(ideaDetails.blogPost.title, { x: 0.5, y: 1.6, w: '90%', fontSize: 20, bold: true, color: 'E1B000' });
        
        // Split content into two chunks roughly
        const words = ideaDetails.blogPost.content.split(' ');
        const mid = Math.ceil(words.length / 2);
        const col1 = words.slice(0, mid).join(' ');
        const col2 = words.slice(mid).join(' ');

        s.addText(col1, { x: 0.5, y: 2.2, w: 4.2, h: 4.5, fontSize: 9, color: 'DDDDDD', valign: 'top', align: 'justify' });
        s.addText(col2, { x: 5.0, y: 2.2, w: 4.2, h: 4.5, fontSize: 9, color: 'DDDDDD', valign: 'top', align: 'justify' });
    }

    // Save with timestamp
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    const dateStr = now.toLocaleDateString('nl-NL').replace(/-/g, '_'); // depending on locale, might need tweaking
    // Let's use ISO date for safety: YYYY-MM-DD
    const isoDate = now.toISOString().split('T')[0];
    
    pres.writeFile({ fileName: `IdeaProcessor_${isoDate}_${timeStr}.pptx` });
  };

  const handleReset = () => {
      setPhase('MENU');
      setContext('');
      setIdeas([]);
      setAnalysis(null);
      setSelectedIdeaId(null);
      setSelectedManualIdeaId(null);
      setIdeaDetails(null);
      setSessionDuration(0);
      setIsClosing(false);
      setAnimatedScore(0);
      setHasRevealed(false);
      setRevealedIdeaId(null);
      setShowRevealModal(false);

      // Also reset manual selection in Firestore and ensure session is closed
      if (db) {
        updateDoc(doc(db, COLLECTIONS.SESSIONS, sessionId), {
          selectedManualIdeaId: null,
          isActive: false
        }).catch(err => console.error("Error resetting session in Firestore:", err));
      }
  };

  const handleBackToAnalysis = () => {
      setPhase('ANALYSIS');
      setIdeaDetails(null);
  };

  const handleSaveSettings = async () => {
      if (tempAccessCode.length >= 3) {
        // 1. Check if the code is unique (if changed)
        if (db && tempAccessCode.toUpperCase() !== currentAccessCode.toUpperCase()) {
             const newCode = tempAccessCode.toUpperCase();
             const codeRef = doc(db, COLLECTIONS.SESSION_CODES, newCode);
             const codeSnap = await getDoc(codeRef);
             
             if (codeSnap.exists() && codeSnap.data().sessionId !== sessionId) {
                 alert("Deze code is al in gebruik door een andere admin. Kies een andere.");
                 return;
             }

             // 2. Register new code
             await setDoc(codeRef, {
                 sessionId: sessionId,
                 createdAt: Date.now()
             });

             // 3. Remove old code if exists
             if (currentAccessCode) {
                 await deleteDoc(doc(db, COLLECTIONS.SESSION_CODES, currentAccessCode.toUpperCase()));
             }
        }

        onUpdateAccessCode(tempAccessCode);
        setSessionCode(tempAccessCode);
        
        // Save to Firestore for persistence
        if (db) {
          try {
            await setDoc(doc(db, COLLECTIONS.SESSIONS, sessionId), {
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
    doc.text("Idea Processor - Plan", margin, yPos);
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

    // --- PRESS RELEASE (Added) ---
    if (ideaDetails.pressRelease) {
        if (yPos > 220) { doc.addPage(); yPos = 20; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Persbericht", margin, yPos);
        yPos += 10;
        
        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        const titleLines = doc.splitTextToSize(ideaDetails.pressRelease.title, 170);
        doc.text(titleLines, margin, yPos);
        yPos += titleLines.length * 5 + 5;

        // Info
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.text(`${ideaDetails.pressRelease.location}, ${ideaDetails.pressRelease.date}`, margin, yPos);
        yPos += 8;

        // Content
        doc.setFont("helvetica", "normal");
        const contentLines = doc.splitTextToSize(ideaDetails.pressRelease.content, 170);
        doc.text(contentLines, margin, yPos);
        yPos += contentLines.length * 5 + 10;
    }

    // --- BLOG POST (Added) ---
    if (ideaDetails.blogPost) {
        if (yPos > 220) { doc.addPage(); yPos = 20; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Blog Post", margin, yPos);
        yPos += 10;
        
        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        const titleLines = doc.splitTextToSize(ideaDetails.blogPost.title, 170);
        doc.text(titleLines, margin, yPos);
        yPos += titleLines.length * 5 + 5;

        // Content
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const contentLines = doc.splitTextToSize(ideaDetails.blogPost.content, 170);
        doc.text(contentLines, margin, yPos);
        yPos += contentLines.length * 5 + 10;
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
    doc.setFontSize(16);
    doc.text("Product Backlog Items (PBI's)", margin, yPos);
    yPos += 12;
    
    doc.setFontSize(10);
    ideaDetails.pbis.forEach((pbi, index) => {
        if (yPos > 240) {
            doc.addPage();
            yPos = 20;
        }

        // PBI Header: [ID] Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        const pbiId = pbi.id || `PBI-${index + 1}`;
        doc.text(`${pbiId}: ${pbi.title}`, margin, yPos);
        yPos += 6;

        // Priority & Story Points
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100);
        doc.text(`Prioriteit: ${pbi.priority || 'Medium'} | Story Points: ${pbi.storyPoints}`, margin, yPos);
        yPos += 6;
        doc.setTextColor(0);

        // User Story
        doc.setFont("helvetica", "bold");
        doc.text("User Story:", margin, yPos);
        yPos += 5;
        doc.setFont("helvetica", "normal");
        const storyText = pbi.userStory || pbi.description;
        const storyLines = doc.splitTextToSize(storyText, 170);
        doc.text(storyLines, margin, yPos);
        yPos += storyLines.length * 5 + 5;

        // Acceptance Criteria
        if (pbi.acceptanceCriteria && pbi.acceptanceCriteria.length > 0) {
            doc.setFont("helvetica", "bold");
            doc.text("Acceptatiecriteria:", margin, yPos);
            yPos += 5;
            doc.setFont("helvetica", "normal");
            pbi.acceptanceCriteria.forEach(ac => {
                if (yPos > 275) { doc.addPage(); yPos = 20; }
                const acLines = doc.splitTextToSize(`- ${ac}`, 165);
                doc.text(acLines, margin + 5, yPos);
                yPos += acLines.length * 5;
            });
            yPos += 5;
        }

        // Business Value
        if (pbi.businessValue) {
            doc.setFont("helvetica", "bold");
            doc.text("Business Value:", margin, yPos);
            yPos += 5;
            doc.setFont("helvetica", "normal");
            const bvLines = doc.splitTextToSize(pbi.businessValue, 170);
            doc.text(bvLines, margin, yPos);
            yPos += bvLines.length * 5 + 5;
        }

        // Dependencies
        if (pbi.dependencies && pbi.dependencies.length > 0) {
            doc.setFont("helvetica", "bold");
            doc.text(`Dependencies: ${pbi.dependencies.join(', ')}`, margin, yPos);
            yPos += 7;
        }

        // Separator line
        doc.setDrawColor(230);
        doc.line(margin, yPos, 190, yPos);
        yPos += 10;
        doc.setDrawColor(0);
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

    // --- CHAT HISTORY PAGE (New) ---
    if (chatMessages && chatMessages.length > 0) {
        doc.addPage();
        yPos = 20;
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(0);
        doc.text("Chatgeschiedenis", margin, yPos);
        yPos += 15;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        chatMessages.forEach((msg) => {
            // Check for page break
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }

            // Role Header
            doc.setFont("helvetica", "bold");
            const roleText = msg.role === 'assistant' ? 'Assistent' : 'Gebruiker';
            doc.setTextColor(msg.role === 'assistant' ? 70 : 0);
            doc.text(`${roleText}:`, margin, yPos);
            
            const timeStr = new Date(msg.timestamp).toLocaleTimeString('nl-NL');
            doc.setFont("helvetica", "italic");
            doc.setTextColor(120);
            doc.text(timeStr, 170, yPos);
            yPos += 5;

            // Message Content
            doc.setFont("helvetica", "normal");
            doc.setTextColor(0);
            const contentLines = doc.splitTextToSize(msg.content, 170);
            doc.text(contentLines, margin, yPos);
            
            yPos += contentLines.length * 5 + 8; // Spacing between items
        });
    }

    // --- SAVE PDF TO FIRESTORE (Base64) ---
    try {
        if (db) {
            const pdfBase64 = doc.output('datauristring');
            const fileName = `Idea_${selectedIdea.name.replace(/\s+/g, '_')}_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`;
            
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

    doc.save(`Idea_${selectedIdea.name.replace(/\s+/g, '_')}.pdf`);
  };
  
  const handleExportCSV = () => {
    if (!ideaDetails || !selectedIdea) return;
    
    const headers = ["ID", "Title", "User Story", "Story Points", "Priority", "Acceptance Criteria", "Business Value", "Dependencies"];
    // Map data to CSV rows
    const rows = ideaDetails.pbis.map(pbi => [
      `"${pbi.id || ''}"`,
      `"${pbi.title.replace(/"/g, '""')}"`,
      `"${(pbi.userStory || pbi.description || '').replace(/"/g, '""')}"`,
      pbi.storyPoints,
      `"${(pbi.priority || '').replace(/"/g, '""')}"`,
      `"${(pbi.acceptanceCriteria?.join('; ') || '').replace(/"/g, '""')}"`,
      `"${(pbi.businessValue || '').replace(/"/g, '""')}"`,
      `"${(pbi.dependencies?.join('; ') || '').replace(/"/g, '""')}"`
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

  const handleStressTest = async () => {
    if (!db) return;
    
    // Limit to 200 ideas total in one session
    const currentCount = ideas.length;
    const limit = 200;
    const batchSize = 10;
    const remaining = limit - currentCount;
    
    if (remaining <= 0) {
      alert(`Limiet van ${limit} ideeën bereikt voor deze sessie.`);
      return;
    }

    // Add 10 ideas per click, but don't exceed the total limit of 200
    const countToAdd = Math.min(remaining, batchSize);

    const stressIdeas = [
      // Cluster 1: Magazijn Automatisering
      "We moeten robots inzetten voor het orderpicken in het magazijn.",
      "Zelfrijdende karretjes die de orders naar de inpaktafel brengen.",
      "Automatisering van het magazijn met robots die 's nachts doorwerken.",
      "Gebruik drones voor voorraadtelling in de hoge stellingen.",
      
      // Cluster 2: Duurzaamheid
      "Al onze verpakkingen moeten van gerecycled materiaal zijn.",
      "Geen plastic meer gebruiken bij het verzenden van pakketjes.",
      "Overstappen op elektrisch vervoer voor de bezorging van onze producten.",
      "Zonnepanelen op het dak van het distributiecentrum leggen.",

      // Cluster 3: Medewerker Welzijn
      "Gratis fruit en gezonde lunch voor alle medewerkers.",
      "Een sportruimte inrichten waar we in de pauze kunnen sporten."
    ];

    try {
      const ideasRef = collection(db, COLLECTIONS.SESSIONS, sessionId, COLLECTIONS.IDEAS);
      const promises = [];
      
      for (let i = 0; i < countToAdd; i++) {
        const content = stressIdeas[i % stressIdeas.length];
        promises.push(addDoc(ideasRef, {
          name: `Test Gebruiker ${Math.floor(Math.random() * 1000)}`,
          content: content,
          timestamp: Date.now() + i
        }));
      }
      
      await Promise.all(promises);
    } catch (e) {
      console.error("Stress test failed:", e);
    }
  };

  const handleOpenFollowUpModal = async () => {
    if (!selectedIdea || isGeneratingFollowUp) {
        return;
    }
    
    setShowFollowUpModal(true);
    setIsGeneratingFollowUp(true);
    setFollowUpQuestion(''); // Clear previous question

    try {
        const response = await fetch('/api/generate-follow-up-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                context, 
                idea: selectedIdea,
                existingQuestions: ideaDetails?.questions || [] 
            })
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();
        setFollowUpQuestion(data.question || '');
        
        if (data.error) {
            // AI generation had an error
        }
    } catch (err) {
        // Fallback in case of network/server error
        setFollowUpQuestion(`Hoe kunnen we het idee "${selectedIdea.name}" verder uitbouwen voor maximale impact?`);
    } finally {
        setIsGeneratingFollowUp(false);
    }
  };

  const handleStartFollowUpSession = async () => {
    if (!db || !followUpQuestion.trim()) return;
    
    setIsStartingFollowUp(true);
    
    try {
        const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);
        
        // 1. Clear all ideas from the current session
        const ideasRef = collection(db, COLLECTIONS.SESSIONS, sessionId, COLLECTIONS.IDEAS);
        const ideasSnapshot = await getDocs(ideasRef);
        const deletePromises = ideasSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        // 2. Update session with new question and reset state
        await updateDoc(sessionRef, {
            question: followUpQuestion,
            isActive: true, // Make sure it's active again
            phase: 'LIVE',
            selectedIdeaId: null,
            selectedManualIdeaId: null,
            analysis: null,
            updatedAt: Date.now()
        });

        // Small delay to show 100% progress
        setFollowUpProgress(100);
        setTimeout(() => {
            setIsStartingFollowUp(false);
            // 3. Reset local state
            setShowFollowUpModal(false);
            setPhase('LIVE');
            setIdeas([]);
            setAnalysis(null);
            setAnimatedScore(0);
            setSelectedIdeaId(null);
            setIdeaDetails(null);
            setContext(followUpQuestion);
            setHasRevealed(false);
            setRevealedIdeaId(null);
        }, 500);
        
    } catch (err) {
        setIsStartingFollowUp(false);
        console.error("Error starting follow-up session:", err);
    }
  };

  const handleSaveSession = async () => {
    if (!db || !auth.currentUser) return;
    
    try {
      const savedSession: SavedSession = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        question: context,
        ideas: ideas,
        analysis: analysis || undefined,
        name: `${new Date().toLocaleDateString()} - ${context.substring(0, 30)}...`
      };

      await addDoc(collection(db, COLLECTIONS.USERS, auth.currentUser.uid, COLLECTIONS.SAVED_SESSIONS), savedSession);
      alert("Sessie succesvol opgeslagen!");
    } catch (error) {
      console.error("Error saving session:", error);
      alert("Er ging iets mis bij het opslaan van de sessie.");
    }
  };

  const handleLoadSessionClick = async () => {
     if (!db || !auth.currentUser) return;
     try {
         const q = query(collection(db, COLLECTIONS.USERS, auth.currentUser.uid, COLLECTIONS.SAVED_SESSIONS), orderBy('timestamp', 'desc'));
         const querySnapshot = await getDocs(q);
         const sessions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedSession));
         setSavedSessions(sessions);
         setShowLoadSessionModal(true);
     } catch (error) {
         console.error("Error fetching saved sessions:", error);
     }
  };

  const handleSelectSession = (session: SavedSession) => {
      setContext(session.question);
      setIdeas(session.ideas);
      if (session.analysis) {
          setAnalysis(session.analysis);
      }
      setIsReadOnly(true);
      setShowLoadSessionModal(false);
      setPhase('ANALYSIS');
  };

  const selectedIdea = analysis?.topIdeas.find(i => i.id === selectedIdeaId);

  const handleStartReveal = () => {
    if (analysis && analysis.topIdeas.length > 0) {
        setRevealedIdeaId(analysis.topIdeas[0].id);
        setShowRevealModal(true);
    }
  };

  const handleConfirmReveal = () => {
    setShowRevealModal(false);
    setHasRevealed(true);
    if (revealedIdeaId) {
        setSelectedIdeaId(revealedIdeaId);
    }
  };

  return (
    <div className="h-screen bg-brand-dark text-white font-sans flex flex-col overflow-hidden relative">
      
      {/* --- COUNTDOWN OVERLAY --- */}
      {isClosing && (
        <div className="absolute inset-0 z-[200] bg-black flex flex-col items-center justify-center animate-in fade-in duration-300">
           <h2 className="text-4xl text-gray-500 font-mono tracking-widest mb-4">CLOSING SESSION</h2>
           <div className={`text-[15rem] leading-none font-black text-brand-primary transition-all duration-75 ${closingCountdown <= 3 ? 'animate-pulse' : ''}`}>
             {closingCountdown}
           </div>
           <p className="mt-8 text-xl text-white">Saving data & Initializing AI...</p>
        </div>
      )}

      {/* Admin Navbar */}
      <nav className="bg-brand-panel border-b border-white/10 px-6 h-16 flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center space-x-4">
             <span className="font-sans font-black text-xl tracking-tighter">
                <span className="text-brand-primary text-2xl">{TEXTS.APP_NAME.PREFIX}</span> {TEXTS.APP_NAME.MAIN} <span className="text-gray-400 font-light">{TEXTS.APP_NAME.SUFFIX}</span>
                <span className="text-gray-600 text-xs ml-2 font-mono">{TEXTS.APP_NAME.VERSION}</span>
              </span>
             {sessionCode && (
                <span className="flex items-center text-neon-green font-mono bg-neon-green/10 px-3 py-1 rounded border border-neon-green/20 ml-4 animate-in fade-in">
                    <Hash size={14} className="mr-2" /> 
                    EVENT CODE: <span className="font-bold ml-1 tracking-widest">{sessionCode.toUpperCase()}</span>
                </span>
             )}
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
                <>
                    <button 
                        onClick={handleStressTest}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-xs font-bold transition-all flex items-center shadow-[0_0_10px_rgba(249,115,22,0.3)] border border-orange-500/50"
                        title="Voeg 10 test-ideeën toe"
                    >
                        <Zap className="w-3 h-3 mr-1" />
                        STRESS TEST (+10)
                    </button>
                    <div className="h-4 w-px bg-white/20"></div>
                    <div className="flex items-center bg-black/50 px-3 py-1 rounded border border-white/10 text-neon-cyan font-mono animate-pulse-slow">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>{formatDuration(sessionDuration)}</span>
                    </div>
                </>
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
      <main className="flex-1 p-6 flex flex-col overflow-y-auto relative">
        
        {/* PHASE 0: MENU (HUB) */}
        {phase === 'MENU' && (
            <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
                    {/* Settings Card */}
                    <button 
                        onClick={() => setShowSettings(true)}
                        className="group bg-brand-panel border border-white/10 p-10 rounded-lg hover:border-white/30 hover:bg-white/5 transition-all text-left flex flex-col"
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
                        className="group bg-brand-panel border border-white/10 p-10 rounded-lg hover:border-brand-primary/50 hover:bg-brand-primary/5 transition-all text-left flex flex-col"
                    >
                        <div className="p-4 bg-brand-primary/10 rounded-full w-fit mb-6 group-hover:scale-110 transition-transform">
                            <Play className="w-10 h-10 text-brand-primary" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">{TEXTS.ADMIN_DASHBOARD.HUB.BTN_START}</h3>
                        <p className="text-gray-400">{TEXTS.ADMIN_DASHBOARD.HUB.DESC_START}</p>
                    </button>
                    {/* Reports Card */}
                    <button 
                        onClick={() => setShowReports(true)}
                        className="group bg-brand-panel border border-white/10 p-10 rounded-lg hover:border-white/30 hover:bg-white/5 transition-all text-left flex flex-col"
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
                <div className="bg-brand-panel border border-white/20 rounded-lg max-w-4xl w-full p-8 shadow-2xl relative animate-in fade-in zoom-in duration-300 flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
                    <button 
                        onClick={() => setShowReports(false)}
                        className="absolute top-6 right-6 text-gray-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                    
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center flex-shrink-0">
                        <FileIcon className="mr-3 text-brand-primary" />
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
            <div className="max-w-2xl w-full bg-brand-panel border border-white/10 rounded-lg p-10 shadow-2xl relative">
              <button 
                onClick={() => setPhase('MENU')}
                className="absolute top-4 right-4 text-gray-500 hover:text-white"
              >
                  <X size={20} />
              </button>
              <div className="flex items-center mb-6 text-brand-primary">
                <Brain className="w-8 h-8 mr-3" />
                <h2 className="text-2xl font-bold text-white">{TEXTS.ADMIN_DASHBOARD.SETUP.TITLE}</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">{TEXTS.ADMIN_DASHBOARD.SETUP.LABEL}</label>
                  <textarea 
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    className="w-full bg-black/50 border border-white/20 rounded-md p-4 text-xl text-white focus:border-brand-primary focus:outline-none min-h-[120px]"
                    placeholder={TEXTS.ADMIN_DASHBOARD.SETUP.PLACEHOLDER}
                  />
                </div>
                
                <button 
                  onClick={handleStartSession}
                  disabled={context.length < 5 || isStarting}
                  className={`w-full py-5 text-lg font-bold rounded-md flex items-center justify-center transition-all relative overflow-hidden ${
                    context.length >= 5 && !isStarting
                      ? 'bg-neon-green text-black hover:bg-green-400 shadow-[0_0_20px_rgba(10,255,10,0.3)]' 
                      : 'bg-white/5 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isStarting && (
                    <div 
                      className="absolute left-0 top-0 h-full bg-white/20 transition-all duration-300 ease-out"
                      style={{ width: `${startProgress}%` }}
                    />
                  )}
                  {isStarting ? (
                    <>
                      <div className="animate-spin mr-3 h-5 w-5 border-2 border-black border-t-transparent rounded-full" />
                      <span>{Math.round(startProgress)}% Bezig met starten...</span>
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 w-5 h-5" />
                      {TEXTS.ADMIN_DASHBOARD.SETUP.BTN_START}
                    </>
                  )}
                </button>

                <button 
                  onClick={handleLoadSessionClick}
                  className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded-md flex items-center justify-center transition-all"
                >
                  <FolderOpen className="mr-2 w-5 h-5" />
                  Laad Eerdere Sessie
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PHASE 2: LIVE */}
        {phase === 'LIVE' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 min-h-full animate-in fade-in duration-500">
             {/* Left: QR Code */}
             <div className="bg-black/40 border border-white/10 rounded-lg p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center relative overflow-hidden xl:h-full">
                <div className="text-center">
                    <div className="bg-white p-3 sm:p-4 rounded-lg shadow-[0_0_50px_rgba(255,255,255,0.1)] mb-4 sm:mb-6 mx-auto inline-block">
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`https://ideaprocessor.netlify.app/`)}`}
                            alt="Scan QR" 
                            className="w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-80 lg:h-80 object-contain"
                        />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">{TEXTS.ADMIN_DASHBOARD.LIVE.SCAN_TITLE}</h2>
                    
                    <div className="flex flex-col gap-2 mb-5 sm:mb-8 items-center">
                         <p className="text-gray-400 text-sm uppercase tracking-widest font-bold">Event Code</p>
                         {sessionCode ? (
                            <p className="text-brand-primary font-mono text-4xl sm:text-5xl md:text-6xl font-black tracking-widest bg-white/10 px-4 sm:px-6 md:px-8 py-3 sm:py-4 rounded-lg border-2 border-neon-green/50 shadow-[0_0_30px_rgba(57,255,20,0.2)]">
                                {sessionCode.toUpperCase()}
                            </p>
                         ) : (
                            <p className="text-gray-500 italic">Laden...</p>
                         )}
                         <p className="text-gray-500 font-mono text-xs mt-4">
                            Deelnemers voeren deze code in om mee te doen.
                         </p>
                    </div>
                    
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4 max-w-md mx-auto w-full">
                        <p className="text-gray-400 text-sm mb-1">Ga naar:</p>
                        <p className="text-neon-cyan font-mono text-xl font-bold tracking-wide select-all">ideaprocessor.netlify.app</p>
                        <p className="text-gray-500 text-xs mt-1">en voer de code in.</p>
                    </div>
                </div>
             </div>

             {/* Right: Stats & Logs */}
             <div className="flex flex-col gap-6 h-auto xl:h-full min-h-0">
                <div className="grid grid-cols-2 gap-4 flex-shrink-0">
                    <div className="bg-brand-panel border border-white/10 p-6 rounded-lg">
                        <div className="flex items-center text-gray-400 mb-2">
                            <Users className="w-4 h-4 mr-2" />
                            <span className="text-xs font-mono uppercase">{TEXTS.ADMIN_DASHBOARD.LIVE.PARTICIPANTS}</span>
                        </div>
                        <div className="text-4xl font-black">{Math.floor(ideas.length * 1.5)}</div>
                    </div>
                    <div className="bg-brand-panel border border-white/10 p-6 rounded-lg">
                        <div className="flex items-center text-gray-400 mb-2">
                            <Activity className="w-4 h-4 mr-2" />
                            <span className="text-xs font-mono uppercase">{TEXTS.ADMIN_DASHBOARD.LIVE.IDEAS}</span>
                        </div>
                        <div className="text-4xl font-black text-neon-cyan">{ideas.length}</div>
                    </div>
                </div>

                <div className="flex-1 bg-brand-panel border border-white/10 rounded-lg relative flex flex-col min-h-0">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-primary to-transparent opacity-20 z-10"></div>
                    
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
                        className="w-24 py-6 text-xs font-bold rounded-lg shadow-lg bg-brand-primary hover:opacity-90 text-white shadow-purple-900/20 flex flex-col items-center justify-center transition-all"
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
            <div className="space-y-8 pb-8">
                {/* Header Stats */}
                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                  <div>
                    <h2 className="text-3xl font-black text-white mb-1">{TEXTS.ADMIN_DASHBOARD.ANALYSIS.TITLE}</h2>
                    <p className="text-gray-400">Context: <span className="text-white italic">"{context}"</span></p>
                  </div>
                  <div className="text-right flex items-center gap-4">
                     <button
                        onClick={handleSaveSession}
                        className="flex items-center text-sm font-bold text-gray-400 hover:text-white transition-colors"
                     >
                        <Save className="w-4 h-4 mr-2" />
                        Opslaan
                     </button>
                     <div>
                         <span className="block text-3xl font-bold text-neon-cyan">{ideas.length}</span>
                         <span className="text-xs text-gray-500 uppercase">{TEXTS.ADMIN_DASHBOARD.LIVE.IDEAS}</span>
                     </div>
                  </div>
                </div>

                {/* Innovation Intelligence Display */}
                {analysis && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Innovation Score Gauge */}
                        <div className="bg-brand-panel border border-white/10 rounded-lg p-6 flex flex-col items-center justify-center relative overflow-hidden group hover:border-brand-primary/30 transition-colors h-[280px]">
                            
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
                                            stroke={animatedScore > 80 ? "#0aff0a" : animatedScore > 50 ? "#00f3ff" : "#A855F7"}
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
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-primary/10 rounded-full blur-3xl"></div>
                            
                            <div className="flex items-center space-x-2 text-brand-primary font-mono text-xs mb-4">
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

                {/* Top Ideas Grid REPLACEMENT */}
                <div>
                   <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                     {hasRevealed ? "Geselecteerd Top Idee" : "Top Idee Onthulling"}
                   </h3>
                   
                   <div className="flex flex-col md:flex-row gap-6">
                      {/* 1. If REVEALED: Show the Idea Card First */}
                      {hasRevealed && revealedIdeaId && (() => {
                          const idea = analysis?.topIdeas.find(i => i.id === revealedIdeaId);
                          if (!idea) return null;
                          return (
                            <div 
                              key={idea.id}
                              className="flex-1 p-8 rounded-lg border relative bg-brand-primary/10 border-brand-primary shadow-[0_0_20px_rgba(168,85,247,0.2)] animate-in fade-in slide-in-from-bottom-4 duration-500"
                            >
                              <div className="absolute top-4 right-4 text-brand-primary">
                                <Check className="w-8 h-8" />
                              </div>
                              <div className="mb-6">
                                <span className="text-sm font-mono text-gray-400">
                                    {new Date(idea.timestamp).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <h4 className="text-2xl font-bold text-white mt-2">{idea.name}</h4>
                              </div>
                              <p className="text-white text-xl leading-relaxed italic">
                                "{idea.content}"
                              </p>
                            </div>
                          );
                      })()}

                      {/* 2. REVEAL ACTION CARD */}
                      <button 
                          onClick={handleStartReveal}
                          className={`
                              group relative overflow-hidden rounded-lg border border-dashed border-white/30 flex flex-col items-center justify-center text-center transition-all
                              ${hasRevealed ? 'w-full md:w-1/3 bg-white/5 hover:bg-white/10 min-h-[200px]' : 'w-full bg-gradient-to-br from-white/5 to-white/10 hover:from-white/10 hover:to-white/20 min-h-[200px] lg:min-h-[400px]'}
                          `}
                      >
                          <div className={`rounded-full mb-6 group-hover:scale-110 transition-transform ${hasRevealed ? 'p-3 bg-white/5' : 'p-6 bg-neon-cyan/20'}`}>
                              <Sparkles className={`${hasRevealed ? 'w-6 h-6 text-gray-400' : 'w-12 h-12 text-neon-cyan'}`} />
                          </div>
                          <h3 className={`${hasRevealed ? 'text-lg' : 'text-3xl'} font-bold text-white mb-2`}>
                              {hasRevealed ? "Kies een ander idee" : "Onthul het Top Idee"}
                          </h3>
                          <p className="text-gray-400 max-w-md px-4">
                              {hasRevealed ? "Start de onthulling opnieuw om een andere winnaar te kiezen." : "Start de spectaculaire onthulling van het beste idee uit deze sessie."}
                          </p>
                      </button>
                   </div>
                </div>

                {/* Next Step Action */}
                <div className="flex justify-between items-center pt-4">
                  <div>
                    <button 
                      onClick={handleReset}
                      className="px-6 py-4 bg-white/10 text-white hover:bg-white/20 font-bold rounded flex items-center transition-all border border-white/10"
                    >
                      <RotateCcw className="mr-2 w-5 h-5" />
                      {TEXTS.ADMIN_DASHBOARD.DETAIL.BTN_RESET}
                    </button>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => setShowOverview(true)}
                      className="px-6 py-4 bg-white/10 text-white hover:bg-white/20 font-bold rounded flex items-center transition-all border border-white/10"
                    >
                      <List className="mr-2 w-5 h-5" />
                      Bekijk alle ideeën
                    </button>
                    <button 
                      onClick={handleClusterIdeas}
                      className="px-6 py-4 bg-white/10 text-white hover:bg-white/20 font-bold rounded flex items-center transition-all border border-white/10 ml-4"
                    >
                      <Sparkles className="mr-2 w-5 h-5 text-neon-purple" />
                      Samenvoegen
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

              </div>
          </div>
        )}

        {/* PHASE 4: DETAIL VIEW (WITH TABS) */}
        {phase === 'DETAIL' && selectedIdea && ideaDetails && (
            <div className="flex h-full animate-in zoom-in-95 duration-500 overflow-hidden">
                <div className="flex flex-col flex-1 overflow-hidden min-w-0 relative">
                {/* Header */}
                <div className="flex-shrink-0 bg-brand-panel border border-white/20 p-6 rounded-lg mb-4 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-bl-full -mr-8 -mt-8"></div>
                    <div className="relative z-10">
                        <div className="flex items-center text-brand-primary mb-2 font-mono text-sm uppercase tracking-widest">
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
                        className={`whitespace-nowrap px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'GENERAL' ? 'border-brand-primary text-white bg-white/5' : 'border-transparent text-gray-500 hover:text-white hover:bg-white/5'}`}
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
                    <button 
                        onClick={() => setActiveTab('PRESS_RELEASE')}
                        className={`whitespace-nowrap px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'PRESS_RELEASE' ? 'border-blue-500 text-white bg-white/5' : 'border-transparent text-gray-500 hover:text-white hover:bg-white/5'}`}
                    >
                       <span className="flex items-center"><Share2 className="w-4 h-4 mr-2" /> Persbericht</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('BLOG')}
                        className={`whitespace-nowrap px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'BLOG' ? 'border-yellow-500 text-white bg-white/5' : 'border-transparent text-gray-500 hover:text-white hover:bg-white/5'}`}
                    >
                       <span className="flex items-center"><FileText className="w-4 h-4 mr-2" /> Blog</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('POWERPOINT')}
                        className={`whitespace-nowrap px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'POWERPOINT' ? 'border-brand-primary text-white bg-white/5' : 'border-transparent text-gray-500 hover:text-white hover:bg-white/5'}`}
                    >
                       <span className="flex items-center"><Presentation className="w-4 h-4 mr-2" /> PowerPoint</span>
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
                             <div className="md:col-span-2 bg-brand-primary/5 border border-brand-primary/20 p-6 rounded-lg">
                                <h4 className="text-brand-primary font-mono text-xs uppercase mb-2">Risk Analysis</h4>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-white font-bold text-lg">Risico's</h3>
                                    <button onClick={() => handleCopyToChat(ideaDetails.businessCase?.risks?.join('\n') || '')} className="text-gray-400 hover:text-brand-primary transition-colors" title="Kopieer"><MessageSquare className="w-4 h-4" /></button>
                                </div>
                                <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {ideaDetails.businessCase?.risks?.map((risk, idx) => (
                                        <li key={idx} className="flex items-start text-gray-300 text-sm">
                                            <TrendingUp className="w-4 h-4 mr-2 text-brand-primary flex-shrink-0 mt-1" />
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

                    {activeTab === 'PRESS_RELEASE' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {!ideaDetails.pressRelease ? (
                                <div className="bg-white/5 border border-white/10 p-10 rounded-lg text-center max-w-2xl mx-auto">
                                    <Share2 className="w-16 h-16 text-blue-500 mx-auto mb-6 opacity-50" />
                                    <h3 className="text-2xl font-bold text-white mb-4">Genereer Persbericht</h3>
                                    <p className="text-gray-400 mb-8">
                                        Kies een stijl voor het persbericht en laat de AI een professioneel bericht schrijven.
                                    </p>
                                    
                                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                                        <select 
                                            value={pressReleaseStyle}
                                            onChange={(e) => setPressReleaseStyle(e.target.value)}
                                            className="bg-black/50 border border-white/20 rounded-md px-4 py-3 text-white focus:outline-none focus:border-blue-500 w-full sm:w-64"
                                        >
                                            <option value="zakelijk">Zakelijk</option>
                                            <option value="spannend">Spannend</option>
                                            <option value="humor">Humor</option>
                                        </select>
                                        
                                        <button 
                                            onClick={handleGeneratePressRelease}
                                            disabled={isGeneratingPressRelease}
                                            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-md transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                                        >
                                            {isGeneratingPressRelease ? (
                                                <>
                                                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                                    Bezig...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-4 h-4 mr-2" />
                                                    Genereren
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                             <div className="bg-white text-black p-10 rounded-lg shadow-2xl max-w-4xl mx-auto font-serif relative">
                                <button 
                                    onClick={() => setIdeaDetails({...ideaDetails, pressRelease: undefined})}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors"
                                    title="Opnieuw genereren"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                </button>
                                <div className="border-b-2 border-black pb-6 mb-6 flex justify-between items-end">
                                    <div>
                                        <h4 className="text-xs font-sans font-bold uppercase tracking-widest text-gray-500 mb-1">VOOR ONMIDDELLIJKE PUBLICATIE</h4>
                                        <div className="text-sm font-sans text-gray-600">
                                            {ideaDetails.pressRelease.location} — {ideaDetails.pressRelease.date}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                         <div className="text-2xl font-black font-sans text-brand-primary">IDEA</div>
                                         <div className="text-xs font-sans text-gray-500">Persrelaties</div>
                                    </div>
                                </div>
                                
                                <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
                                    {ideaDetails.pressRelease.title}
                                </h2>
                                
                                <div className="whitespace-pre-line text-lg leading-relaxed text-gray-800">
                                    {ideaDetails.pressRelease.content}
                                </div>

                                <div className="mt-10 pt-6 border-t border-gray-300 text-center text-sm text-gray-500 font-sans">
                                    ###
                                    <br/><br/>
                                    <strong>Over de Idea Processor</strong><br/>
                                    De Idea Processor ontwikkelt cloud software voor kleine en middelgrote bedrijven en hun accountants. De producten automatiseren bedrijfsprocessen zoals financiën en HR.
                                </div>
                             </div>
                            )}
                             {ideaDetails.pressRelease && (
                                <div className="mt-4 flex justify-end max-w-4xl mx-auto">
                                    <button onClick={() => handleCopyToChat(ideaDetails.pressRelease?.content || '')} className="text-gray-400 hover:text-white transition-colors flex items-center" title="Kopieer"><MessageSquare className="w-4 h-4 mr-2" /> Kopieer naar Chat</button>
                                </div>
                             )}
                        </div>
                    )}

                    {activeTab === 'BLOG' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {!ideaDetails.blogPost ? (
                                <div className="bg-white/5 border border-white/10 p-10 rounded-lg text-center max-w-2xl mx-auto">
                                    <FileIcon className="w-16 h-16 text-yellow-500 mx-auto mb-6 opacity-50" />
                                    <h3 className="text-2xl font-bold text-white mb-4">Genereer Blog Post</h3>
                                    <p className="text-gray-400 mb-8">
                                        Kies een stijl voor de blog post en laat de AI een inspirerend artikel schrijven.
                                    </p>
                                    
                                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                                        <select 
                                            value={blogStyle}
                                            onChange={(e) => setBlogStyle(e.target.value)}
                                            className="bg-black/50 border border-white/20 rounded-md px-4 py-3 text-white focus:outline-none focus:border-blue-500 w-full sm:w-64"
                                        >
                                            <option value="zakelijk">Zakelijk</option>
                                            <option value="spannend">Spannend</option>
                                            <option value="humor">Humor</option>
                                        </select>
                                        
                                        <button 
                                            onClick={handleGenerateBlog}
                                            disabled={isGeneratingBlog}
                                            className="px-8 py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-md transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                                        >
                                            {isGeneratingBlog ? (
                                                <>
                                                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                                    Bezig...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-4 h-4 mr-2" />
                                                    Genereren
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                             <div className="bg-white/5 border border-white/10 p-10 rounded-lg max-w-4xl mx-auto relative">
                                <button 
                                    onClick={() => setIdeaDetails({...ideaDetails, blogPost: undefined})}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                                    title="Opnieuw genereren"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                </button>
                                <div className="flex items-center mb-8">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-xl mr-4">
                                        E
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white">Idea Tech Blog</h3>
                                        <p className="text-xs text-gray-400">Innovatie & Technologie</p>
                                    </div>
                                </div>

                                <h1 className="text-3xl md:text-4xl font-bold text-white mb-8 leading-tight">
                                    {ideaDetails.blogPost.title}
                                </h1>

                                <div className="prose prose-invert prose-lg max-w-none">
                                    <div className="whitespace-pre-line text-gray-300 leading-relaxed">
                                        {ideaDetails.blogPost.content}
                                    </div>
                                </div>
                                
                                <div className="mt-10 pt-6 border-t border-white/10 flex items-center justify-between">
                                    <div className="flex space-x-4">
                                        <button className="text-gray-400 hover:text-white transition-colors"><Share2 className="w-5 h-5" /></button>
                                        <button className="text-gray-400 hover:text-white transition-colors"><MessageSquare className="w-5 h-5" /></button>
                                    </div>
                                    <button onClick={() => handleCopyToChat(ideaDetails.blogPost?.content || '')} className="text-gray-400 hover:text-white transition-colors flex items-center text-sm" title="Kopieer"><MessageSquare className="w-4 h-4 mr-2" /> Bespreek in Chat</button>
                                </div>
                             </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'POWERPOINT' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {!ideaDetails.pptOutline ? (
                                <div className="bg-white/5 border border-white/10 p-10 rounded-lg text-center max-w-2xl mx-auto">
                                    <Presentation className="w-16 h-16 text-exact-red mx-auto mb-6 opacity-50" />
                                    <h3 className="text-2xl font-bold text-white mb-4">Genereer PowerPoint Deck</h3>
                                    <p className="text-gray-400 mb-8">
                                        Maak een volledige presentatie (12 dia's) inclusief sprekersnotities.
                                    </p>
                                    
                                    <button 
                                        onClick={handleGeneratePPT}
                                        disabled={isGeneratingPPT}
                                        className="px-8 py-3 bg-exact-red hover:bg-red-700 text-white font-bold rounded-md transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
                                    >
                                        {isGeneratingPPT ? (
                                            <>
                                                <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                                Bezig...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                Genereren
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                             <div className="max-w-4xl mx-auto">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-2xl font-bold text-white flex items-center">
                                        <Presentation className="mr-3 text-exact-red" />
                                        Presentatie Overzicht ({ideaDetails.pptOutline.slides.length} dia's)
                                    </h3>
                                    <div className="flex gap-4">
                                        <button 
                                            onClick={() => setShowPPTViewer(true)}
                                            className="px-6 py-2 bg-neon-green/10 hover:bg-neon-green/20 text-neon-green font-bold rounded flex items-center transition-all border border-neon-green/20"
                                        >
                                            <Play className="w-4 h-4 mr-2" />
                                            Presenteer
                                        </button>
                                        <button 
                                            onClick={() => setIdeaDetails({...ideaDetails, pptOutline: undefined})}
                                            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                            title="Reset"
                                        >
                                            <RotateCcw className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={handleDownloadPPT}
                                            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded flex items-center transition-all border border-white/20"
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Download .PPTX
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {ideaDetails.pptOutline.slides.map((slide, idx) => (
                                        <div key={idx} className="bg-brand-panel border border-white/10 p-6 rounded-lg group hover:bg-white/10 transition-colors">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center w-full">
                                                    <span className="bg-white/10 text-gray-400 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">
                                                        {idx + 1}
                                                    </span>
                                                    
                                                    {/* Editable Title */}
                                                    {editingSlideIndex === idx && editingContentIndex === null ? (
                                                        <div className="flex-1 flex items-center">
                                                            <input 
                                                                type="text" 
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                className="flex-1 bg-black/50 border border-white/30 rounded px-2 py-1 text-lg font-bold text-white focus:outline-none focus:border-neon-green"
                                                                autoFocus
                                                            />
                                                            <button onClick={handleSaveSlideContent} className="ml-2 p-1 text-neon-green hover:bg-white/10 rounded"><Check size={18} /></button>
                                                            <button onClick={() => setEditingSlideIndex(null)} className="ml-1 p-1 text-red-500 hover:bg-white/10 rounded"><X size={18} /></button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex-1 flex items-center group/title">
                                                            <h4 className="font-bold text-lg text-white mr-2">{slide.title}</h4>
                                                            <button 
                                                                onClick={() => {
                                                                    setEditingSlideIndex(idx);
                                                                    setEditingContentIndex(null);
                                                                    setEditValue(slide.title);
                                                                }}
                                                                className="opacity-0 group-hover/title:opacity-100 text-gray-500 hover:text-white transition-all"
                                                            >
                                                                <Edit3 size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="pl-11">
                                                <div className="space-y-2 mb-4">
                                                    {slide.content?.map((point, i) => (
                                                        <div key={i} className="flex items-start group/item">
                                                            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                                                            
                                                            {editingSlideIndex === idx && editingContentIndex === i ? (
                                                                <div className="flex-1 flex items-start">
                                                                    <textarea 
                                                                        value={editValue}
                                                                        onChange={(e) => setEditValue(e.target.value)}
                                                                        className="flex-1 bg-black/50 border border-white/30 rounded px-2 py-1 text-gray-300 focus:outline-none focus:border-neon-green min-h-[60px]"
                                                                        autoFocus
                                                                    />
                                                                    <div className="flex flex-col ml-2">
                                                                        <button onClick={handleSaveSlideContent} className="p-1 text-neon-green hover:bg-white/10 rounded mb-1"><Check size={16} /></button>
                                                                        <button onClick={() => setEditingSlideIndex(null)} className="p-1 text-red-500 hover:bg-white/10 rounded"><X size={16} /></button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex-1 flex items-start">
                                                                    <p className="text-gray-300">{point}</p>
                                                                    <button 
                                                                        onClick={() => {
                                                                            setEditingSlideIndex(idx);
                                                                            setEditingContentIndex(i);
                                                                            setEditValue(point);
                                                                        }}
                                                                        className="opacity-0 group-hover/item:opacity-100 ml-2 text-gray-500 hover:text-white transition-all mt-1"
                                                                    >
                                                                        <Edit3 size={12} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                
                                                {slide.speakerNotes && (
                                                    <div className="bg-black/30 p-4 rounded text-sm text-gray-500 italic border-l-2 border-brand-primary/50">
                                                        <span className="text-brand-primary font-bold not-italic mr-2">Speaker Notes:</span>
                                                        {slide.speakerNotes}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex-shrink-0 border-t border-white/10 pt-4 pb-4 bg-brand-dark z-20 flex flex-nowrap overflow-x-auto gap-4 justify-between items-center sticky bottom-0 shadow-2xl">
                     <div className="flex gap-4 flex-nowrap">
                        <button 
                            onClick={handleOpenFollowUpModal}
                            className="whitespace-nowrap px-6 py-3 bg-neon-green/10 text-neon-green border border-neon-green/50 hover:bg-neon-green/20 font-bold rounded flex items-center transition-all"
                        >
                            <Play className="mr-2 w-4 h-4" />
                            Start Vervolg Sessie
                        </button>
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
                            className="whitespace-nowrap px-6 py-3 bg-brand-primary text-white hover:opacity-90 font-bold rounded flex items-center transition-all"
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
                    onMessagesChange={setChatMessages}
                />
            </div>
        )}

        {/* Global Loading Overlay with Progress */}
        {(isAnalyzing || isGeneratingDetails || isGeneratingFollowUp) && (
          <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="max-w-md w-full text-center">
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                <div 
                  className="absolute inset-0 border-4 border-brand-primary rounded-full animate-spin border-t-transparent"
                  style={{ animationDuration: '1.5s' }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center font-mono text-xl font-bold text-white">
                  {Math.round(generationProgress)}%
                </div>
              </div>

              <h2 className="text-3xl font-black text-white mb-4 tracking-tight">
                {isGeneratingFollowUp ? "Vervolgvraag genereren..." : (isGeneratingDetails ? TEXTS.ADMIN_DASHBOARD.DETAIL.LOADING : TEXTS.ADMIN_DASHBOARD.ANALYSIS.LOADING)}
              </h2>
              
              <p className="text-gray-400 mb-8 font-mono text-sm uppercase tracking-widest">
                AI engine is working on your innovation plan...
              </p>

              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden border border-white/5 shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-brand-primary to-purple-500 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                  style={{ width: `${generationProgress}%` }}
                ></div>
              </div>
              
              <div className="mt-4 flex justify-between text-[10px] font-mono text-gray-600 uppercase tracking-tighter">
                <span>Initializing AI</span>
                <span>Analyzing Vibe</span>
                <span>Generating Roadmap</span>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Reveal Modal */}
      <RevealIdeaModal
        isOpen={showRevealModal}
        onClose={() => setShowRevealModal(false)}
        idea={analysis?.topIdeas.find(i => i.id === revealedIdeaId) || null}
        context={context}
        onConfirm={handleConfirmReveal}
      />

      {/* Modal Overlay */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={confirmCancelSession}
        title="Sessie Annuleren"
        message="Weet je zeker dat je de sessie wilt annuleren? Alle verzamelde ideeën en data van deze sessie gaan definitief verloren."
        confirmText="Ja, Annuleren"
        cancelText="Nee, Terug"
        variant="danger"
      />

      {/* Follow-up Session Modal */}
      {showFollowUpModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-brand-panel border border-white/20 rounded-xl max-w-2xl w-full p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-green via-neon-cyan to-neon-purple"></div>
                
                <h2 className="text-3xl font-black text-white mb-6 flex items-center">
                    <Zap className="mr-3 text-neon-green animate-pulse" />
                    Vervolg Sessie Starten
                </h2>

                <p className="text-gray-400 mb-6">
                    De AI heeft een vervolgvraag gegenereerd op basis van het geselecteerde idee. 
                    Je kunt de vraag hieronder aanpassen voordat je de nieuwe sessie start.
                </p>

                <div className="bg-black/40 border border-white/10 rounded-lg p-6 mb-8 relative group">
                    <label className="block text-xs font-mono text-neon-green uppercase tracking-widest mb-3">Brainstorm Vraag</label>
                    {isGeneratingFollowUp ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-8 h-8 border-2 border-neon-green border-t-transparent rounded-full animate-spin mr-3"></div>
                            <span className="text-neon-green font-mono animate-pulse">Vraag genereren...</span>
                        </div>
                    ) : (
                        <textarea 
                            value={followUpQuestion}
                            onChange={(e) => setFollowUpQuestion(e.target.value)}
                            className="w-full bg-transparent border-none text-xl text-white focus:ring-0 resize-none min-h-[120px] font-medium leading-relaxed"
                            placeholder="Typ hier de nieuwe brainstorm vraag..."
                        />
                    )}
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit3 className="w-4 h-4 text-gray-500" />
                    </div>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg mb-8 flex items-start">
                    <AlertTriangle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-200/70">
                        <strong className="text-red-400">Let op:</strong> Bij het starten van een vervolgsessie worden alle huidige ideeën uit de database verwijderd om plaats te maken voor de nieuwe brainstorm. Zorg dat je eventuele exports (PBI/PDF) al hebt gedaan.
                    </p>
                </div>

                <div className="flex gap-4">
                    <button 
                        onClick={() => setShowFollowUpModal(false)}
                        className="flex-1 px-6 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-lg transition-all border border-white/10"
                    >
                        Annuleren
                    </button>
                    <button 
                        onClick={handleStartFollowUpSession}
                        disabled={isGeneratingFollowUp || isStartingFollowUp || !followUpQuestion.trim()}
                        className={`flex-[2] px-6 py-4 font-bold rounded-lg flex items-center justify-center transition-all relative overflow-hidden ${
                            isGeneratingFollowUp || isStartingFollowUp || !followUpQuestion.trim()
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-neon-green text-black hover:scale-[1.02] shadow-[0_0_20px_rgba(10,255,10,0.2)]'
                        }`}
                    >
                        {isStartingFollowUp && (
                            <div 
                                className="absolute left-0 top-0 h-full bg-white/20 transition-all duration-300 ease-out"
                                style={{ width: `${followUpProgress}%` }}
                            />
                        )}
                        {isStartingFollowUp ? (
                            <>
                                <div className="animate-spin mr-3 h-5 w-5 border-2 border-black border-t-transparent rounded-full" />
                                <span>{Math.round(followUpProgress)}% Bezig met starten...</span>
                            </>
                        ) : (
                            <>
                                <Play className="mr-2 w-5 h-5 fill-current" />
                                Start Vervolg Sessie
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
            <div className="bg-brand-panel border border-white/20 rounded-lg max-w-lg w-full p-8 shadow-2xl relative animate-in fade-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
                <button 
                    onClick={() => setShowSettings(false)}
                    className="absolute top-6 right-6 text-gray-400 hover:text-white"
                >
                    <X size={24} />
                </button>
                
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                    <Settings className="mr-3 text-brand-primary" />
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
                            className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-white font-mono tracking-wider focus:border-brand-primary focus:outline-none"
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
                            className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-white focus:border-brand-primary focus:outline-none min-h-[100px]"
                            placeholder={TEXTS.MODALS.SETTINGS.CONTEXT_PLACEHOLDER}
                        />
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button 
                        onClick={handleSaveSettings}
                        className="px-6 py-3 bg-brand-primary text-white font-bold rounded hover:opacity-90 transition-colors flex items-center"
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
            <div className="bg-brand-panel border border-white/20 rounded-lg max-w-4xl w-full p-8 shadow-2xl relative animate-in fade-in zoom-in duration-300 flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
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

                <div className="grid grid-cols-1 gap-6 max-h-[70vh] overflow-y-auto pr-2">
                    {ideaDetails.pbis.map((pbi, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/10 p-6 rounded-lg hover:border-neon-purple/50 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center">
                                    <span className="bg-neon-purple/20 text-neon-purple px-2 py-1 rounded text-xs font-mono mr-3 border border-neon-purple/30">
                                        {pbi.id || `PBI-${idx + 1}`}
                                    </span>
                                    <h3 className="font-bold text-xl text-white">{pbi.title}</h3>
                                </div>
                                <div className="flex gap-2">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                                        pbi.priority?.toLowerCase().includes('must') ? 'bg-red-500/10 text-red-500 border-red-500/30' :
                                        pbi.priority?.toLowerCase().includes('should') ? 'bg-orange-500/10 text-orange-500 border-orange-500/30' :
                                        'bg-blue-500/10 text-blue-500 border-blue-500/30'
                                    }`}>
                                        {pbi.priority || 'Medium'}
                                    </span>
                                    <span className="bg-black/40 border border-white/20 px-3 py-1 rounded text-xs font-bold text-neon-purple">
                                        {pbi.storyPoints} Story Points
                                    </span>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="bg-black/20 p-4 rounded border-l-2 border-neon-purple/50">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">User Story</h4>
                                    <p className="text-gray-200 text-sm leading-relaxed">{pbi.userStory || pbi.description}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center">
                                            <Check className="w-3 h-3 mr-1 text-neon-green" /> Acceptatiecriteria
                                        </h4>
                                        <ul className="space-y-1">
                                            {pbi.acceptanceCriteria?.map((ac, i) => (
                                                <li key={i} className="text-gray-400 flex items-start">
                                                    <span className="text-neon-green mr-2">•</span>
                                                    {ac}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Business Value</h4>
                                            <p className="text-gray-400 italic">{pbi.businessValue || 'Niet gespecificeerd'}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Dependencies</h4>
                                            <div className="flex flex-wrap gap-1">
                                                {pbi.dependencies?.map((dep, i) => (
                                                    <span key={i} className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-500 border border-white/10">
                                                        {dep}
                                                    </span>
                                                )) || <span className="text-gray-600">Geen</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                            <span className="text-xs font-bold text-gray-500 uppercase">Definition of Ready</span>
                                            <span className={`flex items-center text-xs ${pbi.dorCheck ? 'text-neon-green' : 'text-gray-500'}`}>
                                                {pbi.dorCheck ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                                                {pbi.dorCheck ? 'READY' : 'PENDING'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
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

      {/* Cluster Ideas Modal */}
      <ClusterIdeasModal
        isOpen={showClusterModal}
        onClose={() => setShowClusterModal(false)}
        clusters={clusters}
        ideas={ideas}
        isClustering={isClustering}
        onSelectCluster={handleSelectCluster}
      />

      {/* PPT Viewer Modal */}
      <PowerPointViewerModal
        isOpen={showPPTViewer}
        onClose={() => setShowPPTViewer(false)}
        ideaDetails={ideaDetails}
        ideaName={selectedIdea?.name || ''}
      />

      {/* Ideas Overview Modal */}
      <IdeasOverviewModal 
        isOpen={showOverview}
        onClose={() => setShowOverview(false)}
        ideas={ideas}
        question={context}
        onSelectIdea={handleManualSelectIdea}
      />

      {/* Load Session Modal */}
      {showLoadSessionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowLoadSessionModal(false)}>
            <div className="bg-brand-panel border border-white/20 rounded-lg max-w-4xl w-full p-8 shadow-2xl relative animate-in fade-in zoom-in duration-300 flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
                <button 
                    onClick={() => setShowLoadSessionModal(false)}
                    className="absolute top-6 right-6 text-gray-400 hover:text-white"
                >
                    <X size={24} />
                </button>
                
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center flex-shrink-0">
                    <FolderOpen className="mr-3 text-brand-primary" />
                    Laad Eerdere Sessie
                </h2>

                <div className="overflow-y-auto flex-1 pr-2">
                    {savedSessions.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">
                            Geen opgeslagen sessies gevonden.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {savedSessions.map((session) => (
                                <button 
                                    key={session.id} 
                                    onClick={() => handleSelectSession(session)}
                                    className="bg-white/5 border border-white/10 p-4 rounded hover:bg-white/10 transition-colors flex items-center justify-between group text-left w-full"
                                >
                                    <div>
                                        <h4 className="font-bold text-white">{session.name || session.question}</h4>
                                        <p className="text-sm text-gray-400 mt-1 line-clamp-1">{session.question}</p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 font-mono">
                                            <span>{new Date(session.timestamp).toLocaleString('nl-NL')}</span>
                                            <span>{session.ideas.length} Ideeën</span>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-white" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
