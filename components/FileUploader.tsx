import React, { useState, useCallback } from 'react';
import { saveDocument } from '../services/dbService';
import { generateSummary } from '../services/geminiService';
import { addDocumentToCollection } from '../services/vectorDBService';
import type { Document } from '../types';

interface FileUploaderProps {
  onUploadSuccess: () => void;
  projectId: string;
}

const UploadIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const SpinnerIcon: React.FC = () => (
    <svg className="animate-spin h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


export const FileUploader: React.FC<FileUploaderProps> = ({ onUploadSuccess, projectId }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  const handleFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = (e.target?.result as string)?.split(',')[1]; // Get base64 content
      if (content) {
        try {
          setProcessingMessage('Summarizing document...');
          const summary = await generateSummary(content, file.type);
          
          const newDoc: Document = {
            id: `doc-${Date.now()}`,
            name: file.name,
            content: content,
            mimeType: file.type,
            createdAt: new Date().toISOString(),
            projectId: projectId,
            summary: summary,
          };
          saveDocument(newDoc);
          
          setProcessingMessage('Indexing document for search...');
          await addDocumentToCollection(projectId, newDoc);

          onUploadSuccess();
        } catch (error) {
          console.error("Failed to process and index file:", error);
          setProcessingMessage('An error occurred during processing.');
          // Keep the error message for a few seconds before resetting
          setTimeout(() => setIsProcessing(false), 3000);
          return;
        }
      } else {
        setProcessingMessage('Could not read file content.');
        setTimeout(() => setIsProcessing(false), 3000);
        return;
      }
      setIsProcessing(false);
    };
    reader.onerror = () => {
        console.error("Failed to read file.");
        setProcessingMessage('An error occurred while reading the file.');
        setTimeout(() => setIsProcessing(false), 3000);
    }
    reader.readAsDataURL(file);
  }, [onUploadSuccess, projectId]);

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!isProcessing && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  }

  return (
    <label
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center w-full p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
        isProcessing ? 'cursor-not-allowed bg-gray-800 border-gray-600' :
        isDragging ? 'border-blue-500 bg-gray-800' : 'border-gray-600 hover:bg-gray-800'
      }`}
    >
      {isProcessing ? (
          <>
            <SpinnerIcon />
            <p className="mt-2 text-sm text-gray-400">{processingMessage}</p>
          </>
      ) : (
          <>
            <UploadIcon />
            <p className="mt-2 text-sm text-gray-400">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
          </>
      )}
      <input type="file" className="hidden" onChange={handleFileChange} disabled={isProcessing}/>
    </label>
  );
};