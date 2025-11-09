import React, { useEffect, useState } from "react";
import {
  listDocuments,
  type ServerDocMeta,
  deleteDocument,
} from "../api/serverApi";
import { useUser } from "../context/UserContext";
import { Link } from "react-router-dom";
import { FaRegUser } from "react-icons/fa";
import { PiFilePdfDuotone } from "react-icons/pi";
import { FiSearch } from "react-icons/fi";
import { TiArrowUnsorted } from "react-icons/ti";

const DocumentList: React.FC = () => {
  const [docs, setDocs] = useState<ServerDocMeta[]>([]);
  const [_selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<
    "name" | "size" | "date" | "uploader"
  >("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { current } = useUser();

  const load = async () => {
    const d = await listDocuments(current);
    setDocs([...d].reverse());
  };

  useEffect(() => {
    load();
  }, []);

  const handleSort = (field: "name" | "size" | "date" | "uploader") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleDelete = async (docId: string, docName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${docName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const success = await deleteDocument(docId, current);
      console.log(success);
      if (success) {
        setDocs((prevDocs) => prevDocs.filter((d) => d._id !== docId));
        setSelectedDocs((prevSelected) => {
          const newSelected = new Set(prevSelected);
          newSelected.delete(docId);
          return newSelected;
        });
      } else {
        alert("Failed to delete document. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("An error occurred while deleting the document.");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const sortedDocs = [...docs].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "size":
        const sizeA = a.fileSize || 0;
        const sizeB = b.fileSize || 0;
        comparison = sizeA - sizeB;
        break;
      case "date":
        comparison =
          new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
        break;
      case "uploader":
        comparison = a.uploaderId.localeCompare(b.uploaderId);
        break;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  const filteredDocs = sortedDocs.filter((doc) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      doc.name.toLowerCase().includes(query) ||
      doc.uploaderId.toLowerCase().includes(query) ||
      new Date(doc.uploadDate).toLocaleDateString("en-US").includes(query)
    );
  });

  return (
    <div className="space-y-3 sm:space-y-4 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 sm:gap-4 items-center mb-2">
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">Uploaded Files</p>
              <span className="bg-purple-100 rounded-full px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-semibold text-purple-700">
                {filteredDocs.length} {searchQuery.trim() ? "Found" : "Total"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600">
              {current.role === "A1"
                ? "As an Admin, you can manage all uploaded documents."
                : current.role === "D1" || current.role === "D2"
                ? "Add annotations to uploaded documents"
                : "View documents in read-only mode"}
            </p>
          </div>
          
          {/* Search - Full width on mobile */}
          <div className="w-full sm:w-auto">
            <div className="border-gray-300 rounded-lg overflow-hidden flex border bg-white">
              <input
                type="text"
                placeholder="Search..."
                className="text-xs sm:text-sm border-none outline-none px-3 sm:px-4 py-2 sm:py-2.5 w-full sm:w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm sm:text-base font-semibold text-gray-700">
            Attached Files
          </h3>
        </div>

        {docs.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-gray-400">
            <PiFilePdfDuotone className="text-4xl sm:text-6xl mx-auto mb-3 text-gray-300" />
            <p className="text-base sm:text-lg font-medium">No documents yet.</p>
            <p className="text-xs sm:text-sm mt-1">Upload your first PDF to get started</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-gray-400">
            <FiSearch className="text-4xl sm:text-6xl mx-auto mb-3 text-gray-300" />
            <p className="text-base sm:text-lg font-medium">No documents found</p>
            <p className="text-xs sm:text-sm mt-1">Try a different search term</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block border border-gray-200 rounded-lg overflow-hidden bg-white">
              <div className="bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-12 gap-4 px-4 lg:px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  <div className="col-span-4 flex items-center gap-2">
                    <span
                      className="flex items-center gap-1 cursor-pointer hover:text-gray-800"
                      onClick={() => handleSort("name")}
                    >
                      File Name
                      <TiArrowUnsorted
                        className={`text-base transition-colors ${
                          sortField === "name" ? "text-black" : ""
                        }`}
                        style={{
                          transform:
                            sortField === "name" && sortDirection === "desc"
                              ? "scaleY(-1)"
                              : "none",
                        }}
                      />
                    </span>
                  </div>
                  <div
                    className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-gray-800"
                    onClick={() => handleSort("size")}
                  >
                    <span className="text-xs">Size</span>
                    <TiArrowUnsorted
                      className={`text-base transition-colors ${
                        sortField === "size" ? "text-black" : ""
                      }`}
                      style={{
                        transform:
                          sortField === "size" && sortDirection === "desc"
                            ? "scaleY(-1)"
                            : "none",
                      }}
                    />
                  </div>
                  <div
                    className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-gray-800"
                    onClick={() => handleSort("date")}
                  >
                    <span className="text-xs">Date</span>
                    <TiArrowUnsorted
                      className={`text-base transition-colors ${
                        sortField === "date" ? "text-black" : ""
                      }`}
                      style={{
                        transform:
                          sortField === "date" && sortDirection === "desc"
                            ? "scaleY(-1)"
                            : "none",
                      }}
                    />
                  </div>
                  <div
                    className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-gray-800"
                    onClick={() => handleSort("uploader")}
                  >
                    <span>Uploader</span>
                    <TiArrowUnsorted
                      className={`text-base transition-colors ${
                        sortField === "uploader" ? "text-black" : ""
                      }`}
                      style={{
                        transform:
                          sortField === "uploader" && sortDirection === "desc"
                            ? "scaleY(-1)"
                            : "none",
                      }}
                    />
                  </div>
                  <div className="col-span-2 text-right">
                    <span>Actions</span>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {filteredDocs.map((d) => (
                  <div
                    key={d._id}
                    className="grid grid-cols-12 gap-4 px-4 lg:px-6 py-4 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="col-span-4 flex items-center gap-3">
                      <PiFilePdfDuotone className="text-3xl text-red-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">
                          {d.name}
                        </p>
                        <p className="text-xs text-gray-500">PDF</p>
                      </div>
                    </div>

                    <div className="col-span-2 flex items-center">
                      <span className="text-sm text-gray-600">
                        {formatFileSize(d.fileSize || 0)}
                      </span>
                    </div>

                    <div className="col-span-2 flex items-center">
                      <span className="text-sm text-gray-600">
                        {new Date(d.uploadDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="col-span-2 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-black/80 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                        <FaRegUser />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {d.uploaderId}
                        </p>
                      </div>
                    </div>

                    <div className="col-span-2 flex items-center justify-end gap-2">
                      {current.role === "A1" && (
                        <button
                          onClick={() => handleDelete(d._id, d.name)}
                          className="text-red-600 hover:text-white hover:bg-red-600 px-2.5 py-1.5 rounded-md transition-all text-sm font-semibold"
                          title="Delete"
                        >
                          Delete
                        </button>
                      )}
                      <Link
                        to={`/viewer/${d._id}`}
                        className="text-black hover:text-white hover:bg-black px-2.5 py-1.5 rounded-md transition-all text-sm font-semibold"
                        title="View/Annotate"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {filteredDocs.map((d) => (
                <div
                  key={d._id}
                  className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow"
                >
                  {/* File Info */}
                  <div className="flex items-start gap-3 mb-3">
                    <PiFilePdfDuotone className="text-4xl text-red-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm mb-1 truncate">
                        {d.name}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Size:</span>
                          {formatFileSize(d.fileSize || 0)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Date:</span>
                          {new Date(d.uploadDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-6 h-6 rounded-full bg-black/80 flex items-center justify-center text-white text-[10px]">
                          <FaRegUser />
                        </div>
                        <span className="text-xs text-gray-600 font-medium">
                          {d.uploaderId}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <Link
                      to={`/viewer/${d._id}`}
                      className="flex-1 text-center bg-black text-white hover:bg-gray-800 px-4 py-2 rounded-lg transition-all text-sm font-semibold"
                    >
                      View
                    </Link>
                    {current.role === "A1" && (
                      <button
                        onClick={() => handleDelete(d._id, d.name)}
                        className="flex-1 text-center bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-4 py-2 rounded-lg transition-all text-sm font-semibold"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DocumentList;
