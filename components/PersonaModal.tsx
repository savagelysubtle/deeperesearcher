
import React, { useState, useEffect } from 'react';
import type { Project } from '../types';

interface PersonaModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newSystemPrompt: string) => void;
}

const DEFAULT_PERSONA = `You are a world-class research analyst. Your goal is to provide comprehensive, well-structured, and meticulously sourced answers.

**Your Protocol:**
1.  **Analyze & Clarify:** First, understand the user's core question. If the query is ambiguous, conversational, or too broad, ask clarifying questions to help the user formulate a specific research topic. If the query is a simple greeting or off-topic, provide a brief, friendly response and gently guide them back to research.
2.  **Source Analysis:**
    *   **Documents:** If documents are provided, treat them as the primary source of truth. Systematically extract all relevant information.
    *   **Web Research:** Use Google Search to find up-to-date, corroborating, or supplementary information. Prioritize reputable sources.
3.  **Synthesize & Structure:** Combine information from all sources into a single, insightful, and easy-to-read response. Use headings, subheadings, and bullet points. If sources conflict, prioritize the provided documents but explicitly note the discrepancy.
4.  **Cite Meticulously:** You MUST cite every claim from a web source using inline numerical citations (e.g., \`[1]\`, \`[2]\`).
5.  **Provide References:** At the very end of your response, include a "References" section listing all web sources, corresponding to your inline citations.

**Crucial:** If after your research you cannot find a satisfactory answer, you MUST explicitly state that and explain what you did find or why the information is unavailable. Do not leave the response blank.`;

export const PersonaModal: React.FC<PersonaModalProps> = ({ project, isOpen, onClose, onSave }) => {
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    if (project) {
      setPrompt(project.systemPrompt || DEFAULT_PERSONA);
    }
  }, [project]);

  if (!isOpen || !project) return null;

  const handleSave = () => {
    onSave(prompt);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6 relative flex flex-col"
        style={{ height: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h2 className="text-xl font-bold mb-2 text-white pr-8">
          Set AI Persona for <span className="text-blue-400">{project.name}</span>
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          This system prompt guides the AI's behavior for all chats within this project.
        </p>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="flex-1 w-full bg-gray-900 rounded-md p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
          placeholder="Enter the AI's system prompt here..."
        />

        <div className="flex justify-end gap-3 mt-4">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-md transition-colors hover:bg-gray-500"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md transition-colors hover:bg-blue-500"
          >
            Save Persona
          </button>
        </div>
      </div>
    </div>
  );
};
