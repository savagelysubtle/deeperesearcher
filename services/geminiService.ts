
import { GoogleGenAI, Type } from "@google/genai";
import type { Message, Document } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = "gemini-2.5-flash";

const fileToGenerativePart = (doc: Document) => {
  return {
    inlineData: {
      mimeType: doc.mimeType,
      data: doc.content,
    },
  };
};

export const generateDeepResearchResponse = async (
    history: Message[],
    documents: Document[]
) => {
    
    const systemInstruction = `You are a world-class research analyst. Your goal is to provide comprehensive, well-structured, and meticulously sourced answers.

**Your Protocol:**
1.  **Analyze & Clarify:** First, understand the user's core question. If the query is ambiguous, conversational, or too broad, ask clarifying questions to help the user formulate a specific research topic. If the query is a simple greeting or off-topic, provide a brief, friendly response and gently guide them back to research.
2.  **Source Analysis:**
    *   **Documents:** If documents are provided, treat them as the primary source of truth. Systematically extract all relevant information.
    *   **Web Research:** Use Google Search to find up-to-date, corroborating, or supplementary information. Prioritize reputable sources.
3.  **Synthesize & Structure:** Combine information from all sources into a single, insightful, and easy-to-read response. Use headings, subheadings, and bullet points. If sources conflict, prioritize the provided documents but explicitly note the discrepancy.
4.  **Cite Meticulously:** You MUST cite every claim from a web source using inline numerical citations (e.g., \`[1]\`, \`[2]\`).
5.  **Provide References:** At the very end of your response, include a "References" section listing all web sources, corresponding to your inline citations.

**Crucial:** If after your research you cannot find a satisfactory answer, you MUST explicitly state that and explain what you did find or why the information is unavailable. Do not leave the response blank.`;
    
    // Map app's message format to Gemini's Content[] format
    const conversationHistory: {
        role: string;
        parts: ({ text: string; } | { inlineData: { mimeType: string; data: string; }; })[];
    }[] = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));

    // Attach documents to the last message (which is the current user prompt)
    if (documents.length > 0) {
        const lastMessageIndex = conversationHistory.length - 1;
        if (lastMessageIndex >= 0 && conversationHistory[lastMessageIndex].role === 'user') {
            const docParts = documents.map(fileToGenerativePart);
            // Prepend documents to the parts of the last message
            conversationHistory[lastMessageIndex].parts = [...docParts, ...conversationHistory[lastMessageIndex].parts];
        }
    }

    const stream = await ai.models.generateContentStream({
        model: model,
        contents: conversationHistory,
        config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
        }
    });

    return stream;
};

export const findDocumentsOnline = async (history: Message[]) => {
    const systemInstruction = `You are an expert AI research assistant specializing in finding specific, verifiable online documents. Your sole purpose is to return a JSON array of found resources.

**CRITICAL DIRECTIVES:**
1.  **Honor Site Restrictions:** If the user's query contains a \`site:\` operator (e.g., \`site:wcat.bc.ca\`), you **MUST** restrict all searches exclusively to that domain. This is a non-negotiable rule. Returning results from other websites in this case is a failure.
2.  **JSON Array Only:** Your entire response **MUST** be a valid JSON array of objects. Each object must have the keys: "title", "url", and "snippet". Do **NOT** include any explanatory text, markdown, or any characters before or after the JSON array.
3.  **Empty Array on Failure:** If your search yields no relevant results after a thorough attempt (especially when restricted to a specific site), you **MUST** return an empty JSON array: \`[]\`. Do not write an explanation.
4.  **Verify URLs:** You must ensure the URLs you provide are valid and lead directly to the resource. Do not generate placeholder or non-existent links.

**Process:**
1.  Analyze the user's request to identify the core topic and desired document types.
2.  Perform targeted Google Searches using advanced search operators (\`filetype:\`, \`site:\`, quoted phrases).
3.  Prioritize results from academic journals, government organizations, and official publications relevant to the query.
4.  Select the most relevant results and format them according to the JSON directive above.`;

    const conversationHistory = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));

    const stream = await ai.models.generateContentStream({
        model: model,
        contents: conversationHistory,
        config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
        }
    });

    return stream;
};
