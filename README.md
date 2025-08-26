
# Gemini Deep Research

An advanced, AI-powered research assistant designed to streamline your workflow. It leverages the power of the Gemini API to create self-contained research projects, conduct in-depth analysis, synthesize information from web sources and personal documents, and maintain a complete history of your investigations.

## ✨ Key Features

*   **Project-Based Organization**: Structure your work in separate projects. Each project has its own set of chats and a dedicated knowledge base, keeping your research focused and organized.
*   **Multi-Document Synthesis**: Select multiple documents from your knowledge base and have the AI generate a detailed synthesis. It identifies key themes, compares and contrasts arguments, and highlights contradictions.
*   **Dual Research Modes**:
    *   **Deep Research**: Performs comprehensive web searches to answer complex questions, providing detailed, structured responses with inline citations and a full list of sources.
    *   **Find Documents**: A targeted search tool to locate specific documents (like PDFs, reports, or case studies) online, with an option to filter by a particular website.
*   **Proactive AI Suggestions**: After providing a detailed answer, the AI suggests insightful follow-up questions, helping you explore topics more deeply and dynamically.
*   **Knowledge Base Integration**: Upload your own documents (PDFs, text files, etc.) to a project's knowledge base.
*   **Chat with Your Docs**: Attach uploaded documents to any chat session. Gemini will use them as a primary source of truth, allowing you to ask questions, summarize content, and analyze information across multiple files.
*   **Persistent History & Export**: All your projects and chats are automatically saved to your browser's local storage. You can revisit, rename, or delete past work, and export entire chat conversations as Markdown files.
*   **Modern & Responsive UI**: A clean, intuitive, and responsive interface built with React and Tailwind CSS, featuring a resizable and collapsible sidebar for a customized workspace.

## 🧠 How It Works

The application is architected around **Projects**. Each project is a container for your research on a specific topic. Within a project, you can have multiple **Chats** and a **Knowledge Base** of uploaded documents.

Two core functionalities are powered by the Gemini API (`gemini-2.5-flash` model):

1.  **Deep Research**: When you ask a question, the app sends your query, the chat history, and any attached documents to the Gemini model. It uses a detailed system prompt instructing the AI to act as a world-class research analyst, synthesizing information and citing sources meticulously using Google Search grounding.

2.  **Find Documents**: This mode is optimized for discovery. It instructs the model to perform targeted web searches and return its findings as a structured JSON array. The application then parses this data to display a clean, interactive list of documents with titles, links, and snippets. It includes a retry mechanism with refined prompts to improve the chances of finding relevant materials.

All application data, including your projects, chats, and uploaded document content (stored as Base64), is saved directly in your browser's `localStorage`.

## 🛠️ Tech Stack

*   **Frontend**: React, TypeScript
*   **AI**: Google Gemini API (`@google/genai`)
*   **Styling**: Tailwind CSS
*   **Markdown Rendering**: `react-markdown` with `remark-gfm`
*   **State Management**: React Hooks (`useState`, `useEffect`, `useCallback`)
*   **Persistence**: Browser `localStorage`

## 🚀 Getting Started

This application is designed to run in a web environment where the Gemini API key is securely managed.

### Prerequisites

*   A modern web browser (Chrome, Firefox, Safari, Edge).
*   A valid Google Gemini API key.

### Configuration

The application requires the Gemini API key to be available as an environment variable named `API_KEY`. In the provided execution environment, this is handled automatically.

```javascript
// From services/geminiService.ts
if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
```

## 💻 Usage Guide

1.  **Create a Project**: On first launch, a default project is created. You can create more projects using the `+` icon next to the "Projects" heading in the sidebar.
2.  **Select a Project**: Click on a project name to make it active. The chats and knowledge base shown will belong to that project.
3.  **Upload Documents**: In the "Knowledge Base" section, either click the upload area or drag and drop your files to add them to the current project.
4.  **Start a Chat**: Click the main `+` icon in the sidebar header to begin a new research session within the active project.
5.  **Attach Documents**: To use an uploaded document in your current chat, click its name in the knowledge base list. It will appear as a "Context" item at the top of the chat window.
6.  **Synthesize Documents**: To analyze multiple documents at once, check the boxes next to them in the knowledge base and click the "Synthesize Documents" button. This will create a new chat and automatically ask the AI to provide a detailed comparison.
7.  **Choose a Mode & Ask**: Select "Deep Research" or "Find Documents", type your query, and press Enter.
8.  **Export**: Click the export icon in the chat window header to download the conversation as a Markdown file.

## 📂 Project Structure

```
/
├── components/
│   ├── ChatWindow.tsx
│   ├── FileUploader.tsx
│   └── Sidebar.tsx
├── hooks/
│   └── useChat.ts
├── services/
│   ├── dbService.ts      # localStorage logic
│   └── geminiService.ts  # Gemini API calls
├── App.tsx               # Main application component
├── index.html
├── index.tsx             # React entry point
├── metadata.json
├── README.md             # You are here!
└── types.ts              # TypeScript type definitions
```
