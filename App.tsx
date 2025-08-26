
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { 
  getProjects, 
  saveProject, 
  deleteProject as dbDeleteProject, 
  getChats, 
  getDocuments, 
  saveChat, 
  deleteChat as dbDeleteChat 
} from './services/dbService';
import type { Chat, Document, Project, ResearchMode } from './types';
import { useChat } from './hooks/useChat';
import OnboardingTour from './components/OnboardingTour';
import { PersonaModal } from './components/PersonaModal';

const SIDEBAR_MIN_WIDTH = 280;
const SIDEBAR_MAX_WIDTH_PERCENT = 0.4;
const CONTEXT_WINDOW_LIMIT_TOKENS = 1_000_000; // Based on Gemini 2.5's 1M context window

const App: React.FC = () => {
  // Project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [editingProjectPersona, setEditingProjectPersona] = useState<Project | null>(null);
  
  // State for active project's data
  const [chats, setChats] = useState<Chat[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  
  // Sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const isResizing = useRef(false);

  // Token state
  const [estimatedTokens, setEstimatedTokens] = useState(0);

  // Document synthesis state
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  // Onboarding tour state
  const [runTour, setRunTour] = useState(false);


  // --- Project Management ---

  const handleNewProject = useCallback(() => {
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: 'New Project',
      createdAt: new Date().toISOString(),
    };
    const updatedProjects = [newProject, ...getProjects()];
    setProjects(updatedProjects);
    saveProject(newProject);
    setActiveProjectId(newProject.id);
  }, []);
  
  const handleRenameProject = (projectId: string, newName: string) => {
    const projectToUpdate = projects.find(p => p.id === projectId);
    if (projectToUpdate && newName.trim()) {
      const updatedProject = { ...projectToUpdate, name: newName.trim() };
      const updatedProjects = projects.map(p => p.id === projectId ? updatedProject : p);
      setProjects(updatedProjects);
      saveProject(updatedProject);
    }
  };
  
  const handleDeleteProject = (projectId: string) => {
    const updatedProjects = projects.filter(p => p.id !== projectId);
    setProjects(updatedProjects);
    dbDeleteProject(projectId);

    if (activeProjectId === projectId) {
      if (updatedProjects.length > 0) {
        setActiveProjectId(updatedProjects[0].id);
      } else {
        handleNewProject();
      }
    }
  };

  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
  };
  
  const handleNewChat = useCallback(() => {
    if (!activeProjectId) return;

    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      title: 'New Research',
      messages: [],
      createdAt: new Date().toISOString(),
      documentIds: [],
      projectId: activeProjectId,
    };
    const updatedChats = [newChat, ...getChats(activeProjectId)];
    setChats(updatedChats);
    setActiveChatId(newChat.id);
    saveChat(newChat);
  },[activeProjectId]);

  // --- Initialization and Project/Chat Switching ---
  
  useEffect(() => {
    const loadedProjects = getProjects();
    if (loadedProjects.length > 0) {
      setProjects(loadedProjects);
      setActiveProjectId(loadedProjects[0].id);
    } else {
      // Create a default project if none exist
      const defaultProject: Project = {
        id: `proj-${Date.now()}`,
        name: 'My First Project',
        createdAt: new Date().toISOString(),
      };
      setProjects([defaultProject]);
      saveProject(defaultProject);
      setActiveProjectId(defaultProject.id);
    }
    
    // Check if onboarding tour should run
    const onboardingComplete = localStorage.getItem('onboardingComplete');
    if (!onboardingComplete) {
      setTimeout(() => setRunTour(true), 500);
    }
  }, []);

  useEffect(() => {
    if (activeProjectId) {
      const projectChats = getChats(activeProjectId);
      const projectDocs = getDocuments(activeProjectId);
      setChats(projectChats);
      setDocuments(projectDocs);
      setSelectedDocIds([]); // Clear selection on project change

      if (projectChats.length > 0) {
        setActiveChatId(projectChats[0].id);
      } else {
        handleNewChat(); // Creates a new chat if project is empty
      }
    } else {
      setChats([]);
      setDocuments([]);
      setActiveChatId(null);
      setSelectedDocIds([]);
    }
  }, [activeProjectId, handleNewChat]);

  const activeChat = chats.find(c => c.id === activeChatId);
  const activeProject = projects.find(p => p.id === activeProjectId);

  const {
    messages,
    setMessages,
    sendMessage,
    isLoading,
    suggestedQuestions,
    regenerateResponse,
  } = useChat(activeChat, documents, activeProject);
  
  // Effect to programmatically send a prompt to a newly created chat for features like Document Synthesis
  useEffect(() => {
      if (pendingPrompt && activeChat && !isLoading) {
          // Ensure this is a new chat to prevent sending to an existing one by mistake
          if (activeChat.messages.length === 0) {
              sendMessage(pendingPrompt, 'deep_research');
              setPendingPrompt(null);
          }
      }
  }, [pendingPrompt, activeChat, isLoading, sendMessage]);

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
    if (activeProjectId) {
        setDocuments(getDocuments(activeProjectId));
    }
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
  
  // --- Message Editing ---
  const handleUpdateMessage = (messageId: string, newText: string) => {
    if (!activeChat) return;

    const updatedMessages = activeChat.messages.map(msg => 
      msg.id === messageId ? { ...msg, text: newText } : msg
    );
    
    const updatedChat = { ...activeChat, messages: updatedMessages };
    
    // Update the local component state immediately for responsiveness
    setMessages(updatedMessages);
    
    // Update the state for the entire chats array
    const updatedChats = chats.map(c => c.id === activeChatId ? updatedChat : c);
    setChats(updatedChats);
    
    // Persist the changes
    saveChat(updatedChat);
  };

    // --- Message Sending with Token Check ---
    const handleSendMessage = (prompt: string, mode: ResearchMode) => {
        const tokenUsagePercentage = (estimatedTokens / CONTEXT_WINDOW_LIMIT_TOKENS) * 100;
        
        if (tokenUsagePercentage >= 90) {
            const continueAnyway = window.confirm(
                "Warning: You are using over 90% of the available context window.\n\n" +
                "Sending more messages may result in incomplete or truncated responses.\n\n" +
                "It is highly recommended to start a new chat.\n\n" +
                "Do you want to send this message anyway?"
            );
            
            if (!continueAnyway) {
                return; // User chose not to send the message
            }
        }
        
        sendMessage(prompt, mode);
    };

  // --- Document Synthesis Handlers ---
  const handleToggleDocumentSelection = (docId: string) => {
      setSelectedDocIds(prevSelected =>
          prevSelected.includes(docId)
              ? prevSelected.filter(id => id !== docId)
              : [...prevSelected, docId]
      );
  };

  const handleDocumentSynthesis = () => {
      if (!activeProjectId || selectedDocIds.length < 2) return;

      const newChatTitle = `Synthesis of ${selectedDocIds.length} documents`;

      const newChat: Chat = {
        id: `chat-${Date.now()}`,
        title: newChatTitle,
        messages: [],
        createdAt: new Date().toISOString(),
        documentIds: [...selectedDocIds], // Create a copy of the array
        projectId: activeProjectId,
      };

      const updatedChats = [newChat, ...chats];
      setChats(updatedChats);
      saveChat(newChat);
      setActiveChatId(newChat.id);

      const synthesisPrompt = "Based on the attached documents, please provide a detailed synthesis. Identify the key themes, compare and contrast any arguments or data, and highlight any contradictions.";
      setPendingPrompt(synthesisPrompt);

      // Clear selection after starting synthesis
      setSelectedDocIds([]);
  };
  
  // --- Persona Handlers ---
  const handleOpenPersonaEditor = (projectId: string) => {
      const projectToEdit = projects.find(p => p.id === projectId);
      if (projectToEdit) {
          setEditingProjectPersona(projectToEdit);
      }
  };

  const handleSavePersona = (newSystemPrompt: string) => {
      if (!editingProjectPersona) return;

      const updatedProject = { ...editingProjectPersona, systemPrompt: newSystemPrompt };
      const updatedProjects = projects.map(p => 
          p.id === editingProjectPersona.id ? updatedProject : p
      );
      
      setProjects(updatedProjects);
      saveProject(updatedProject);
      setEditingProjectPersona(null); // Close modal
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

  // --- Onboarding Tour Handlers ---
  const handleTourComplete = () => {
    localStorage.setItem('onboardingComplete', 'true');
    setRunTour(false);
  };

  const handleRerunTour = () => {
    localStorage.removeItem('onboardingComplete');
    // Reset to false first to ensure Joyride remounts if it's in a weird state
    setRunTour(false); 
    setTimeout(() => setRunTour(true), 100);
  };


  return (
    <div className="flex h-screen font-sans overflow-hidden">
      <OnboardingTour run={runTour} onTourComplete={handleTourComplete} />
      <PersonaModal
          isOpen={!!editingProjectPersona}
          project={editingProjectPersona}
          onClose={() => setEditingProjectPersona(null)}
          onSave={handleSavePersona}
      />
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
            onSendMessage={handleSendMessage}
            attachedDocuments={documents.filter(doc => activeChat?.documentIds?.includes(doc.id))}
            onAttachDocument={handleAttachDocument}
            onDetachDocument={handleDetachDocument}
            onNewChat={handleNewChat}
            estimatedTokens={estimatedTokens}
            tokenLimit={CONTEXT_WINDOW_LIMIT_TOKENS}
            suggestedQuestions={suggestedQuestions}
            onRegenerateResponse={regenerateResponse}
            onUpdateMessage={handleUpdateMessage}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a project and a chat to begin your research.
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
        projects={projects}
        activeProjectId={activeProjectId}
        onNewProject={handleNewProject}
        onSelectProject={handleSelectProject}
        onRenameProject={handleRenameProject}
        onDeleteProject={handleDeleteProject}
        onOpenPersonaEditor={handleOpenPersonaEditor}
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
        selectedDocIds={selectedDocIds}
        onToggleDocumentSelection={handleToggleDocumentSelection}
        onDocumentSynthesis={handleDocumentSynthesis}
        onRerunTour={handleRerunTour}
      />
    </div>
  );
};

export default App;
