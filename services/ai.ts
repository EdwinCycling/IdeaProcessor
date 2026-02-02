
import { GoogleGenAI } from '@google/genai';
import { functions } from './firebase';
import { httpsCallable } from 'firebase/functions';
import { Idea, AIAnalysisResult, IdeaDetails } from '../types';

// Helper to sanitize input to prevent basic injection attempts or control characters
const sanitizeInput = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/"/g, '\\"')   // Escape quotes
    .replace(/[\x00-\x1F\x7F-\x9F]/g, "") // Remove control characters
    .trim();
};

export const analyzeIdeas = async (context: string, ideas: Idea[]): Promise<AIAnalysisResult> => {
  // Use Backend API (Proxied to localhost:9998 or Netlify Function)
  try {
      const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ context, ideas })
      });

      if (!response.ok) {
          const errorData = await response.text();
          console.error("Server Error Details:", errorData);
          throw new Error(`Server responded with ${response.status}: ${errorData}`);
      }

      const result = await response.json();
      return result as AIAnalysisResult;

  } catch (error) {
      console.error("Backend AI Analysis failed:", error);
      // Fallthrough to mock if fails
  }

  // Fallback / Mock
  console.warn("Using Mock Data (Backend Failed)");
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        summary: "De ingediende ideeën focussen sterk op duurzaamheid door digitalisering en hergebruik. Er is een duidelijke wens om processen slimmer te maken met technologie (AI, AR) en verspilling tegen te gaan.",
        topIdeas: ideas.slice(0, 3), 
        headline: "Exact Medewerkers Pleiten Voor High-Tech Duurzaamheid",
        innovationScore: 87,
        keywords: ["Circulariteit", "AI Automatisering", "Augmented Reality", "Kostenbesparing"]
      });
    }, 2000);
  });
};

export const chatWithIdeaProfessor = async (
  history: { role: string; content: string }[],
  currentRole: 'PRODUCT_MANAGER' | 'INVESTOR' | 'SALES',
  context: string,
  idea: Idea,
  analysis: IdeaDetails
): Promise<string> => {
  // if (!import.meta.env.VITE_GEMINI_API_KEY) {
  //   return new Promise((resolve) => {
  //     setTimeout(() => {
  //       resolve(`[MOCK ${currentRole}] Dit is een gesimuleerd antwoord. Ik vind dit een interessant idee: "${idea.name}". Laten we het hebben over de details.`);
  //     }, 1000);
  //   });
  // }

  try {
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ history, currentRole, context, idea, analysis })
    });

    if (!response.ok) {
         const errorData = await response.text();
         console.error("Chat Server Error Details:", errorData);
         throw new Error(`Server responded with ${response.status}: ${errorData}`);
    }

    const result = await response.json();
    return result.text || "";

  } catch (error) {
    console.error("Chat generation failed", error);
    return "Er is een fout opgetreden in de verbinding met de Professor. Probeer het later opnieuw.";
  }
};


export const generateIdeaDetails = async (context: string, idea: Idea): Promise<IdeaDetails> => {
  // Use Backend API (Proxied to localhost:9998 or Netlify Function)
  try {
     const response = await fetch('/api/generate-details', {
         method: 'POST',
         headers: {
             'Content-Type': 'application/json'
         },
         body: JSON.stringify({ context, idea })
     });

     if (!response.ok) {
         const errorData = await response.text();
         console.error("Detail Generation Server Error Details:", errorData);
         throw new Error(`Server responded with ${response.status}: ${errorData}`);
     }

     const result = await response.json();
     return result as IdeaDetails;
  } catch (error) {
      console.error("Detail generation failed (Local API)", error);
      // Fallback to basic structure if fetch fails
      return {
          rationale: "Kon geen analyse genereren (Server Error).",
          questions: ["Fout bij ophalen vragen"],
          questionAnswers: ["Fout bij ophalen antwoorden"],
          steps: ["Probeer het later opnieuw"],
          pbis: [],
          businessCase: { problemStatement: "N/A", proposedSolution: "N/A", strategicFit: "N/A", financialImpact: "N/A", risks: [] },
          devilsAdvocate: { critique: "N/A", blindSpots: [], preMortem: "N/A" },
          marketing: { slogan: "N/A", linkedInPost: "N/A", viralTweet: "N/A", targetAudience: "N/A" }
      };
  }
};


