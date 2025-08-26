
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { 
  getProjects, 
  saveProject, 
  deleteProject as dbDeleteProject, 
  getChats, 
  getDocuments, 
  saveChat, 
  deleteChat as dbDeleteChat,
  getAllChats as dbGetAllChats
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
  const [chatSortOrder, setChatSortOrder] = useState<'lastActivityAt' | 'createdAt'>('lastActivityAt');
  
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
  
  const handleDeleteProject = async (projectId: string) => {
    // First, perform the delete operation on the persistent storage. This is now async.
    await dbDeleteProject(projectId);
    
    // Then, update the component's state by filtering the existing projects array.
    const updatedProjects = projects.filter(p => p.id !== projectId);
    setProjects(updatedProjects);

    if (activeProjectId === projectId) {
      if (updatedProjects.length > 0) {
        setActiveProjectId(updatedProjects[0].id);
      } else {
        // handleNewProject creates a new project and sets it as active.
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
    // The new chat is saved first, which adds the 'lastActivityAt' timestamp.
    // Then, we refetch the chats to ensure the UI state is perfectly in sync.
    saveChat(newChat);
    const updatedChats = getChats(activeProjectId);
    setChats(updatedChats);
    setActiveChatId(newChat.id);
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
        // The sorted list will determine the default active chat
        setActiveChatId(null); // Set to null first to trigger re-evaluation below
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
  
    // Memoized sorted chats
    const sortedChats = useMemo(() => {
      return [...chats].sort((a, b) => {
        const dateA = new Date(a[chatSortOrder] || a.createdAt).getTime();
        const dateB = new Date(b[chatSortOrder] || b.createdAt).getTime();
        return dateB - dateA;
      });
    }, [chats, chatSortOrder]);

  useEffect(() => {
      if (activeProjectId && !activeChatId && sortedChats.length > 0) {
          setActiveChatId(sortedChats[0].id);
      }
  }, [sortedChats, activeChatId, activeProjectId]);

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
    } else if(sortedChats.length > 0 && activeChatId !== sortedChats[0].id) {
        setActiveChatId(sortedChats[0].id);
    }
  }, [activeChat, activeChatId, setMessages, sortedChats]);
  
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
    saveChat(updatedChat);
    setChats(getChats(activeProjectId!));
  }, [activeChat, activeProjectId]);

  const handleDetachDocument = useCallback((docId: string) => {
    if (!activeChat) return;

    const newDocumentIds = activeChat.documentIds?.filter(id => id !== docId) || [];
    const updatedChat = { ...activeChat, documentIds: newDocumentIds };
    saveChat(updatedChat);
    setChats(getChats(activeProjectId!));
  }, [activeChat, activeProjectId]);

  const handleRenameChat = (chatId: string, newTitle: string) => {
    const chatToUpdate = chats.find(c => c.id === chatId);
    if (chatToUpdate && newTitle.trim()) {
      const updatedChat = { ...chatToUpdate, title: newTitle.trim() };
      saveChat(updatedChat);
      setChats(getChats(activeProjectId!));
    }
  };

  const handleDeleteChat = (chatId: string) => {
    dbDeleteChat(chatId);
    const remainingChats = getChats(activeProjectId!);
    setChats(remainingChats);
    if (activeChatId === chatId) {
      if (remainingChats.length > 0) {
        setActiveChatId(sortedChats[0].id);
      } else {
        handleNewChat();
      }
    }
  };
  
  // --- Chat Organization ---
  const handleMoveChatToProject = (chatId: string, newProjectId: string) => {
    const allChats = dbGetAllChats();
    const chatToMove = allChats.find(c => c.id === chatId);

    if (chatToMove && chatToMove.projectId !== newProjectId) {
      const updatedChat = { ...chatToMove, projectId: newProjectId };
      saveChat(updatedChat);
      if (chatToMove.projectId === activeProjectId) {
        setChats(getChats(activeProjectId));
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
    setMessages(updatedMessages); // Optimistic UI update
    saveChat(updatedChat);
    // No need to refetch all chats here, as message content doesn't affect list order
  };

    // --- Message Sending with Token Check ---
    const handleSendMessage = (prompt: string, mode: ResearchMode) => {
        const tokenUsagePercentage = (estimatedTokens / CONTEXT_WINDOW_LIMIT_TOKENS) * 100;
        if (tokenUsagePercentage >= 90) {
            if (!window.confirm("Warning: Context window usage is over 90%. Responses may be incomplete. It's recommended to start a new chat. Continue anyway?")) {
                return;
            }
        }
        sendMessage(prompt, mode);
        // After sending, refetch chats to update activity sort order
        setTimeout(() => setChats(getChats(activeProjectId!)), 100);
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
        documentIds: [...selectedDocIds],
        projectId: activeProjectId,
      };
      saveChat(newChat);
      setChats(getChats(activeProjectId));
      setActiveChatId(newChat.id);
      const synthesisPrompt = "Based on the attached documents, please provide a detailed synthesis. Identify the key themes, compare and contrast any arguments or data, and highlight any contradictions.";
      setPendingPrompt(synthesisPrompt);
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
      setEditingProjectPersona(null);
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
            {activeProjectId ? "Create a new chat to begin." : "Select a project to start."}
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
        chats={sortedChats}
        chatSortOrder={chatSortOrder}
        onChatSortOrderChange={setChatSortOrder}
        documents={documents}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDocumentsUpdated={handleDocumentsUpdated}
        onAttachDocument={handleAttachDocument}
        activeDocumentIds={activeChat?.documentIds || []}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        onMoveChatToProject={handleMoveChatToProject}
        selectedDocIds={selectedDocIds}
        onToggleDocumentSelection={handleToggleDocumentSelection}
        onDocumentSynthesis={handleDocumentSynthesis}
        onRerunTour={handleRerunTour}
      />
    </div>
  );
};

export default App;
