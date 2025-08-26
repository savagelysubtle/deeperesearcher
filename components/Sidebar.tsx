import React, { useState, useRef, useEffect } from 'react';
import type { Chat, Document } from '../types';
import { FileUploader } from './FileUploader';

interface SidebarProps {
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


export const Sidebar: React.FC<SidebarProps> = ({ chats, documents, activeChatId, onNewChat, onSelectChat, onDocumentsUpdated, onAttachDocument, activeDocumentIds, onRenameChat, onDeleteChat, style, isCollapsed, onToggleCollapse }) => {
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [renamedTitle, setRenamedTitle] = useState('');
  const [menuChatId, setMenuChatId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuChatId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleRenameStart = (chat: Chat) => {
    setEditingChatId(chat.id);
    setRenamedTitle(chat.title);
    setMenuChatId(null);
  };

  const handleRenameSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editingChatId) {
      onRenameChat(editingChatId, renamedTitle);
    }
    setEditingChatId(null);
  };
  
  const handleRenameBlur = () => {
    if (editingChatId) {
      onRenameChat(editingChatId, renamedTitle);
    }
    setEditingChatId(null);
  }

  const handleDelete = (chatId: string) => {
    if (window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
        onDeleteChat(chatId);
    }
    setMenuChatId(null);
  };
  
  const toggleMenu = (e: React.MouseEvent, chatId: string) => {
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
                    <form onSubmit={handleRenameSubmit} className="flex-1">
                      <input
                        type="text"
                        value={renamedTitle}
                        onChange={(e) => setRenamedTitle(e.target.value)}
                        onBlur={handleRenameBlur}
                        autoFocus
                        className="w-full bg-transparent outline-none text-white text-sm"
                      />
                    </form>
                  ) : (
                    <span className="truncate flex-1 text-sm">{chat.title}</span>
                  )}

                  {editingChatId !== chat.id && (
                     <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                         <button onClick={(e) => toggleMenu(e, chat.id)} className="p-1 rounded-full hover:bg-gray-600">
                             <KebabIcon />
                         </button>
                    </div>
                  )}
                </div>
                {menuChatId === chat.id && (
                    <div ref={menuRef} className="absolute right-2 top-10 z-20 bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 w-32">
                        <button onClick={() => handleRenameStart(chat)} className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2">
                            Rename
                        </button>
                        <button onClick={() => handleDelete(chat.id)} className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2">
                            Delete
                        </button>
                    </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 border-t border-gray-700">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 whitespace-nowrap">Knowledge Base</h2>
          <FileUploader onUploadSuccess={onDocumentsUpdated} />
          <ul className="mt-4 space-y-1">
            {documents.map((doc) => (
              <li
                key={doc.id}
                draggable="true"
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-document-id', doc.id);
                  e.dataTransfer.effectAllowed = 'copy';
                  setDraggedDocId(doc.id);
                }}
                onDragEnd={() => setDraggedDocId(null)}
                className={`flex items-center gap-3 p-2 rounded-md transition-colors cursor-pointer ${
                  activeDocumentIds.includes(doc.id) ? 'bg-gray-700' : 'hover:bg-gray-800'
                } ${
                  draggedDocId === doc.id ? 'opacity-50' : ''
                }`}
                onClick={() => onAttachDocument(doc.id)}
                aria-label={`Attach ${doc.name} to chat`}
              >
                <DocIcon />
                <span className="truncate flex-1 text-sm">{doc.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
};