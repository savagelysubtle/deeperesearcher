
import type { Chat, Document } from '../types';

const CHATS_KEY = 'gemini_research_chats';
const DOCUMENTS_KEY = 'gemini_research_documents';

// --- Chat Functions ---

export const getChats = (): Chat[] => {
  try {
    const chatsJson = localStorage.getItem(CHATS_KEY);
    if (!chatsJson) return [];
    const chats: Chat[] = JSON.parse(chatsJson);
    // Sort chats by most recent
    return chats.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Failed to parse chats from localStorage', error);
    return [];
  }
};

export const saveChat = (chatToSave: Chat): void => {
  const chats = getChats();
  const existingIndex = chats.findIndex((chat) => chat.id === chatToSave.id);

  if (existingIndex > -1) {
    chats[existingIndex] = chatToSave;
  } else {
    // This logic assumes new chats are handled elsewhere to be added to the start
    chats.unshift(chatToSave);
  }
  
  // Ensure consistent sorting
  const sortedChats = chats.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(sortedChats));
  } catch (error) {
    console.error('Failed to save chat to localStorage', error);
  }
};

export const deleteChat = (chatId: string): void => {
  const chats = getChats();
  const updatedChats = chats.filter((chat) => chat.id !== chatId);
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(updatedChats));
  } catch (error) {
    console.error('Failed to delete chat from localStorage', error);
  }
};


// --- Document Functions ---

export const getDocuments = (): Document[] => {
  try {
    const docsJson = localStorage.getItem(DOCUMENTS_KEY);
    return docsJson ? JSON.parse(docsJson) : [];
  } catch (error) {
    console.error('Failed to parse documents from localStorage', error);
    return [];
  }
};

export const saveDocument = (docToSave: Document): void => {
  const documents = getDocuments();
  const updatedDocuments = [...documents, docToSave];
  try {
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(updatedDocuments));
  } catch (error) {
    console.error('Failed to save document to localStorage', error);
  }
};

export const deleteDocument = (docId: string): void => {
  const documents = getDocuments();
  const updatedDocuments = documents.filter(doc => doc.id !== docId);
  try {
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(updatedDocuments));
  } catch (error) {
    console.error('Failed to delete document from localStorage', error);
  }
};
