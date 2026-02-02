import React from 'react';

export interface FeatureItem {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export interface StepItem {
  number: string;
  title: string;
  description: string;
}

export interface Idea {
  id: string;
  name: string;
  content: string;
  timestamp: number;
}

export interface AIAnalysisResult {
  summary: string;
  topIdeas: Idea[];
  headline: string;
  innovationScore: number;
  keywords: string[];
}

export interface PBI {
  id: string;
  title: string;
  userStory: string;
  acceptanceCriteria: string[];
  priority: string;
  storyPoints: number;
  dependencies: string[];
  businessValue: string;
  dorCheck: boolean;
  description?: string; // Keep for backward compatibility if needed
}

export interface BusinessCase {
  problemStatement: string;
  proposedSolution: string;
  strategicFit: string;
  financialImpact: string;
  risks: string[];
}

export interface DevilsAdvocate {
  critique: string;
  blindSpots: string[];
  preMortem: string; // "Imagine it is 1 year later and the project failed. Why?"
}

export interface Marketing {
  slogan: string;
  linkedInPost: string;
  viralTweet: string;
  targetAudience: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  roleLabel?: string;
  suggestedFollowUp?: string;
}

export interface IdeaDetails {
  rationale: string;
  questions: string[];
  questionAnswers: string[]; // AI simulated answers
  steps: string[];
  pbis: PBI[];
  businessCase: BusinessCase;
  devilsAdvocate: DevilsAdvocate;
  marketing: Marketing;
}