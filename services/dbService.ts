
import type { Chat, Document, Project } from '../types';

const PROJECTS_KEY = 'gemini_research_projects';
const CHATS_KEY = 'gemini_research_chats';
const DOCUMENTS_KEY = 'gemini_research_documents';

// --- Private Helper Functions ---

export const getAllChats = (): Chat[] => {
  try {
    const chatsJson = localStorage.getItem(CHATS_KEY);
    return chatsJson ? JSON.parse(chatsJson) : [];
  } catch (error) {
    console.error('Failed to parse chats from localStorage', error);
    return [];
  }
};

const saveAllChats = (chats: Chat[]): void => {
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  } catch (error) {
    console.error('Failed to save all chats to localStorage', error);
  }
};

const getAllDocuments = (): Document[] => {
  try {
    const docsJson = localStorage.getItem(DOCUMENTS_KEY);
    return docsJson ? JSON.parse(docsJson) : [];
  } catch (error) {
    console.error('Failed to parse documents from localStorage', error);
    return [];
  }
};

const saveAllDocuments = (documents: Document[]): void => {
    try {
        localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
    } catch (error) {
        console.error('Failed to save all documents to localStorage', error);
    }
};

// --- Project Functions ---

export const getProjects = (): Project[] => {
  try {
    const projectsJson = localStorage.getItem(PROJECTS_KEY);
    if (!projectsJson) return [];
    const projects: Project[] = JSON.parse(projectsJson);
    return projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Failed to parse projects from localStorage', error);
    return [];
  }
};

export const saveProject = (projectToSave: Project): void => {
  const projects = getProjects();
  const existingIndex = projects.findIndex((p) => p.id === projectToSave.id);

  if (existingIndex > -1) {
    projects[existingIndex] = projectToSave;
  } else {
    projects.unshift(projectToSave);
  }
  
  const sortedProjects = projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(sortedProjects));
  } catch (error) {
    console.error('Failed to save project to localStorage', error);
  }
};

export const deleteProject = (projectId: string): void => {
  // Delete the project itself
  const projects = getProjects();
  const updatedProjects = projects.filter((p) => p.id !== projectId);
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(updatedProjects));
  } catch (error) {
    console.error('Failed to delete project from localStorage', error);
  }

  // Cascade delete associated chats
  const allChats = getAllChats();
  const chatsToKeep = allChats.filter((chat) => chat.projectId !== projectId);
  saveAllChats(chatsToKeep);

  // Cascade delete associated documents
  const allDocuments = getAllDocuments();
  const documentsToKeep = allDocuments.filter((doc) => doc.projectId !== projectId);
  saveAllDocuments(documentsToKeep);
};


// --- Chat Functions ---

export const getChats = (projectId: string): Chat[] => {
  const allChats = getAllChats();
  const projectChats = allChats.filter(chat => chat.projectId === projectId);
  return projectChats.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const saveChat = (chatToSave: Chat): void => {
  const chats = getAllChats();
  const existingIndex = chats.findIndex((chat) => chat.id === chatToSave.id);

  if (existingIndex > -1) {
    chats[existingIndex] = chatToSave;
  } else {
    chats.unshift(chatToSave);
  }
  
  saveAllChats(chats);
};

export const deleteChat = (chatId: string): void => {
  const chats = getAllChats();
  const updatedChats = chats.filter((chat) => chat.id !== chatId);
  saveAllChats(updatedChats);
};


// --- Document Functions ---

export const getDocuments = (projectId: string): Document[] => {
  const allDocuments = getAllDocuments();
  return allDocuments.filter(doc => doc.projectId === projectId);
};

export const saveDocument = (docToSave: Document): void => {
  const documents = getAllDocuments();
  const updatedDocuments = [...documents, docToSave];
  saveAllDocuments(updatedDocuments);
};

export const deleteDocument = (docId: string): void => {
  const documents = getAllDocuments();
  const updatedDocuments = documents.filter(doc => doc.id !== docId);
  saveAllDocuments(updatedDocuments);
};
