
import { useState, useCallback } from 'react';
import type { Chat, Message, Document, Source, ResearchMode, Project } from '../types';
import { generateDeepResearchResponse, findDocumentsOnline, generateSuggestedQuestions } from '../services/geminiService';
import { saveChat } from '../services/dbService';
import { queryCollection } from '../services/vectorDBService';

const generateRefinedPrompt = (corePrompt: string, siteFilter: string | null, attempt: number): string => {
    let refinedPrompt = corePrompt;

    // The attempt number in the loop will be 1 and 2 for retries.
    switch (attempt) {
        case 1: // First retry
            refinedPrompt = `find documents about "${corePrompt}"`;
            break;
        case 2: // Second retry
            refinedPrompt = `"${corePrompt}" case studies OR reports`;
            break;
    }

    if (siteFilter) {
        return `${refinedPrompt} ${siteFilter}`;
    } 
    // Only add generic domains on the final attempt if no specific site was ever provided.
    else if (attempt === 2) { 
        return `${refinedPrompt} (site:.edu OR site:.gov OR site:.org)`;
    }

    return refinedPrompt;
};


export const useChat = (activeChat: Chat | undefined, allDocuments: Document[], activeProject: Project | undefined) => {
  const [messages, setMessages] = useState<Message[]>(activeChat?.messages || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

  const handleModelResponse = useCallback(async (history: Message[], prompt: string, mode: ResearchMode) => {
    if (!activeChat) return;
    
    setIsLoading(true);
    setError(null);
    setSuggestedQuestions([]);

    try {
      if (mode === 'find_documents') {
        const siteRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|site:([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
        const siteMatch = prompt.match(siteRegex);
        
        let corePrompt = prompt;
        let strictSiteFilter: string | null = null;

        if (siteMatch) {
            const domain = siteMatch[1] || siteMatch[2];
            if(domain) {
                strictSiteFilter = `site:${domain.toLowerCase()}`;
                corePrompt = prompt.replace(siteMatch[0], '').trim();
                if (!corePrompt) {
                    corePrompt = "latest documents or cases";
                }
            }
        }

        const MAX_RETRIES = 3;
        let documentsFound: {title: string, url: string, snippet: string}[] = [];
        let currentPrompt = strictSiteFilter ? `${corePrompt} ${strictSiteFilter}` : corePrompt;
        
        const modelMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'model',
          text: `Searching for documents ${strictSiteFilter ? `on ${strictSiteFilter}`: 'across the web'}...`,
          timestamp: new Date().toISOString(),
          sources: [],
          mode: 'find_documents',
        };
        setMessages(prev => [...prev, modelMessage]);

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            if (attempt > 0) {
                currentPrompt = generateRefinedPrompt(corePrompt, strictSiteFilter, attempt);
                const loadingText = `Attempt ${attempt + 1}/${MAX_RETRIES}: Refining search on ${strictSiteFilter || 'the web'}...`;
                setMessages(prev => prev.map(m => m.id === modelMessage.id ? { ...m, text: loadingText } : m));
            }
            
            const stream = await findDocumentsOnline([{ role: 'user', text: currentPrompt, id: 'temp', timestamp: '' }]);
            let fullResponseJsonString = '';
            for await (const chunk of stream) {
                fullResponseJsonString += chunk.text;
            }
            
            try {
                const jsonMatch = fullResponseJsonString.match(/(\[[\s\S]*\])/);
                if (jsonMatch && jsonMatch[0]) {
                    const parsedResults = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(parsedResults) && parsedResults.length > 0) {
                        documentsFound = parsedResults;
                        break; 
                    }
                }
            } catch (e) {
                console.error(`Attempt ${attempt + 1} failed parsing JSON.`, e, "Response was:", fullResponseJsonString);
            }
        }
        
        let finalResponseText;
        if (documentsFound.length > 0) {
            finalResponseText = documentsFound.map(
                (doc, index) => `${index + 1}. [${doc.title}](${doc.url})\n\n   > ${doc.snippet.replace(/\n/g, ' ')}`
            ).join('\n\n');
        } else {
            finalResponseText = `After several attempts with refined queries, I could not find any specific documents matching your request ${strictSiteFilter ? `on ${strictSiteFilter}` : ''}. Please try a different query.`;
        }

        const disclaimer = "\n\n---\n*You can download these documents using the 'Download' button. If a download fails, it's likely due to web security policies (CORS). In that case, please use the main link to open and save the file manually.*";
        finalResponseText += disclaimer;

        const finalModelMessage = { ...modelMessage, text: finalResponseText };
        
        setMessages(prevMessages => {
            const finalMessages = prevMessages.map(m => m.id === modelMessage.id ? finalModelMessage : m);
            const updatedChat = { ...activeChat, messages: finalMessages };
            saveChat(updatedChat);
            return finalMessages;
        });

      } else { // 'deep_research' mode with RAG
        // 1. Get the IDs of the currently attached documents for filtering.
        const attachedDocIds = allDocuments
          .filter(doc => activeChat.documentIds?.includes(doc.id))
          .map(doc => doc.id);

        // 2. Retrieve context from ChromaDB. If no docs are attached, this searches the whole project.
        const { chunks, metadatas } = await queryCollection(
          activeChat.projectId, 
          prompt, 
          5, 
          attachedDocIds
        );
        
        // 3. Augment the user's prompt with the retrieved context.
        const contextString = chunks.length > 0
          ? chunks.map((chunk, i) => 
              `--- Context from ${metadatas[i]?.documentName} ---\n${chunk}`
            ).join('\n\n')
          : "No relevant context found in the selected documents.";

        const augmentedPrompt = `Based on the following context, please answer the user's question. When you use information from the context, cite the source document name (e.g., [Source: report.pdf]). If the provided context is not sufficient or relevant, use your general knowledge and web search capabilities.\n\n${contextString}\n\nUser Question: ${prompt}`;

        // 4. Modify history with the augmented prompt and call the LLM.
        // We pass an empty array for documents because the context is now embedded in the prompt.
        const historyForRAG = [...history];
        historyForRAG[historyForRAG.length - 1].text = augmentedPrompt;
        const stream = await generateDeepResearchResponse(historyForRAG, [], activeProject?.systemPrompt);

        // --- The rest of the streaming logic is the same as before ---
        let fullResponseText = '';
        let sources: Source[] = [];
        
        const modelMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'model',
          text: '...',
          timestamp: new Date().toISOString(),
          sources: [],
          mode,
        };
        
        setMessages(prev => [...prev, modelMessage]);

        for await (const chunk of stream) {
          fullResponseText += chunk.text;
          
          const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
          if (groundingMetadata?.groundingChunks) {
              const newSources = groundingMetadata.groundingChunks
                  .map((c: any) => c.web)
                  .filter((s: any) => s && s.uri && s.title) as Source[];
              sources = [...sources, ...newSources.filter(ns => !sources.some(s => s.uri === ns.uri))];
          }

          setMessages(prev => prev.map(m => m.id === modelMessage.id ? { ...m, text: fullResponseText, sources } : m));
        }

        const finalModelMessage = { ...modelMessage, text: fullResponseText, sources };
        
        setMessages(prev => {
            const finalMessages = [...prev.filter(m => m.id !== modelMessage.id), finalModelMessage];
             // Use original prompt for title generation
            const updatedChat = { ...activeChat, messages: finalMessages, title: finalMessages.length > 2 ? activeChat.title : prompt.substring(0, 30) };
            saveChat(updatedChat);
            return finalMessages;
        });
        
        try {
            // Use original prompt for question generation
            const questions = await generateSuggestedQuestions(prompt, fullResponseText);
            setSuggestedQuestions(questions);
        } catch (suggestionError) {
            console.error("Failed to generate suggested questions:", suggestionError);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `Error: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [activeChat, allDocuments, activeProject]);

  const sendMessage = useCallback(async (prompt: string, mode: ResearchMode) => {
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: prompt,
      timestamp: new Date().toISOString(),
      mode,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    await handleModelResponse(newMessages, prompt, mode);

  }, [messages, handleModelResponse]);
  
  const regenerateResponse = useCallback(async () => {
    if (isLoading || messages.length < 2) return;

    // FIX: Replaced .findLast() and .findLastIndex() with a reverse loop for broader compatibility.
    let lastUserMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMessageIndex = i;
        break;
      }
    }

    if (lastUserMessageIndex === -1) {
      return; // No user message found to regenerate from.
    }

    const lastUserMessage = messages[lastUserMessageIndex];

    // Find the last model message *after* the last user message
    const lastModelMessage = messages.slice(lastUserMessageIndex + 1).find(m => m.role === 'model');

    if (!lastModelMessage) {
        console.error("Cannot regenerate: Could not find a model response to regenerate.");
        return;
    }

    const prompt = lastUserMessage.text;
    const mode = lastUserMessage.mode || 'deep_research';
    
    // Set history to everything *before* the last model response that we are regenerating
    const historyForRegeneration = messages.slice(0, messages.indexOf(lastModelMessage));
    
    setMessages(historyForRegeneration);
    await handleModelResponse(historyForRegeneration, prompt, mode);
    
  }, [messages, isLoading, handleModelResponse]);

  return { messages, setMessages, sendMessage, isLoading, error, suggestedQuestions, regenerateResponse };
};
