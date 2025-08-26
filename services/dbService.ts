
import type { Chat, Document, Project } from '../types';
import { deleteCollection as deleteVectorCollection } from './vectorDBService';

const PROJECTS_KEY = 'gemini_research_projects';
const CHATS_KEY = 'gemini_research_chats';
const DOCUMENTS_KEY = 'gemini_research_documents';

// --- Helper Functions ---

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

const getDocumentsByProject = (): Record<string, Document[]> => {
  try {
    const docsJson = localStorage.getItem(DOCUMENTS_KEY);
    if (!docsJson) return {};
    
    const data = JSON.parse(docsJson);
    
    // Migration for users with old data structure (flat array)
    if (Array.isArray(data)) {
      console.log("Migrating documents to new project-based structure.");
      const migratedData: Record<string, Document[]> = {};
      (data as Document[]).forEach(doc => {
        if (!migratedData[doc.projectId]) {
          migratedData[doc.projectId] = [];
        }
        migratedData[doc.projectId].push(doc);
      });
      localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(migratedData));
      return migratedData;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to parse documents from localStorage', error);
    return {};
  }
};

const saveDocumentsByProject = (documents: Record<string, Document[]>): void => {
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

export const deleteProject = async (projectId: string): Promise<void> => {
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

  // Cascade delete associated documents from localStorage
  const allDocuments = getDocumentsByProject();
  delete allDocuments[projectId];
  saveDocumentsByProject(allDocuments);
  
  // Cascade delete vector store collection
  await deleteVectorCollection(projectId);
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
  const allDocsByProject = getDocumentsByProject();
  return allDocsByProject[projectId] || [];
};

export const saveDocument = (docToSave: Document): void => {
  const allDocsByProject = getDocumentsByProject();
  const projectDocs = allDocsByProject[docToSave.projectId] || [];
  
  const existingIndex = projectDocs.findIndex(d => d.id === docToSave.id);
  if (existingIndex > -1) {
    projectDocs[existingIndex] = docToSave;
  } else {
    projectDocs.unshift(docToSave);
  }

  allDocsByProject[docToSave.projectId] = projectDocs;
  saveDocumentsByProject(allDocsByProject);
};

export const deleteDocument = (docId: string): void => {
  const allDocsByProject = getDocumentsByProject();
  let wasDeleted = false;
  for (const projectId in allDocsByProject) {
    const originalCount = allDocsByProject[projectId].length;
    allDocsByProject[projectId] = allDocsByProject[projectId].filter(doc => doc.id !== docId);
    if (allDocsByProject[projectId].length < originalCount) {
      if(allDocsByProject[projectId].length === 0){
        delete allDocsByProject[projectId];
      }
      wasDeleted = true;
      break;
    }
  }

  if (wasDeleted) {
    saveDocumentsByProject(allDocsByProject);
  }
};
