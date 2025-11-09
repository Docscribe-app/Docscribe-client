import React from "react";
import { Routes, Route } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import DocumentsPage from "./pages/DocumentsPage";
import ViewerPage from "./pages/ViewerPage";

const App: React.FC = () => {
  return (
    <UserProvider>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <Routes>
          <Route path="/" element={<DocumentsPage />} />
          <Route path="/viewer/:id" element={<ViewerPage />} />
          <Route
            path="*"
            element={
              <div className="bg-black h-screen flex flex-col items-center justify-center w-full">
                <h2 className="text-center text-white text-2xl font-semibold">
                  404
                </h2>
                <p className="text-center text-white mt-2">Page Not Found</p>
                <button
                  className="mt-4 px-4 py-2 bg-white text-black rounded"
                  onClick={() => (window.location.href = "/")}
                >
                  Go to Home
                </button>
              </div>
            }
          />
        </Routes>
      </div>
    </UserProvider>
  );
};

export default App;
