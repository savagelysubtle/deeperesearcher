import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { getChats, getDocuments, saveChat, deleteChat as dbDeleteChat } from './services/dbService';
import type { Chat, Document } from './types';
import { useChat } from './hooks/useChat';

const SIDEBAR_MIN_WIDTH = 280;
const SIDEBAR_MAX_WIDTH_PERCENT = 0.4;
const CONTEXT_WINDOW_LIMIT_TOKENS = 1_000_000; // Based on Gemini 2.5's 1M context window

const App: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  
  // Sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const isResizing = useRef(false);

  // Token state
  const [estimatedTokens, setEstimatedTokens] = useState(0);

  const handleNewChat = useCallback(() => {
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      title: 'New Research',
      messages: [],
      createdAt: new Date().toISOString(),
      documentIds: [],
    };
    const updatedChats = [newChat, ...getChats()];
    setChats(updatedChats);
    setActiveChatId(newChat.id);
    saveChat(newChat);
  },[]);

  useEffect(() => {
    const loadedChats = getChats();
    setChats(loadedChats);
    setDocuments(getDocuments());
    if (loadedChats.length > 0) {
      setActiveChatId(loadedChats[0].id);
    } else {
      handleNewChat();
    }
  }, [handleNewChat]);

  const activeChat = chats.find(c => c.id === activeChatId);

  const {
    messages,
    setMessages,
    sendMessage,
    isLoading,
  } = useChat(activeChat, documents);

  useEffect(() => {
    if (activeChat) {
      setMessages(activeChat.messages);
    } else if(chats.length > 0) {
      setActiveChatId(chats[0].id)
    }
  }, [activeChat, setMessages, chats]);
  
  // Token Estimation Effect
  useEffect(() => {
    if (!activeChat) {
      setEstimatedTokens(0);
      return;
    }
    const attachedDocs = documents.filter(doc => activeChat.documentIds?.includes(doc.id));

    const messageChars = messages.reduce((acc, msg) => acc + msg.text.length, 0);
    // Base64 is approx 4/3 the size of original data. So original data size is 3/4.
    const docChars = attachedDocs.reduce((acc, doc) => acc + (doc.content.length * 0.75), 0);
    
    const totalChars = messageChars + docChars;
    const tokens = Math.round(totalChars / 4);
    setEstimatedTokens(tokens);

  }, [activeChat, messages, documents]);

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
  };

  const handleDocumentsUpdated = () => {
    setDocuments(getDocuments());
  };
  
  const handleAttachDocument = useCallback((docId: string) => {
    if (!activeChat || activeChat.documentIds?.includes(docId)) return;

    const newDocumentIds = [...(activeChat.documentIds || []), docId];
    const updatedChat = { ...activeChat, documentIds: newDocumentIds };
    const updatedChats = chats.map(c => c.id === activeChatId ? updatedChat : c);
    setChats(updatedChats);
    saveChat(updatedChat);
  }, [activeChat, activeChatId, chats]);

  const handleDetachDocument = useCallback((docId: string) => {
    if (!activeChat) return;

    const newDocumentIds = activeChat.documentIds?.filter(id => id !== docId) || [];
    const updatedChat = { ...activeChat, documentIds: newDocumentIds };
    const updatedChats = chats.map(c => c.id === activeChatId ? updatedChat : c);
    setChats(updatedChats);
    saveChat(updatedChat);
  }, [activeChat, activeChatId, chats]);

  const handleRenameChat = (chatId: string, newTitle: string) => {
    const chatToUpdate = chats.find(c => c.id === chatId);
    if (chatToUpdate && newTitle.trim()) {
      const updatedChat = { ...chatToUpdate, title: newTitle.trim() };
      const updatedChats = chats.map(c => c.id === chatId ? updatedChat : c);
      setChats(updatedChats);
      saveChat(updatedChat);
    }
  };

  const handleDeleteChat = (chatId: string) => {
    const updatedChats = chats.filter(c => c.id !== chatId);
    setChats(updatedChats);
    dbDeleteChat(chatId);

    if (activeChatId === chatId) {
      if (updatedChats.length > 0) {
        setActiveChatId(updatedChats[0].id);
      } else {
        handleNewChat();
      }
    }
  };

  // --- Sidebar Resizing Logic ---
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const maxWidth = window.innerWidth * SIDEBAR_MAX_WIDTH_PERCENT;
    let newWidth = window.innerWidth - e.clientX;
    if (newWidth < SIDEBAR_MIN_WIDTH) newWidth = SIDEBAR_MIN_WIDTH;
    if (newWidth > maxWidth) newWidth = maxWidth;
    setSidebarWidth(newWidth);
  }, []);

  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="flex h-screen font-sans overflow-hidden">
      <main className="flex-1 flex flex-col bg-gray-800 min-w-0">
        {isSidebarCollapsed && (
            <button 
                onClick={() => setIsSidebarCollapsed(false)}
                className="absolute top-4 right-2 z-20 p-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors"
                aria-label="Expand sidebar"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm2 2v10h10V5H5z" clipRule="evenodd" />
                    <path d="M12.293 5.293a1 1 0 011.414 1.414L10.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4z" />
                </svg>
            </button>
        )}

        {activeChat ? (
          <ChatWindow
            key={activeChat.id}
            chat={activeChat}
            messages={messages}
            isLoading={isLoading}
            onSendMessage={sendMessage}
            attachedDocuments={documents.filter(doc => activeChat?.documentIds?.includes(doc.id))}
            onAttachDocument={handleAttachDocument}
            onDetachDocument={handleDetachDocument}
            onNewChat={handleNewChat}
            estimatedTokens={estimatedTokens}
            tokenLimit={CONTEXT_WINDOW_LIMIT_TOKENS}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a chat or start a new one to begin your research.
          </div>
        )}
      </main>
      
      {!isSidebarCollapsed && (
        <div 
          onMouseDown={handleMouseDown}
          className="w-1.5 cursor-col-resize bg-gray-700/50 hover:bg-blue-600 transition-colors"
          aria-label="Resize sidebar"
          role="separator"
        />
      )}
      
      <Sidebar
        style={{ width: isSidebarCollapsed ? 0 : sidebarWidth, minWidth: isSidebarCollapsed ? 0 : SIDEBAR_MIN_WIDTH }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        chats={chats}
        documents={documents}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDocumentsUpdated={handleDocumentsUpdated}
        onAttachDocument={handleAttachDocument}
        activeDocumentIds={activeChat?.documentIds || []}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
      />
    </div>
  );
};

export default App;