
import React, { useState, useRef, useEffect } from 'react';
import type { Chat, Message, Source, Document, ResearchMode } from '../types';
import ReactMarkdown, { type Options as ReactMarkdownOptions } from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Helper Icon Components defined within the main component file to reduce file count

const ExportIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const ThumbsUpIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333V17a1 1 0 001 1h6.364a1 1 0 00.942-.671l1.659-6.223A1.5 1.5 0 0014.5 9H11V5.5a2.5 2.5 0 00-5 0v5.333z" />
    </svg>
);

const ThumbsDownIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667V3a1 1 0 00-1-1H6.636a1 1 0 00-.942.671L4.035 8.9a1.5 1.5 0 001.465 2.1H9v4.5a2.5 2.5 0 005 0V9.667z" />
    </svg>
);

const RegenerateIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
    </svg>
);

const EditIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
);

const LightbulbIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
      <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.657a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM9 12a1 1 0 012 0v5a1 1 0 11-2 0v-5zM4.343 5.657a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM1 11a1 1 0 100 2h1a1 1 0 100-2H1zM15 11a1 1 0 100 2h1a1 1 0 100-2h-1zM7.05 16.95a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707zM12.95 16.95a1 1 0 001.414 1.414l.707.707a1 1 0 00-1.414-1.414l-.707.707z" />
    </svg>
);


const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const UserIcon: React.FC = () => (
  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white flex-shrink-0">
    U
  </div>
);

const BotIcon: React.FC = () => (
  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM5 10a1 1 0 112 0 1 1 0 01-2 0zm7 0a1 1 0 112 0 1 1 0 01-2 0zm-7 3a1 1 0 000 2h10a1 1 0 100-2H5z" clipRule="evenodd" />
    </svg>
  </div>
);

const SearchIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
    </svg>
);

const DocIconMini: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 1a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6a1 1 0 00-1-1H6z" clipRule="evenodd" />
    </svg>
);


// Helper UI Components

const SpinnerIcon: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const SpinnerIconMini: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const DownloadButton: React.FC<{ uri: string; title: string }> = ({ uri, title }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const safeTitle = title.replace(/[^a-z0-9._-]/gi, '_').substring(0, 50) || 'document';
    let extension = '';
    try {
        const url = new URL(uri);
        const pathname = url.pathname;
        const lastSegment = pathname.substring(pathname.lastIndexOf('/') + 1);
        if (lastSegment && lastSegment.includes('.')) {
            extension = lastSegment.substring(lastSegment.lastIndexOf('.'));
        }
    } catch (e) {
        console.warn('Could not parse URL to determine file extension:', uri);
    }
    // Add a default extension if one can't be found, as some links may not have one.
    const filename = `${safeTitle}${extension || '.pdf'}`;

    const handleDownload = async (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        setIsDownloading(true);
        setDownloadError(null);

        try {
            // NOTE: This will be blocked by CORS for many sites if they don't have a permissive policy.
            // This is a browser security feature, and there is no client-side way to bypass it.
            const response = await fetch(uri);
            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            console.error("Download failed:", error);
            const errorMessage = "Download failed due to web security (CORS). Please use the main link to open and save the file manually.";
            setDownloadError(errorMessage);
            // Hide the error message after 5 seconds for better UX
            setTimeout(() => setDownloadError(null), 5000);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="relative">
             <a
                href={uri}
                onClick={handleDownload}
                className="p-1.5 rounded-md bg-gray-600/70 hover:bg-gray-500 transition-colors flex items-center justify-center"
                aria-label={`Download ${title}`}
                title={isDownloading ? "Downloading..." : `Download ${title}`}
                // Prevent clicking when a download is in progress or an error is shown
                style={{ pointerEvents: isDownloading || downloadError ? 'none' : 'auto' }}
            >
                {isDownloading ? <SpinnerIconMini /> : <DownloadIcon />}
            </a>
            {downloadError && (
                <div className="absolute bottom-full mb-2 w-60 p-2 bg-red-800 text-white text-xs rounded-md shadow-lg z-10 left-1/2 -translate-x-1/2 transition-opacity duration-300">
                   {downloadError}
                </div>
            )}
        </div>
    );
};


const SourceList: React.FC<{ sources: Source[] }> = ({ sources }) => {
    if (!sources || sources.length === 0) return null;
    
    const getDomain = (uri: string) => {
        try {
            return new URL(uri).hostname;
        } catch (e) {
            return '';
        }
    };

    return (
        <div className="mt-4 border-t border-gray-700 pt-3">
            <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center">
                <SearchIcon />
                Sources
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {sources.map((source, index) => (
                    <a 
                        key={index} 
                        href={source.uri} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="bg-gray-800 hover:bg-gray-700/80 p-2 rounded-lg transition-colors group text-left block"
                    >
                        <p className="text-sm font-medium text-blue-400 truncate group-hover:underline">
                           {source.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                           {getDomain(source.uri)}
                        </p>
                    </a>
                ))}
            </div>
        </div>
    );
};

const markdownComponents: ReactMarkdownOptions['components'] = {
    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
    h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-3 mt-4 first:mt-0" {...props} />,
    h2: ({node, ...props}) => <h2 className="text-xl font-bold mb-2 mt-3 first:mt-0" {...props} />,
    h3: ({node, ...props}) => <h3 className="text-lg font-bold mb-2 mt-2 first:mt-0" {...props} />,
    ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 my-2 pl-2" {...props} />,
    ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-1 my-2 pl-2" {...props} />,
    code: (props: any) => {
        const { node, inline, className, children, ...rest } = props;
        return !inline ? (
          <pre className="bg-gray-800/50 p-3 my-2 rounded-md overflow-x-auto text-sm">
            <code className={`${className || ''} text-white`} {...rest}>
              {children}
            </code>
          </pre>
        ) : (
          <code
            className="bg-gray-800/50 text-yellow-300 font-mono text-sm px-1.5 py-0.5 rounded"
            {...rest}
          >
            {children}
          </code>
        );
    },
    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-500 pl-4 italic text-gray-400 my-2" {...props} />,
    a: ({node, ...props}) => <a className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
    table: ({node, ...props}) => <div className="overflow-x-auto my-2"><table className="table-auto w-full border-collapse border border-gray-600" {...props} /></div>,
    thead: ({node, ...props}) => <thead className="bg-gray-800" {...props} />,
    th: ({node, ...props}) => <th className="border border-gray-600 px-2 py-1 text-left font-semibold" {...props} />,
    td: ({node, ...props}) => <td className="border border-gray-600 px-2 py-1" {...props} />,
};


const MessageItem: React.FC<{ 
    message: Message;
    onFeedback: (feedback: 'up' | 'down') => void;
    isLastMessage: boolean;
    isLoading: boolean;
    onRegenerate: () => void;
    onUpdateMessage: (messageId: string, newText: string) => void;
}> = ({ message, onFeedback, isLastMessage, isLoading, onRegenerate, onUpdateMessage }) => {
    const isUser = message.role === 'user';
    const isFindDocumentsResponse = message.role === 'model' && message.mode === 'find_documents';
    
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(message.text);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [isEditing, editedText]);

    const handleSave = () => {
        onUpdateMessage(message.id, editedText);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditedText(message.text);
    };


    const componentsWithDownload: ReactMarkdownOptions['components'] = {
        ...markdownComponents,
        a: ({ node, ...props }) => {
            const href = props.href || '';
            const children = props.children || '';
            if (isFindDocumentsResponse && href.startsWith('http')) {
                return (
                    <span className="inline-flex items-center gap-2">
                        <a className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
                        <DownloadButton uri={href} title={String(children)} />
                    </span>
                );
            }
            return <a className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />;
        },
    };

    return (
        <div className={`flex items-start gap-4 ${isUser ? 'justify-end' : ''}`}>
             {!isUser && <BotIcon />}
            <div className={`max-w-2xl w-full p-4 rounded-xl ${isUser ? 'bg-blue-600' : 'bg-gray-700'}`}>
                {isUser ? (
                    <p className="whitespace-pre-wrap">{message.text}</p>
                ) : (
                    <>
                        {isEditing ? (
                            <div>
                                <textarea
                                    ref={textareaRef}
                                    value={editedText}
                                    onChange={(e) => setEditedText(e.target.value)}
                                    className="w-full bg-gray-800 rounded-md p-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    rows={1}
                                />
                                <div className="mt-2 flex items-center gap-2">
                                    <button onClick={handleSave} className="px-3 py-1 bg-blue-600 text-white font-semibold rounded-md text-sm hover:bg-blue-500">
                                        Save
                                    </button>
                                    <button onClick={handleCancel} className="px-3 py-1 bg-gray-600 text-white font-semibold rounded-md text-sm hover:bg-gray-500">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={isFindDocumentsResponse ? componentsWithDownload : markdownComponents}>
                                {message.text}
                            </ReactMarkdown>
                        )}
                        <SourceList sources={message.sources || []} />
                        <div className="mt-3 pt-2 border-t border-gray-600/50 flex items-center gap-2">
                            <button onClick={() => onFeedback('up')} className="p-1 rounded-md text-gray-400 hover:bg-gray-600 hover:text-white transition-colors" aria-label="Good response">
                                <ThumbsUpIcon />
                            </button>
                             <button onClick={() => onFeedback('down')} className="p-1 rounded-md text-gray-400 hover:bg-gray-600 hover:text-white transition-colors" aria-label="Bad response">
                                <ThumbsDownIcon />
                            </button>
                            <button onClick={() => setIsEditing(true)} className="p-1 rounded-md text-gray-400 hover:bg-gray-600 hover:text-white transition-colors" aria-label="Edit response">
                                <EditIcon />
                            </button>
                             {isLastMessage && !isLoading && (
                                <button onClick={onRegenerate} className="p-1 rounded-md text-gray-400 hover:bg-gray-600 hover:text-white transition-colors" aria-label="Regenerate response">
                                    <RegenerateIcon />
                                </button>
                             )}
                        </div>
                    </>
                )}
            </div>
            {isUser && <UserIcon />}
        </div>
    );
};


// Main Component

interface ChatWindowProps {
  chat: Chat;
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (prompt: string, mode: ResearchMode) => void;
  attachedDocuments: Document[];
  onAttachDocument: (docId: string) => void;
  onDetachDocument: (docId: string) => void;
  onNewChat: () => void;
  estimatedTokens: number;
  tokenLimit: number;
  suggestedQuestions: string[];
  onRegenerateResponse: () => void;
  onUpdateMessage: (messageId: string, newText: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chat, messages, isLoading, onSendMessage, attachedDocuments, onAttachDocument, onDetachDocument, onNewChat, estimatedTokens, tokenLimit, suggestedQuestions, onRegenerateResponse, onUpdateMessage }) => {
  const [input, setInput] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [researchMode, setResearchMode] = useState<ResearchMode>('deep_research');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      let finalPrompt = input.trim();
      if (researchMode === 'find_documents' && siteFilter.trim()) {
        finalPrompt += ` site:${siteFilter.trim()}`;
      }
      onSendMessage(finalPrompt, researchMode);
      setInput('');
    }
  };
  
    const handleSendSuggestion = (question: string) => {
        if (!isLoading) {
            onSendMessage(question, 'deep_research');
        }
    };
  
  const handleExportChat = () => {
    if (!chat) return;

    const markdownContent = messages.map(msg => {
        const timestamp = new Date(msg.timestamp).toLocaleString();
        let content = `## ${msg.role === 'user' ? 'User' : 'Model'} _at ${timestamp}_\n\n`;
        
        // For user messages, use blockquote for better readability
        if (msg.role === 'user') {
            content += msg.text.split('\n').map(line => `> ${line}`).join('\n') + '\n\n';
        } else {
            content += `${msg.text}\n\n`;
        }
        
        if (msg.role === 'model' && msg.sources && msg.sources.length > 0) {
            content += `### Sources\n\n`;
            content += msg.sources.map(s => `- [${s.title}](${s.uri})`).join('\n');
            content += '\n\n';
        }
        return content;
    }).join('---\n\n');

    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeTitle = chat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.href = url;
    a.download = `${safeTitle || 'chat-export'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('application/x-document-id')) {
        setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const docId = e.dataTransfer.getData('application/x-document-id');
    if (docId) {
      onAttachDocument(docId);
    }
  };
  
  const tokenUsagePercentage = (estimatedTokens / tokenLimit) * 100;
  const isNearTokenLimit = tokenUsagePercentage >= 85;

  return (
    <div
      className="flex-1 flex flex-col h-full relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingOver && (
        <div className="absolute inset-0 bg-blue-500/20 border-4 border-dashed border-blue-400 rounded-lg flex items-center justify-center pointer-events-none z-10">
          <p className="text-xl font-bold text-white">Attach document to this chat</p>
        </div>
      )}
      <header className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">{chat.title}</h2>
             <button
                onClick={handleExportChat}
                className="p-2 rounded-md text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                aria-label="Export chat as markdown"
                title="Export chat as markdown"
             >
                <ExportIcon />
            </button>
        </div>
         {attachedDocuments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-400 font-medium self-center">Context:</span>
            {attachedDocuments.map(doc => (
              <div key={doc.id} className="flex items-center gap-1.5 bg-gray-600 rounded-full px-2.5 py-1 text-xs text-gray-200">
                <DocIconMini />
                <span className="font-medium">{doc.name}</span>
                <button
                  onClick={() => onDetachDocument(doc.id)}
                  className="ml-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-700 focus:ring-white rounded-full"
                  aria-label={`Remove ${doc.name} from context`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </header>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, index) => {
          const isLast = index === messages.length - 1;
          return (
            <MessageItem 
              key={msg.id} 
              message={msg} 
              onFeedback={(feedback) => console.log(`Feedback received: '${feedback}' for message ID ${msg.id}`)}
              isLastMessage={isLast}
              isLoading={isLoading}
              onRegenerate={onRegenerateResponse}
              onUpdateMessage={onUpdateMessage}
            />
          )
        })}
        {isLoading && (
            <div className="flex items-start gap-4">
                <BotIcon />
                <div className="max-w-2xl p-4 rounded-xl bg-gray-700 flex items-center gap-2">
                   <SpinnerIcon />
                   <span className="text-gray-300">{researchMode === 'deep_research' ? 'Researching...' : 'Finding documents...'}</span>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
       {suggestedQuestions.length > 0 && !isLoading && (
            <div className="px-6 pb-2">
                <div className="flex items-center gap-2 mb-2">
                    <LightbulbIcon />
                    <h4 className="text-sm font-semibold text-gray-300">Suggested Follow-ups</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.map((q, i) => (
                        <button
                            key={i}
                            onClick={() => handleSendSuggestion(q)}
                            className="text-left px-3 py-1.5 bg-gray-700/80 text-gray-200 text-sm rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            {q}
                        </button>
                    ))}
                </div>
            </div>
        )}
      <div className="p-4 bg-gray-900/50 border-t border-gray-700">
        {researchMode === 'find_documents' && (
            <div className="relative mb-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400 text-sm">site:</span>
                </div>
                <input
                    type="text"
                    value={siteFilter}
                    onChange={(e) => setSiteFilter(e.target.value)}
                    placeholder="example.com (filter by website)"
                    className="w-full bg-gray-700 rounded-lg p-2 pl-12 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                    aria-label="Filter documents by site"
                />
            </div>
        )}
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={
                researchMode === 'deep_research'
                ? 'Start your research...'
                : 'Enter a topic to find relevant documents...'
            }
            rows={1}
            className="w-full bg-gray-700 rounded-lg p-4 pr-20 resize-none text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-blue-600 rounded-full text-white hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? <SpinnerIcon /> : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.428A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
          </button>
        </form>
        <div className="mt-2 flex justify-between items-center">
            <div className="text-xs text-gray-400 flex-1 pr-4">
                <div className="flex justify-between items-center">
                    <span>Tokens: {estimatedTokens.toLocaleString()} / {tokenLimit.toLocaleString()}</span>
                    {isNearTokenLimit && <span className="font-semibold text-yellow-400">Context full.</span>}
                </div>
                <div className="w-full bg-gray-600 rounded-full h-1.5 mt-1" title={`${tokenUsagePercentage.toFixed(1)}% used`}>
                    <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                            tokenUsagePercentage > 95 ? 'bg-red-500' : 
                            tokenUsagePercentage > 85 ? 'bg-yellow-500' : 
                            'bg-blue-600'
                        }`}
                        style={{ width: `${tokenUsagePercentage}%` }}
                    ></div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                 {isNearTokenLimit && (
                    <button 
                        onClick={onNewChat}
                        className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-md hover:bg-yellow-500/30 transition-colors font-semibold text-xs"
                    >
                        Start New Chat
                    </button>
                )}
                <div id="research-mode-toggle" className="bg-gray-700 rounded-lg p-1 flex space-x-1">
                    <button
                        onClick={() => setResearchMode('deep_research')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                        researchMode === 'deep_research' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                        Deep Research
                    </button>
                    <button
                        onClick={() => setResearchMode('find_documents')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                        researchMode === 'find_documents' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                        Find Documents
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};