import React, { useState, useRef } from "react";
import { useUser } from "../context/UserContext";
import { uploadDocuments } from "../api/serverApi";
import { PiFilePdfDuotone } from "react-icons/pi";
import { HiOutlineX } from "react-icons/hi";

const UploadForm: React.FC<{ onUploaded?: () => void }> = ({ onUploaded }) => {
  const { current } = useUser();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUpload = current.role === "A1";

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const pdfFiles = Array.from(fileList).filter(
      (file) => file.type === "application/pdf"
    );
    setFiles((prev) => [...prev, ...pdfFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0) return;
    setLoading(true);
    try {
      await uploadDocuments(files, current);
      setFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onUploaded?.();
    } catch (error) {
      // Remove files on upload failure
      setFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      console.error("Upload failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  if (!canUpload) return null;

  return (
    <div className="w-full border border-black/20 rounded-2xl font-poppins">
      <form onSubmit={submit} className="flex gap-2 items-center w-full">
        <input
          type="file"
          accept="application/pdf"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          hidden
          ref={fileInputRef}
        />
        <div
          className={`flex flex-col justify-center items-center w-full py-6 transition-all ${
            isDragging ? "bg-purple-50 border-2 border-dashed border-purple-400" : ""
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="rounded-full aspect-square p-4 flex items-center justify-center bg-purple-100 mb-3">
            <PiFilePdfDuotone className="text-2xl text-black" />
          </div>
          <p className="text-black font-poppins">
            <span
              className="text-purple-700 font-semibold cursor-pointer hover:underline"
              onClick={() => fileInputRef.current?.click()}
            >
              Click here
            </span>{" "}
            to upload your files or drag and drop.
          </p>
          <p className="text-sm text-black/70 mt-1">
            Supported formats: PDF (10MB max)
          </p>

          {files && files.length > 0 && (
            <div className="mt-4 w-full max-w-2xl px-4">
              {/* File List */}
              <div className="mb-3 space-y-2 max-h-48 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2 hover:border-purple-300 transition-all group"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <PiFilePdfDuotone className="text-xl text-red-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">
                        {file.name}
                      </span>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      disabled={loading}
                      className="ml-2 p-1 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove file"
                    >
                      <HiOutlineX className="text-lg" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                  {loading
                    ? "Uploading..."
                    : `Upload ${files.length} file${files.length > 1 ? "s" : ""}`}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default UploadForm;
