
import { useState, useCallback } from 'react';
import type { Chat, Message, Document, Source, ResearchMode } from '../types';
import { generateDeepResearchResponse, findDocumentsOnline } from '../services/geminiService';
import { saveChat } from '../services/dbService';

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


export const useChat = (activeChat: Chat | undefined, allDocuments: Document[]) => {
  const [messages, setMessages] = useState<Message[]>(activeChat?.messages || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (prompt: string, mode: ResearchMode) => {
    if (!activeChat) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: prompt,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);
    setError(null);

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
                // If the core prompt is now empty (e.g. user only entered a URL), use a generic term.
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

            const tempHistory: Message[] = [...newMessages.slice(0, -1), { ...userMessage, text: currentPrompt }];
            
            const stream = await findDocumentsOnline(tempHistory);
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
                        break; // Success! Exit the loop.
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

      } else { // 'deep_research' mode
        const attachedDocuments = allDocuments.filter(doc => activeChat.documentIds?.includes(doc.id));
        const stream = await generateDeepResearchResponse(newMessages, attachedDocuments);

        let fullResponseText = '';
        let sources: Source[] = [];
        
        const modelMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'model',
          text: '...',
          timestamp: new Date().toISOString(),
          sources: [],
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
        const finalMessages = [...newMessages, finalModelMessage];
        setMessages(finalMessages);

        const updatedChat = { ...activeChat, messages: finalMessages, title: finalMessages.length > 2 ? activeChat.title : prompt.substring(0, 30) };
        saveChat(updatedChat);
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
  }, [activeChat, messages, allDocuments]);
  
  return { messages, setMessages, sendMessage, isLoading, error };
};