# Gemini Deep Research

An advanced, AI-powered research assistant designed to streamline your workflow. It leverages the power of the Gemini API to conduct in-depth research, synthesize information from web sources and personal documents, and maintain a complete history of your investigations.

*(Suggestion: Add a screenshot or a GIF of the application in action here to give users a quick visual overview.)*

## ✨ Key Features

*   **Dual Research Modes**:
    *   **Deep Research**: Performs comprehensive web searches to answer complex questions, providing detailed, structured responses with inline citations and a full list of sources.
    *   **Find Documents**: A targeted search tool to locate specific documents (like PDFs, reports, or case studies) online, with an option to filter by a particular website.
*   **Knowledge Base Integration**: Upload your own documents (PDFs, text files, etc.) to create a personal knowledge base.
*   **Chat with Your Docs**: Attach uploaded documents to any chat session. Gemini will use them as a primary source of truth, allowing you to ask questions, summarize content, and synthesize information across multiple files.
*   **Persistent Chat History**: All your research sessions are automatically saved to your browser's local storage. You can revisit, rename, or delete past chats.
*   **Context-Aware**: An intelligent token estimator helps you keep track of your context window size, ensuring you get the most out of Gemini's capabilities without exceeding limits.
*   **Modern & Responsive UI**: A clean, intuitive, and responsive interface built with React and Tailwind CSS, featuring a resizable and collapsible sidebar for a customized workspace.
*   **Source Citing & Download**: Responses from web searches include linked sources. The "Find Documents" mode even provides a handy (best-effort) download button for found files.

## 🧠 How It Works

The application is built around two core functionalities powered by the Gemini API (`gemini-2.5-flash` model):

1.  **Deep Research**: When you ask a question in this mode, the app sends your query, the chat history, and any attached documents to the Gemini model. It uses a detailed system prompt instructing the AI to act as a world-class research analyst, synthesizing information and citing sources meticulously using Google Search grounding.

2.  **Find Documents**: This mode is optimized for discovery. It instructs the model to perform targeted web searches and return its findings as a structured JSON array. The application then parses this data to display a clean, interactive list of documents with titles, links, and snippets. It includes a retry mechanism with refined prompts to improve the chances of finding relevant materials.

All application data, including your chats and uploaded document content (stored as Base64), is saved directly in your browser's `localStorage`.

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

1.  **Start a New Chat**: Click the `+` icon in the sidebar to begin a new research session.
2.  **Upload Documents**: In the "Knowledge Base" section of the sidebar, either click the upload area or drag and drop your files to add them.
3.  **Attach Documents**: To use an uploaded document in your current chat, simply click on it in the sidebar list. It will appear as a "Context" item at the top of the chat window.
4.  **Choose a Mode**:
    *   Select **Deep Research** for general research questions.
    *   Select **Find Documents** to look for specific files. You can use the `site:` input to narrow your search to one website (e.g., `example.com`).
5.  **Ask Your Question**: Type your query in the input box at the bottom and press Enter.
6.  **Review Results**: Read the AI's response. For Deep Research, check the cited sources at the bottom. For Find Documents, use the links to access the resources.
7.  **Manage Chats**: Hover over a chat in the sidebar to reveal a menu icon (⋮) that lets you rename or delete the chat.

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
