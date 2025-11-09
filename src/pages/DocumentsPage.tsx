import React from 'react';
import UserSwitcher from '../components/UserSwitcher';
import UploadForm from '../components/UploadForm';
import DocumentList from '../components/DocumentList';

const DocumentsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">Docscribe</h1>
          <UserSwitcher />
        </div>

        <div className="mb-4 sm:mb-6">
          <UploadForm onUploaded={() => window.location.reload()} />
        </div>

        <DocumentList />
      </div>
    </div>
  );
};

export default DocumentsPage;
