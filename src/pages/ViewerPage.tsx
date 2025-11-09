import React, { useEffect, useState } from "react";
import { SimpleAnnotationProvider } from "../annotation/SimpleAnnotationProvider";
import { useParams, Link } from "react-router-dom";
import { listDocuments } from "../api/serverApi";
import type { ServerDocMeta } from "../api/serverApi";
import { useUser } from "../context/UserContext";
import { IoArrowBackCircleSharp } from "react-icons/io5";
import UserSwitcher from "../components/UserSwitcher";

const ViewerPage: React.FC = () => {
  const { id } = useParams();
  const [doc, setDoc] = useState<ServerDocMeta | null>(null);
  const { current } = useUser();

  useEffect(() => {
    (async () => {
      if (!id) return;
      const docs = await listDocuments(current);
      const d = docs.find((x) => x._id === id) || null;
      setDoc(d);
    })();
  }, [id]);

  return (
    <div className="h-screen flex flex-col items-center bg-gray-50">
      <div className="w-full flex items-center justify-between px-2 py-2 sm:px-4 sm:py-3 border-b border-gray-200 bg-white shadow-sm flex-shrink-0">
        <div className="flex items-center gap-1 sm:gap-3 flex-1 min-w-0">
          <Link
            to="/"
            className="p-1 sm:p-1.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0"
            title="Back to Documents"
          >
            <IoArrowBackCircleSharp className="text-2xl sm:text-3xl text-gray-700" />
          </Link>
          <h2 className="text-sm sm:text-lg md:text-xl font-semibold text-gray-800 truncate">
            {doc?.name || "Viewer"}
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <UserSwitcher />
        </div>
      </div>

      {!doc && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-sm sm:text-base text-gray-600">Loading...</p>
          </div>
        </div>
      )}
      {doc && (
        <div className="flex-1 overflow-hidden w-full">
          <SimpleAnnotationProvider docId={doc._id} />
        </div>
      )}
    </div>
  );
};

export default ViewerPage;
