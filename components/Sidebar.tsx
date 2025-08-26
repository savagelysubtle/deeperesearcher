
import React, { useState, useRef, useEffect } from 'react';
import type { Chat, Document, Project } from '../types';
import { FileUploader } from './FileUploader';

interface SidebarProps {
  // Projects
  projects: Project[];
  activeProjectId: string | null;
  onNewProject: () => void;
  onSelectProject: (projectId: string) => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onDeleteProject: (projectId: string) => void;

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
  
  // Document Synthesis
  selectedDocIds: string[];
  onToggleDocumentSelection: (docId: string) => void;
  onDocumentSynthesis: () => void;

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


export const Sidebar: React.FC<SidebarProps> = ({ projects, activeProjectId, onNewProject, onSelectProject, onRenameProject, onDeleteProject, chats, documents, activeChatId, onNewChat, onSelectChat, onDocumentsUpdated, onAttachDocument, activeDocumentIds, onRenameChat, onDeleteChat, selectedDocIds, onToggleDocumentSelection, onDocumentSynthesis, style, isCollapsed, onToggleCollapse }) => {
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
        setMenuProjectId(null);
      }
      if (chatMenuRef.current && !chatMenuRef.current.contains(event.target as Node)) {
        setMenuChatId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Project Handlers ---
  const handleProjectRenameStart = (project: Project) => {
    setEditingProjectId(project.id);
    setRenamedProjectName(project.name);
    setMenuProjectId(null);
  };
  const handleProjectRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProjectId) onRenameProject(editingProjectId, renamedProjectName);
    setEditingProjectId(null);
  };
  const handleProjectRenameBlur = () => {
    if (editingProjectId) onRenameProject(editingProjectId, renamedProjectName);
    setEditingProjectId(null);
  };
  const handleProjectDelete = (projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project and all its chats and documents? This action cannot be undone.')) {
        onDeleteProject(projectId);
    }
    setMenuProjectId(null);
  };
  const toggleProjectMenu = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setMenuProjectId(prev => (prev === projectId ? null : projectId));
  };


  // --- Chat Handlers ---
  const handleChatRenameStart = (chat: Chat) => {
    setEditingChatId(chat.id);
    setRenamedChatTitle(chat.title);
    setMenuChatId(null);
  };
  const handleChatRenameSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editingChatId) onRenameChat(editingChatId, renamedChatTitle);
    setEditingChatId(null);
  };
  const handleChatRenameBlur = () => {
    if (editingChatId) onRenameChat(editingChatId, renamedChatTitle);
    setEditingChatId(null);
  }
  const handleChatDelete = (chatId: string) => {
    if (window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
        onDeleteChat(chatId);
    }
    setMenuChatId(null);
  };
  const toggleChatMenu = (e: React.MouseEvent, chatId: string) => {
      e.stopPropagation();
      setMenuChatId(prev => (prev === chatId ? null : chatId));
  };

  return (
    <aside
      style={style}
      className="bg-gray-900 flex flex-col transition-all duration-300 ease-in-out overflow-hidden"
    >
      <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
        <h1 className="text-xl font-bold text-white whitespace-nowrap">Deep Research</h1>
        <div className="flex items-center gap-2">
            <button
                onClick={onNewChat}
                className="p-2 rounded-md hover:bg-gray-700 transition-colors"
                aria-label="New Chat"
            >
                <PlusIcon />
            </button>
            <button
                onClick={onToggleCollapse}
                className="p-2 rounded-md hover:bg-gray-700 transition-colors"
                aria-label="Collapse sidebar"
            >
                <CollapseIcon />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Projects Section */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Projects</h2>
            <button onClick={onNewProject} className="p-1 rounded-md hover:bg-gray-700" aria-label="New Project">
              <PlusIcon />
            </button>
          </div>
          <ul>
            {projects.map((project) => (
              <li key={project.id} className="relative group">
                <div
                  onClick={() => editingProjectId !== project.id && onSelectProject(project.id)}
                  className={`w-full text-left p-2 rounded-md flex items-center gap-3 transition-colors cursor-pointer ${
                    activeProjectId === project.id ? 'bg-blue-600' : 'hover:bg-gray-700'
                  } ${editingProjectId === project.id ? 'bg-gray-700 ring-2 ring-blue-500' : ''}`}
                >
                  <ProjectIcon />
                  {editingProjectId === project.id ? (
                    <form onSubmit={handleProjectRenameSubmit} className="flex-1">
                      <input type="text" value={renamedProjectName} onChange={(e) => setRenamedProjectName(e.target.value)} onBlur={handleProjectRenameBlur} autoFocus className="w-full bg-transparent outline-none text-white text-sm" />
                    </form>
                  ) : (
                    <span className="truncate flex-1 text-sm">{project.name}</span>
                  )}
                  {editingProjectId !== project.id && (
                     <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                         <button onClick={(e) => toggleProjectMenu(e, project.id)} className="p-1 rounded-full hover:bg-gray-600"><KebabIcon /></button>
                    </div>
                  )}
                </div>
                {menuProjectId === project.id && (
                  <div ref={projectMenuRef} className="absolute right-2 top-10 z-20 bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 w-32">
                    <button onClick={() => handleProjectRenameStart(project)} className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700">Rename</button>
                    <button onClick={() => handleProjectDelete(project.id)} className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-gray-700">Delete</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
        
        {/* Chats Section */}
        <div className="p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 whitespace-nowrap">Chats</h2>
          <ul>
            {chats.map((chat) => (
              <li key={chat.id} className="relative group">
                <div
                  onClick={() => editingChatId !== chat.id && onSelectChat(chat.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && editingChatId !== chat.id && onSelectChat(chat.id)}
                  className={`w-full text-left p-2 rounded-md flex items-center gap-3 transition-colors cursor-pointer ${
                    activeChatId === chat.id ? 'bg-blue-600' : 'hover:bg-gray-700'
                  } ${editingChatId === chat.id ? 'bg-gray-700 ring-2 ring-blue-500' : ''}`}
                >
                  <ChatIcon />
                  {editingChatId === chat.id ? (
                    <form onSubmit={handleChatRenameSubmit} className="flex-1">
                      <input type="text" value={renamedChatTitle} onChange={(e) => setRenamedChatTitle(e.target.value)} onBlur={handleChatRenameBlur} autoFocus className="w-full bg-transparent outline-none text-white text-sm" />
                    </form>
                  ) : (
                    <span className="truncate flex-1 text-sm">{chat.title}</span>
                  )}

                  {editingChatId !== chat.id && (
                     <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                         <button onClick={(e) => toggleChatMenu(e, chat.id)} className="p-1 rounded-full hover:bg-gray-600"><KebabIcon /></button>
                    </div>
                  )}
                </div>
                {menuChatId === chat.id && (
                    <div ref={chatMenuRef} className="absolute right-2 top-10 z-20 bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 w-32">
                        <button onClick={() => handleChatRenameStart(chat)} className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700">Rename</button>
                        <button onClick={() => handleChatDelete(chat.id)} className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-gray-700">Delete</button>
                    </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Knowledge Base Section */}
        <div className="p-4 border-t border-gray-700">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 whitespace-nowrap">Knowledge Base</h2>
          {activeProjectId && <FileUploader onUploadSuccess={onDocumentsUpdated} projectId={activeProjectId} />}
          <ul className="mt-4 space-y-1">
            {documents.map((doc) => (
              <li
                key={doc.id}
                draggable="true"
                onDragStart={(e) => {
                  if ((e.target as HTMLElement).tagName.toLowerCase() === 'input') {
                      e.preventDefault();
                      return;
                  }
                  e.dataTransfer.setData('application/x-document-id', doc.id);
                  e.dataTransfer.effectAllowed = 'copy';
                  setDraggedDocId(doc.id);
                }}
                onDragEnd={() => setDraggedDocId(null)}
                className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                  activeDocumentIds.includes(doc.id) ? 'bg-gray-700' : ''
                } ${
                  draggedDocId === doc.id ? 'opacity-50' : ''
                }`}
              >
                <input 
                  type="checkbox"
                  checked={selectedDocIds.includes(doc.id)}
                  onChange={() => onToggleDocumentSelection(doc.id)}
                  className="w-4 h-4 bg-gray-600 border-gray-500 rounded text-blue-500 focus:ring-blue-500 flex-shrink-0"
                  aria-label={`Select ${doc.name} for synthesis`}
                />
                <div
                  className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-gray-800 rounded-md p-1 -m-1"
                  onClick={() => onAttachDocument(doc.id)}
                  aria-label={`Attach ${doc.name} to chat`}
                >
                  <DocIcon />
                  <span className="truncate flex-1 text-sm">{doc.name}</span>
                </div>
              </li>
            ))}
          </ul>
          {documents.length > 0 && (
            <div className="mt-4">
              <button
                onClick={onDocumentSynthesis}
                disabled={selectedDocIds.length < 2}
                className="w-full text-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-md transition-colors hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                aria-label="Synthesize selected documents"
              >
                Synthesize Documents ({selectedDocIds.length})
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
