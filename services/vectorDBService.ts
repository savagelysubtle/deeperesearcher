
import { ChromaClient, type Collection } from 'chromadb';
import { embedText } from './geminiService';
import type { Document } from '../types';

// Initialize the ChromaDB client for in-browser use.
export const client = new ChromaClient();

/**
 * Retrieves an existing collection or creates a new one for a given project.
 * Collection names are sanitized to be compatible with ChromaDB.
 * @param projectId - The ID of the project, used as the collection name.
 * @returns A promise that resolves to the ChromaDB collection.
 */
export const getOrCreateCollection = async (projectId: string): Promise<Collection> => {
  // Sanitize collection name for ChromaDB, which has specific naming requirements.
  const sanitizedName = `proj-${projectId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return await client.getOrCreateCollection({ name: sanitizedName });
};

/**
 * Splits a long text into smaller chunks based on paragraphs.
 * This is a simple and effective strategy for chunking documents for RAG.
 * @param text - The plain text content of the document.
 * @returns An array of text chunks.
 */
const chunkText = (text: string): string[] => {
  if (!text) return [];
  // Split by double newlines (paragraphs) and filter out empty strings.
  return text.split('\n\n').map(chunk => chunk.trim()).filter(chunk => chunk.length > 0);
};

/**
 * Processes a document for ingestion into the vector store.
 * This involves decoding, chunking, embedding, and adding to the project's collection.
 * @param projectId - The ID of the project to add the document to.
 * @param doc - The document object containing metadata and base64 content.
 * @param onStatusUpdate - A callback to provide real-time feedback to the UI.
 */
export const addDocumentToCollection = async (
    projectId: string, 
    doc: Document,
    onStatusUpdate: (message: string) => void
) => {
  onStatusUpdate("Initializing document processing...");
  const collection = await getOrCreateCollection(projectId);
  
  // Decode the base64 content to plain text.
  // Using try-catch for robustness in case of malformed base64.
  let plainText = '';
  try {
    plainText = atob(doc.content);
  } catch (e) {
    console.error(`Failed to decode base64 content for document ${doc.name}:`, e);
    throw new Error(`Could not read the content of ${doc.name}.`);
  }
  
  onStatusUpdate("Chunking document...");
  const chunks = chunkText(plainText);
  
  if (chunks.length === 0) {
    console.warn(`Document ${doc.name} resulted in 0 chunks.`);
    return;
  }

  // Generate vector embeddings for each chunk using the Gemini API.
  onStatusUpdate(`Embedding ${chunks.length} text chunks...`);
  const embeddings = await embedText(chunks);

  // Create unique IDs for each chunk to store in the database.
  const ids = chunks.map((_, i) => `${doc.id}-chunk-${i}`);
  
  // Store the original document's name and ID in the metadata for citations and filtering.
  const metadatas = chunks.map(() => ({ documentName: doc.name, documentId: doc.id }));

  // Add the chunks, embeddings, and metadata to the collection.
  onStatusUpdate("Adding to knowledge base...");
  await collection.add({
    ids: ids,
    embeddings: embeddings,
    documents: chunks,
    metadatas: metadatas,
  });
};

/**
 * Queries the vector collection for relevant text chunks.
 * Can be filtered to search only within specific documents.
 * @param projectId - The project's collection to query.
 * @param queryText - The user's query text.
 * @param nResults - The number of results to return.
 * @param docIdsToFilter - Optional array of document IDs to filter the search by.
 * @returns A promise that resolves to an object containing the retrieved chunks and their metadata.
 */
export const queryCollection = async (
  projectId: string, 
  queryText: string, 
  nResults: number = 5,
  docIdsToFilter?: string[]
): Promise<{chunks: string[], metadatas: any[]}> => {
  try {
    const collection = await getOrCreateCollection(projectId);
    const queryEmbeddingResult = await embedText([queryText]);

    if (!queryEmbeddingResult || queryEmbeddingResult.length === 0) {
      console.warn("Could not generate embedding for query text.");
      return { chunks: [], metadatas: [] };
    }
    
    const queryEmbedding = queryEmbeddingResult[0];

    // Build a filter object if document IDs are provided.
    const whereFilter = (docIdsToFilter && docIdsToFilter.length > 0)
      ? { documentId: { "$in": docIdsToFilter } } 
      : undefined;

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: nResults,
      where: whereFilter, // Apply the filter here
    });

    const chunks = results.documents?.[0] ?? [];
    const metadatas = results.metadatas?.[0] ?? [];
    
    return { chunks, metadatas };
  } catch (error) {
    console.error("Failed to query collection from ChromaDB:", error);
    return { chunks: [], metadatas: [] }; // Return empty on failure
  }
};