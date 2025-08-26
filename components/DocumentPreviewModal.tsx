
import React from 'react';
import type { Document } from '../types';

interface DocumentPreviewModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onAttach: (docId: string) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ document, isOpen, onClose, onAttach }) => {
  if (!isOpen || !document) return null;

  const handleAttachClick = () => {
    onAttach(document.id);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6 relative"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h2 className="text-xl font-bold mb-1 text-white pr-8">{document.name}</h2>
        <p className="text-xs text-gray-500 mb-4">
          Created: {new Date(document.createdAt).toLocaleDateString()}
        </p>

        <div className="max-h-64 overflow-y-auto pr-2 mb-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">AI Summary</h3>
            <p className="text-gray-300 whitespace-pre-wrap">
              {document.summary || "No summary available."}
            </p>
        </div>

        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-md transition-colors hover:bg-gray-500"
          >
            Close
          </button>
          <button 
            onClick={handleAttachClick}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md transition-colors hover:bg-blue-500"
          >
            Attach to Chat
          </button>
        </div>
      </div>
    </div>
  );
};
