
export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  sources?: Source[];
  mode?: ResearchMode;
}

export interface Source {
  uri: string;
  title: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  documentIds?: string[];
  projectId: string;
}

export interface Document {
  id: string;
  name: string;
  content: string; // base64 encoded content
  mimeType: string;
  createdAt: string;
  projectId: string;
  summary?: string;
}

export type ResearchMode = 'deep_research' | 'find_documents';