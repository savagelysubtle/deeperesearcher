
import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Chat, Document, Project } from '../types';
import { FileUploader } from './FileUploader';
import { DocumentPreviewModal } from './DocumentPreviewModal';

interface SidebarProps {
  // Projects
  projects: Project[];
  activeProjectId: string | null;
  onNewProject: () => void;
  onSelectProject: (projectId: string) => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onDeleteProject: (projectId: string) => void;
  onOpenPersonaEditor: (projectId: string) => void;

  // Chats & Docs (for active project)
  chats: Chat[];
  documents: Document[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onDocumentsUpdated: () => void;
  onAttachDocument: (docId: string) => void;
  activeDocumentIds: string[];
  onRenameChat: (chatId: string, newTitle: string) => void;
  onDeleteChat: (chatId: string) => void;
  onMoveChatToProject: (chatId:string, newProjectId: string) => void;
  chatSortOrder: 'lastActivityAt' | 'createdAt';
  onChatSortOrderChange: (order: 'lastActivityAt' | 'createdAt') => void;
  
  // Document Synthesis
  selectedDocIds: string[];
  onToggleDocumentSelection: (docId: string) => void;
  onDocumentSynthesis: () => void;

  // Onboarding
  onRerunTour: () => void;

  // Style
  style?: React.CSSProperties;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const PlusIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
);

const ChatIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm14 1a1 1 0 00-1-1H5a1 1 0 00-1 1v5l3.293-3.293a1 1 0 011.414 0L15 11.586V6z" />
    <path d="M15 9a1 1 0 11-2 0 1 1 0 012 0z" />
  </svg>
);

const ProjectIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
    </svg>
);

const DocIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 1a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6a1 1 0 00-1-1H6z" clipRule="evenodd" />
  </svg>
);

const KebabIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
    </svg>
);

const CollapseIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M17 3a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1h14zM5 5v10h10V5H5z" clipRule="evenodd" />
        <path d="M7.707 14.707a1 1 0 01-1.414-1.414L9.586 10 6.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4z" />
    </svg>
);

const HelpIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  );

const PersonaIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0012 11z" clipRule="evenodd" />
    </svg>
);

const SynthesisIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
    </svg>
);



export const Sidebar: React.FC<SidebarProps> = ({ projects, activeProjectId, onNewProject, onSelectProject, onRenameProject, onDeleteProject, onOpenPersonaEditor, chats, documents, activeChatId, onNewChat, onSelectChat, onDocumentsUpdated, onAttachDocument, activeDocumentIds, onRenameChat, onDeleteChat, onMoveChatToProject, chatSortOrder, onChatSortOrderChange, selectedDocIds, onToggleDocumentSelection, onDocumentSynthesis, onRerunTour, style, isCollapsed, onToggleCollapse }) => {
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null);
  
  // State for renaming/menu for Projects
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [renamedProjectName, setRenamedProjectName] = useState('');
  const [menuProjectId, setMenuProjectId] = useState<string | null>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  // State for renaming/menu for Chats
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [renamedChatTitle, setRenamedChatTitle] = useState('');
  const [menuChatId, setMenuChatId] = useState<string | null>(null);
  const chatMenuRef = useRef<HTMLDivElement>(null);

  // State for KB Search and Preview
  const [docFilter, setDocFilter] = useState('');
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  // State for Chat Drag and Drop
  const [draggedChatId, setDraggedChatId] = useState<string | null>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
        setMenuProjectId(null);
      }
      if (chatMenuRef.current && !chatMenuRef.current.contains(event.target as Node)) {
        setMenuChatId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Handlers for Project Renaming
  const handleStartRenameProject = (project: Project) => {
    setEditingProjectId(project.id);
    setRenamedProjectName(project.name);
    setMenuProjectId(null);
  };
  const handleProjectRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProjectId) {
      onRenameProject(editingProjectId, renamedProjectName);
      setEditingProjectId(null);
    }
  };

  // Handlers for Chat Renaming
  const handleStartRenameChat = (chat: Chat) => {
    setEditingChatId(chat.id);
    setRenamedChatTitle(chat.title);
    setMenuChatId(null);
  };
  const handleChatRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingChatId) {
      onRenameChat(editingChatId, renamedChatTitle);
      setEditingChatId(null);
    }
  };

  const filteredDocs = useMemo(() => {
      return documents.filter(doc => doc.name.toLowerCase().includes(docFilter.toLowerCase()));
  }, [documents, docFilter]);

  const handleDragStartDoc = (e: React.DragEvent, docId: string) => {
    setDraggedDocId(docId);
    e.dataTransfer.setData('application/x-document-id', docId);
  };

  const handleDragEndDoc = () => {
    setDraggedDocId(null);
  };

  const handleDragStartChat = (e: React.DragEvent, chatId: string) => {
      setDraggedChatId(chatId);
      e.dataTransfer.setData('application/x-chat-id', chatId);
  };
  
  const handleDropOnProject = (e: React.DragEvent, projectId: string) => {
      e.preventDefault();
      const chatId = e.dataTransfer.getData('application/x-chat-id');
      if (chatId) {
          onMoveChatToProject(chatId, projectId);
      }
      setDraggedChatId(null);
  };

  const allowDrop = (e: React.DragEvent) => {
      e.preventDefault();
  };


  return (
    <aside style={style} className={`bg-gray-800 border-l border-gray-700 flex flex-col transition-all duration-300 ${isCollapsed ? 'opacity-0 invisible' : 'opacity-100 visible'}`}>
      <DocumentPreviewModal
        isOpen={!!previewDoc}
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onAttach={onAttachDocument}
      />
      <header className="p-3 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
        <h1 className="text-lg font-bold">Gemini Research</h1>
        <div className="flex items-center gap-1">
            <button onClick={onRerunTour} className="p-2 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white" aria-label="Help" title="Rerun Onboarding Tour">
                <HelpIcon />
            </button>
            <button onClick={onToggleCollapse} className="p-2 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white" aria-label="Collapse sidebar" title="Collapse sidebar">
                <CollapseIcon />
            </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Projects Section */}
        <div className="p-3">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Projects</h2>
                <button onClick={onNewProject} className="p-1 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white" aria-label="New project">
                    <PlusIcon />
                </button>
            </div>
            <ul id="projects-list" className="space-y-1">
            {projects.map((project) => (
                <li key={project.id} onDragOver={allowDrop} onDrop={(e) => handleDropOnProject(e, project.id)}>
                    <div
                        onClick={() => onSelectProject(project.id)}
                        className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                            activeProjectId === project.id ? 'bg-blue-600/30 text-white' : `text-gray-300 hover:bg-gray-700/70 ${draggedChatId ? 'bg-blue-900/50' : ''}`
                        }`}
                    >
                        {editingProjectId === project.id ? (
                            <form onSubmit={handleProjectRenameSubmit} className="flex-1">
                                <input
                                    type="text"
                                    value={renamedProjectName}
                                    onChange={(e) => setRenamedProjectName(e.target.value)}
                                    onBlur={handleProjectRenameSubmit}
                                    autoFocus
                                    className="w-full bg-transparent text-white focus:outline-none"
                                />
                            </form>
                        ) : (
                           <>
                            <div className="flex items-center gap-2 overflow-hidden">
                                <ProjectIcon />
                                <span className="truncate flex-1">{project.name}</span>
                            </div>
                             <div className="relative" ref={projectMenuRef}>
                                <button onClick={(e) => { e.stopPropagation(); setMenuProjectId(project.id === menuProjectId ? null : project.id); }} className="p-1 rounded-md opacity-0 group-hover:opacity-100 text-gray-400 hover:bg-gray-600 hover:text-white">
                                    <KebabIcon />
                                </button>
                                {menuProjectId === project.id && (
                                    <div className="absolute right-0 mt-2 w-40 bg-gray-900 border border-gray-700 rounded-md shadow-lg py-1 z-10">
                                        <button onClick={(e) => {e.stopPropagation(); onOpenPersonaEditor(project.id); setMenuProjectId(null);}} className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2">
                                            <PersonaIcon /> Set Persona
                                        </button>
                                        <button onClick={(e) => {e.stopPropagation(); handleStartRenameProject(project)}} className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700">Rename</button>
                                        <button onClick={(e) => {e.stopPropagation(); onDeleteProject(project.id); setMenuProjectId(null)}} className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-gray-700">Delete</button>
                                    </div>
                                )}
                            </div>
                           </>
                        )}
                    </div>
                </li>
            ))}
            </ul>
        </div>
        
        <div className="border-t border-gray-700/60 mx-3"></div>

        {/* Chats Section */}
        {activeProjectId && (
          <div className="p-3">
             <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Chats</h3>
                 <div className="flex items-center">
                    <div className="bg-gray-900/70 rounded-md p-0.5 flex text-xs mr-2">
                        <button
                            onClick={() => onChatSortOrderChange('lastActivityAt')}
                            className={`px-2 py-0.5 rounded-sm transition-colors ${chatSortOrder === 'lastActivityAt' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            title="Sort by most recent activity"
                        >
                            Activity
                        </button>
                        <button
                            onClick={() => onChatSortOrderChange('createdAt')}
                            className={`px-2 py-0.5 rounded-sm transition-colors ${chatSortOrder === 'createdAt' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
                             title="Sort by creation date"
                        >
                            Date
                        </button>
                    </div>
                    <button onClick={onNewChat} className="p-1 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white" aria-label="New chat">
                        <PlusIcon />
                    </button>
                </div>
            </div>
            <ul className="space-y-1">
              {chats.length > 0 ? chats.map((chat) => (
                <li key={chat.id} draggable onDragStart={(e) => handleDragStartChat(e, chat.id)}>
                   <div
                    onClick={() => onSelectChat(chat.id)}
                    className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                      activeChatId === chat.id ? 'bg-blue-600/20 text-white' : 'text-gray-400 hover:bg-gray-700/70'
                    }`}
                  >
                     {editingChatId === chat.id ? (
                        <form onSubmit={handleChatRenameSubmit} className="flex-1">
                            <input
                                type="text"
                                value={renamedChatTitle}
                                onChange={(e) => setRenamedChatTitle(e.target.value)}
                                onBlur={handleChatRenameSubmit}
                                autoFocus
                                className="w-full bg-transparent text-white focus:outline-none"
                            />
                        </form>
                    ) : (
                        <>
                         <div className="flex items-center gap-2 overflow-hidden">
                            <ChatIcon />
                            <span className="truncate flex-1">{chat.title}</span>
                         </div>
                          <div className="relative" ref={chatMenuRef}>
                            <button onClick={(e) => { e.stopPropagation(); setMenuChatId(chat.id === menuChatId ? null : chat.id); }} className="p-1 rounded-md opacity-0 group-hover:opacity-100 text-gray-400 hover:bg-gray-600 hover:text-white">
                                <KebabIcon />
                            </button>
                            {menuChatId === chat.id && (
                                <div className="absolute right-0 mt-2 w-32 bg-gray-900 border border-gray-700 rounded-md shadow-lg py-1 z-10">
                                    <button onClick={(e) => {e.stopPropagation(); handleStartRenameChat(chat)}} className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700">Rename</button>
                                    <button onClick={(e) => {e.stopPropagation(); onDeleteChat(chat.id); setMenuChatId(null)}} className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-gray-700">Delete</button>
                                </div>
                            )}
                          </div>
                        </>
                    )}
                  </div>
                </li>
              )) : (
                <p className="text-sm text-gray-500 px-2">No chats yet.</p>
              )}
            </ul>
          </div>
        )}
        
        <div className="border-t border-gray-700/60 mx-3"></div>

        {/* Knowledge Base Section */}
        {activeProjectId && (
          <div id="knowledge-base" className="p-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Knowledge Base</h2>
            <div className="mb-3">
                <FileUploader onUploadSuccess={onDocumentsUpdated} projectId={activeProjectId} />
            </div>
             <input
              type="text"
              placeholder="Filter documents..."
              value={docFilter}
              onChange={(e) => setDocFilter(e.target.value)}
              className="w-full bg-gray-700 rounded-md p-2 mb-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {selectedDocIds.length > 1 && (
                <button
                    id="synthesis-button"
                    onClick={onDocumentSynthesis}
                    className="w-full flex items-center justify-center p-2 mb-2 bg-blue-600 text-white font-semibold rounded-md transition-colors hover:bg-blue-500"
                >
                    <SynthesisIcon />
                    Synthesize {selectedDocIds.length} Documents
                </button>
            )}
            <ul className="space-y-1">
              {filteredDocs.map((doc) => {
                const isAttached = activeDocumentIds.includes(doc.id);
                const isSelectedForSynth = selectedDocIds.includes(doc.id);
                return (
                  <li
                    key={doc.id}
                    draggable
                    onDragStart={(e) => handleDragStartDoc(e, doc.id)}
                    onDragEnd={handleDragEndDoc}
                    className={`group flex items-center justify-between p-2 rounded-md transition-colors ${
                      isAttached ? 'bg-blue-600/10' : ''
                    } ${
                      draggedDocId === doc.id ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                        <input
                          type="checkbox"
                          checked={isSelectedForSynth}
                          onChange={() => onToggleDocumentSelection(doc.id)}
                          className="form-checkbox h-4 w-4 rounded bg-gray-700 border-gray-500 text-blue-600 focus:ring-blue-500"
                        />
                        <DocIcon />
                        <span className="truncate flex-1 text-sm text-gray-300">{doc.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                         <button onClick={() => setPreviewDoc(doc)} className="p-1 rounded-md text-gray-400 hover:bg-gray-600 hover:text-white opacity-0 group-hover:opacity-100" title="Preview document summary">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                        </button>
                        <button
                            onClick={() => onAttachDocument(doc.id)}
                            className={`p-1 rounded-md text-gray-400 hover:text-white transition-colors ${
                                isAttached ? 'bg-blue-600/30 hover:bg-blue-500' : 'hover:bg-gray-600 opacity-0 group-hover:opacity-100'
                            }`}
                            title={isAttached ? 'Attached to current chat' : 'Attach to current chat'}
                            aria-label={isAttached ? 'Attached to current chat' : 'Attach to current chat'}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M15.172 7.172a4 4 0 015.656 0L20 6.343V12h-5.657l-1.172-1.172a4 4 0 010-5.656zM8.828 15.172a4 4 0 01-5.656 0L4 16.343V11h5.657l1.172 1.172a4 4 0 010 5.656z" clipRule="evenodd" /></svg>
                        </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
};