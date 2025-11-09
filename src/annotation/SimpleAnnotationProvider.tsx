import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useUser } from "../context/UserContext";
import { getFileUrl } from "../api/serverApi";
import { http } from "../api/http";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { FaRegCircle } from "react-icons/fa6";
import { PiHighlighterDuotone, PiRectangleLight } from "react-icons/pi";
import { MdOutlineDraw } from "react-icons/md";
import { TbScribble, TbScribbleOff } from "react-icons/tb";
import { IoMdClose } from "react-icons/io";
import { LiaCommentSolid } from "react-icons/lia";
import { HiOutlineTrash } from "react-icons/hi2";
import { BsFileText } from "react-icons/bs";
import { BiMessageSquareDetail } from "react-icons/bi";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { CgSpinnerTwo } from "react-icons/cg";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs`;

type Tool = "highlight" | "draw" | "rectangle" | "circle";

interface Annotation {
  _id: string;
  page: number;
  kind: string;
  color: string;
  rect?: { x: number; y: number; w: number; h: number };
  path?: { x: number; y: number }[];
  x?: number;
  y?: number;
  note?: string;
  shape?: string;
  creatorId?: string;
}

// Memoized Page component to prevent unnecessary rerenders
const MemoizedPage = React.memo(Page, (prevProps, nextProps) => {
  return (
    prevProps.pageNumber === nextProps.pageNumber &&
    prevProps.width === nextProps.width &&
    prevProps.renderTextLayer === nextProps.renderTextLayer
  );
});

// Memoized SVG annotation renderer
interface AnnotationRendererProps {
  annotations: Annotation[];
  pageNumber: number;
  width: number;
  height: number;
  handleAnnotationClick: (id: string) => void;
  setSelectedAnnotation: (id: string) => void;
}

const AnnotationRenderer = React.memo<AnnotationRendererProps>(
  ({
    annotations,
    pageNumber,
    width,
    height,
    handleAnnotationClick,
    setSelectedAnnotation,
  }) => {
    const pageAnnotations = useMemo(
      () => annotations.filter((ann) => ann.page === pageNumber),
      [annotations, pageNumber]
    );

    return (
      <>
        {pageAnnotations.map((ann) => {
          const annotationColor = ann.color || "#FFEB3B";

          if (ann.kind === "freehand" && ann.path) {
            const pathD = ann.path
              .map(
                (p, i) =>
                  `${i === 0 ? "M" : "L"} ${(p.x / 100) * width} ${
                    (p.y / 100) * height
                  }`
              )
              .join(" ");
            return (
              <path
                key={ann._id}
                d={pathD}
                stroke={annotationColor}
                strokeWidth="2"
                fill="none"
                onClick={() => setSelectedAnnotation(ann._id)}
                style={{ cursor: "pointer" }}
              />
            );
          }
          if (ann.rect) {
            const x = (ann.rect.x / 100) * width;
            const y = (ann.rect.y / 100) * height;
            const w = (ann.rect.w / 100) * width;
            const h = (ann.rect.h / 100) * height;

            if (ann.kind === "shape" && ann.shape === "ellipse") {
              return (
                <ellipse
                  key={ann._id}
                  cx={x + w / 2}
                  cy={y + h / 2}
                  rx={w / 2}
                  ry={h / 2}
                  fill={annotationColor + "40"}
                  stroke={annotationColor}
                  strokeWidth="2"
                  onClick={() => handleAnnotationClick(ann._id)}
                  style={{ cursor: "pointer" }}
                />
              );
            }
            if (ann.kind === "highlight") {
              return (
                <rect
                  key={ann._id}
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill={annotationColor + "30"}
                  stroke="none"
                  onClick={() => handleAnnotationClick(ann._id)}
                  style={{
                    cursor: "pointer",
                    pointerEvents: "all",
                  }}
                />
              );
            }
            return (
              <rect
                key={ann._id}
                x={x}
                y={y}
                width={w}
                height={h}
                fill={annotationColor + "40"}
                stroke={annotationColor}
                strokeWidth="2"
                onClick={() => handleAnnotationClick(ann._id)}
                style={{ cursor: "pointer" }}
              />
            );
          }
          if (ann.kind === "point" && ann.x != null && ann.y != null) {
            return (
              <g key={ann._id}>
                <circle
                  cx={(ann.x / 100) * width}
                  cy={(ann.y / 100) * height}
                  r="8"
                  fill={annotationColor}
                  onClick={() => setSelectedAnnotation(ann._id)}
                  style={{ cursor: "pointer" }}
                />
                {ann.note && (
                  <text
                    x={(ann.x / 100) * width + 12}
                    y={(ann.y / 100) * height + 4}
                    fontSize="12"
                    fill="#000"
                    style={{
                      background: "white",
                      padding: "2px",
                    }}
                  >
                    {ann.note}
                  </text>
                )}
              </g>
            );
          }
          return null;
        })}
      </>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.annotations === nextProps.annotations &&
      prevProps.pageNumber === nextProps.pageNumber &&
      prevProps.width === nextProps.width &&
      prevProps.height === nextProps.height &&
      prevProps.handleAnnotationClick === nextProps.handleAnnotationClick &&
      prevProps.setSelectedAnnotation === nextProps.setSelectedAnnotation
    );
  }
);

// Memoized single page with annotations
interface PDFPageWithAnnotationsProps {
  pageNumber: number;
  width: number;
  height: number;
  currentTool: Tool;
  currentColor: string;
  annotations: Annotation[];
  isDrawing: boolean;
  drawPath: { x: number; y: number }[];
  previewRect: { x: number; y: number; w: number; h: number } | null;
  handleMouseDown: (
    e: React.MouseEvent<SVGSVGElement>,
    pageNum: number
  ) => void;
  handleMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
  handleMouseUp: (e: React.MouseEvent<SVGSVGElement>) => void;
  handleMouseLeave: () => void;
  handleAnnotationClick: (id: string) => void;
  setSelectedAnnotation: (id: string) => void;
}

const PDFPageWithAnnotations = React.memo<PDFPageWithAnnotationsProps>(
  ({
    pageNumber,
    width,
    height,
    currentTool,
    currentColor,
    annotations,
    isDrawing,
    drawPath,
    previewRect,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleAnnotationClick,
    setSelectedAnnotation,
  }) => {
    return (
      <div
        className="relative my-4 mx-auto border rounded-lg overflow-hidden"
        style={{
          width,
          userSelect: currentTool === "highlight" ? "text" : "none",
        }}
        data-page-number={pageNumber}
      >
        <div
          style={{
            pointerEvents: currentTool === "highlight" ? "auto" : "none",
          }}
        >
          <MemoizedPage
            pageNumber={pageNumber}
            width={width}
            className="rounded-lg"
            renderTextLayer={true}
            renderAnnotationLayer={false}
          />
        </div>

        {/* SVG Overlay for this page */}
        <svg
          width={width}
          height={height}
          className="absolute top-0 left-0"
          style={{
            cursor: currentTool === "highlight" ? "text" : "crosshair",
            zIndex: 10,
            pointerEvents: currentTool === "highlight" ? "none" : "auto",
          }}
          onMouseDown={(e) => handleMouseDown(e, pageNumber)}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {/* Render saved annotations for this page */}
          <AnnotationRenderer
            annotations={annotations}
            pageNumber={pageNumber}
            width={width}
            height={height}
            handleAnnotationClick={handleAnnotationClick}
            setSelectedAnnotation={setSelectedAnnotation}
          />

          {/* Preview while drawing */}
          {isDrawing && drawPath.length > 1 && currentTool === "draw" && (
            <path
              d={drawPath
                .map(
                  (p, i) =>
                    `${i === 0 ? "M" : "L"} ${(p.x / 100) * width} ${
                      (p.y / 100) * height
                    }`
                )
                .join(" ")}
              stroke={currentColor}
              strokeWidth="2"
              fill="none"
            />
          )}
          {previewRect &&
            (currentTool === "circle" ? (
              <ellipse
                cx={
                  (previewRect.x / 100) * width +
                  ((previewRect.w / 100) * width) / 2
                }
                cy={
                  (previewRect.y / 100) * height +
                  ((previewRect.h / 100) * height) / 2
                }
                rx={((previewRect.w / 100) * width) / 2}
                ry={((previewRect.h / 100) * height) / 2}
                fill={currentColor + "40"}
                stroke={currentColor}
                strokeWidth="2"
              />
            ) : (
              <rect
                x={(previewRect.x / 100) * width}
                y={(previewRect.y / 100) * height}
                width={(previewRect.w / 100) * width}
                height={(previewRect.h / 100) * height}
                fill={currentColor + "40"}
                stroke={currentColor}
                strokeWidth="2"
              />
            ))}
        </svg>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Only rerender if these specific props change
    return (
      prevProps.pageNumber === nextProps.pageNumber &&
      prevProps.width === nextProps.width &&
      prevProps.height === nextProps.height &&
      prevProps.currentTool === nextProps.currentTool &&
      prevProps.currentColor === nextProps.currentColor &&
      prevProps.annotations === nextProps.annotations &&
      prevProps.isDrawing === nextProps.isDrawing &&
      prevProps.drawPath === nextProps.drawPath &&
      prevProps.previewRect === nextProps.previewRect &&
      prevProps.handleMouseDown === nextProps.handleMouseDown &&
      prevProps.handleMouseMove === nextProps.handleMouseMove &&
      prevProps.handleMouseUp === nextProps.handleMouseUp &&
      prevProps.handleMouseLeave === nextProps.handleMouseLeave &&
      prevProps.handleAnnotationClick === nextProps.handleAnnotationClick &&
      prevProps.setSelectedAnnotation === nextProps.setSelectedAnnotation
    );
  }
);

export const SimpleAnnotationProvider: React.FC<{ docId: string }> = ({
  docId,
}) => {
  const { current } = useUser();
  const [numPages, setNumPages] = useState(1);
  const [pageWidth, setPageWidth] = useState(800);
  const [zoom, setZoom] = useState(1);
  const [currentTool, setCurrentTool] = useState<Tool>("highlight");
  const [currentColor, setCurrentColor] = useState("#FFEB3B");
  const [selectedRoles, setSelectedRoles] = useState<string[] | "all">("all");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPath, setDrawPath] = useState<{ x: number; y: number }[]>([]);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [previewRect, setPreviewRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(
    null
  );
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<
    Record<
      string,
      Array<{ _id: string; text: string; author: string; createdAt: string }>
    >
  >({});
  const [isCreatingHighlight, setIsCreatingHighlight] = useState(false);
  const [mobileAnnotationsOpen, setMobileAnnotationsOpen] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);

  const loadAnnotations = useCallback(async () => {
    try {
      const res = await http.get(`/api/annotations/document/${docId}`, {
        headers: { "x-user-id": current.id, "x-user-role": current.role },
      });
      setAnnotations(res.data || []);

      // Load comments for all annotations
      const annotationsData = res.data || [];
      for (const ann of annotationsData) {
        if (ann.kind !== "highlight") {
          try {
            const commentsRes = await http.get(
              `/api/annotations/${ann._id}/comments`,
              {
                headers: {
                  "x-user-id": current.id,
                  "x-user-role": current.role,
                },
              }
            );
            setComments((prev) => ({
              ...prev,
              [ann._id]: commentsRes.data,
            }));
          } catch (err) {
            console.error(
              `Failed to load comments for annotation ${ann._id}:`,
              err
            );
          }
        }
      }
    } catch (err) {
      console.error("Failed to load annotations:", err);
    }
  }, [docId, current.id, current.role]);

  useEffect(() => {
    loadAnnotations();
  }, [loadAnnotations]);

  // Reset selected annotation and comments when user changes
  useEffect(() => {
    setSelectedAnnotation("");
    setShowCommentsPanel(false);
    setComments({});
  }, [current.id]);

  const getPageDimensions = useCallback(() => {
    const width = Math.min(1280, Math.max(360, pageWidth * zoom));
    const height = width * 1.414; // A4 ratio
    return { width, height };
  }, [pageWidth, zoom]);

  // Capture text selection for highlights
  const handleTextSelection = useCallback(async () => {
    if (currentTool !== "highlight") return;

    if (isCreatingHighlight) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (!text) return;

    if (text.length > 500) {
      selection.removeAllRanges();
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const { height } = getPageDimensions();
    if (rect.height > height * 0.5) {
      selection.removeAllRanges();
      return;
    }

    setIsCreatingHighlight(true);
    const container = scrollRef.current;

    if (container) {
      const pages = container.querySelectorAll("[data-page-number]");

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;
        const pageRect = pageEl.getBoundingClientRect();

        if (rect.top >= pageRect.top && rect.top <= pageRect.bottom) {
          const targetPage = parseInt(
            pageEl.getAttribute("data-page-number") || "1"
          );

          const { width, height } = getPageDimensions();

          const canvas = pageEl.querySelector("canvas");
          const canvasRect = canvas ? canvas.getBoundingClientRect() : pageRect;

          const relativeX = ((rect.left - canvasRect.left) / width) * 100;
          const relativeY = ((rect.top - canvasRect.top) / height) * 100;
          const relativeW = (rect.width / width) * 100;
          const relativeH = (rect.height / height) * 100;

          const payload: any = {
            page: targetPage,
            note: text,
            visibility: selectedRoles === "all" ? "all" : selectedRoles,
            color: currentColor,
            kind: "highlight",
            rect: {
              x: relativeX,
              y: relativeY,
              w: relativeW,
              h: relativeH,
            },
          };

          try {
            const res = await http.post(
              `/api/annotations/document/${docId}`,
              payload,
              {
                headers: {
                  "x-user-id": current.id,
                  "x-user-role": current.role,
                },
              }
            );

            const createdAnnotation = {
              ...res.data,
              color: res.data.color || currentColor,
            };

            setAnnotations((prev) => [...prev, createdAnnotation]);
          } catch (err) {
            console.error("Failed to create highlight:", err);
          } finally {
            setIsCreatingHighlight(false);
          }

          break;
        }
      }
    }

    selection.removeAllRanges();
    setIsCreatingHighlight(false);
  }, [
    currentTool,
    isCreatingHighlight,
    getPageDimensions,
    scrollRef,
    currentColor,
    selectedRoles,
    docId,
    current.id,
    current.role,
  ]);

  useEffect(() => {
    if (currentTool === "highlight") {
      document.addEventListener("mouseup", handleTextSelection);
      return () => document.removeEventListener("mouseup", handleTextSelection);
    }
  }, [currentTool, handleTextSelection]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const setWidth = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setPageWidth(el.clientWidth - 24);
      }, 50); // Debounce by 50ms
    };

    setWidth();
    const ro = new ResizeObserver(() => setWidth());
    ro.observe(el);
    return () => {
      ro.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);

  // Memoize dimensions
  const dimensions = useMemo(() => getPageDimensions(), [getPageDimensions]);

  // Helper to toggle role selection
  const toggleRole = (role: string) => {
    if (role === "all") {
      if (selectedRoles === "all") {
        // Unchecking "Everyone" - switch to empty array
      } else {
        setSelectedRoles("all");
      }
    } else {
      if (selectedRoles === "all") {
        setSelectedRoles([role]);
      } else {
        if (selectedRoles.includes(role)) {
          const newRoles = selectedRoles.filter((r: string) => r !== role);
          setSelectedRoles(newRoles);
        } else {
          const newRoles = [...selectedRoles, role];
          setSelectedRoles(newRoles);
        }
      }
    }
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>, pageNum: number) => {
      if (currentTool === "highlight") return;

      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      setIsDrawing(true);
      setStartPos({ x, y });
      setCurrentPage(pageNum);

      if (currentTool === "draw") {
        setDrawPath([{ x, y }]);
      }
    },
    [currentTool]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isDrawing || !startPos) return;

      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      if (currentTool === "draw") {
        setDrawPath((prev) => [...prev, { x, y }]);
      } else if (
        currentTool === "rectangle" ||
        currentTool === "circle" ||
        currentTool === "highlight"
      ) {
        setPreviewRect({
          x: Math.min(startPos.x, x),
          y: Math.min(startPos.y, y),
          w: Math.abs(x - startPos.x),
          h: Math.abs(y - startPos.y),
        });
      }
    },
    [isDrawing, startPos, currentTool]
  );

  const createAnnotation = useCallback(
    async (endX: number, endY: number) => {
      if (!startPos) return;

      let payload: any = {
        page: currentPage,
        note: "",
        visibility: selectedRoles === "all" ? "all" : selectedRoles,
        color: currentColor,
      };

      if (currentTool === "draw" && drawPath.length > 0) {
        payload.kind = "freehand";
        payload.path = drawPath;
        const xs = drawPath.map((p) => p.x);
        const ys = drawPath.map((p) => p.y);
        payload.rect = {
          x: Math.min(...xs),
          y: Math.min(...ys),
          w: Math.max(...xs) - Math.min(...xs),
          h: Math.max(...ys) - Math.min(...ys),
        };
      } else if (currentTool === "rectangle" && startPos) {
        payload.kind = "shape";
        payload.shape = "rect";
        payload.rect = {
          x: Math.min(startPos.x, endX),
          y: Math.min(startPos.y, endY),
          w: Math.abs(endX - startPos.x),
          h: Math.abs(endY - startPos.y),
        };
      } else if (currentTool === "circle" && startPos) {
        payload.kind = "shape";
        payload.shape = "ellipse";
        payload.rect = {
          x: Math.min(startPos.x, endX),
          y: Math.min(startPos.y, endY),
          w: Math.abs(endX - startPos.x),
          h: Math.abs(endY - startPos.y),
        };
      }

      try {
        const res = await http.post(
          `/api/annotations/document/${docId}`,
          payload,
          {
            headers: { "x-user-id": current.id, "x-user-role": current.role },
          }
        );

        const createdAnnotation = {
          ...res.data,
          color: res.data.color || currentColor, // Fallback to our selected color if backend doesn't return it
        };

        setAnnotations((prev) => {
          const newAnnotations = [...prev, createdAnnotation];
          return newAnnotations;
        });
      } catch (err) {
        console.error("Failed to create annotation:", err);
      }

      setIsDrawing(false);
      setDrawPath([]);
      setStartPos(null);
      setPreviewRect(null);
    },
    [
      startPos,
      currentPage,
      selectedRoles,
      currentColor,
      currentTool,
      drawPath,
      docId,
      current.id,
      current.role,
    ]
  );

  const handleMouseUp = useCallback(
    async (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isDrawing || !startPos) return;
      if (currentTool === "highlight") return; // Handled by text selection

      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const endX = ((e.clientX - rect.left) / rect.width) * 100;
      const endY = ((e.clientY - rect.top) / rect.height) * 100;

      // Calculate the distance/size to check if it's a meaningful annotation
      const distance = Math.sqrt(
        Math.pow(endX - startPos.x, 2) + Math.pow(endY - startPos.y, 2)
      );

      // Only create annotation if there's meaningful movement (threshold: 1% of canvas)
      // For draw tool, check if there are multiple points
      if (currentTool === "draw") {
        if (drawPath.length > 2) {
          await createAnnotation(endX, endY);
        } else {
          // Reset drawing state for single clicks
          setIsDrawing(false);
          setDrawPath([]);
          setStartPos(null);
          setPreviewRect(null);
        }
      } else if (currentTool === "rectangle" || currentTool === "circle") {
        // For shapes, require minimum size
        if (distance > 1) {
          await createAnnotation(endX, endY);
        } else {
          // Reset drawing state for single clicks
          setIsDrawing(false);
          setDrawPath([]);
          setStartPos(null);
          setPreviewRect(null);
        }
      }
    },
    [isDrawing, startPos, currentTool, createAnnotation]
  );

  const deleteAnnotation = useCallback(
    async (id: string) => {
      try {
        await http.delete(`/api/annotations/${id}`, {
          headers: { "x-user-id": current.id, "x-user-role": current.role },
        });
        setAnnotations((prev) => prev.filter((a) => a._id !== id));
        if (selectedAnnotation === id) {
          setSelectedAnnotation(null);
          setShowCommentsPanel(false);
        }
        setComments((prev) => {
          const newComments = { ...prev };
          delete newComments[id];
          return newComments;
        });
      } catch (err) {
        console.error("Failed to delete annotation:", err);
      }
    },
    [current.id, current.role, selectedAnnotation]
  );

  const loadComments = useCallback(
    async (annotationId: string) => {
      try {
        const res = await http.get(
          `/api/annotations/${annotationId}/comments`,
          {
            headers: { "x-user-id": current.id, "x-user-role": current.role },
          }
        );
        setComments((prev) => ({
          ...prev,
          [annotationId]: res.data,
        }));
      } catch (err) {
        console.error("Failed to load comments:", err);
      }
    },
    [current.id, current.role]
  );

  const handleAnnotationClick = useCallback(
    async (annotationId: string) => {
      setSelectedAnnotation(annotationId);
      setShowCommentsPanel(true);

      // Load comments for this annotation
      await loadComments(annotationId);
    },
    [loadComments]
  );

  const addComment = useCallback(async () => {
    if (!selectedAnnotation || !newComment.trim()) return;

    try {
      const payload = {
        text: newComment.trim(),
        author: current.id,
        createdAt: new Date().toISOString(),
      };

      const res = await http.post(
        `/api/annotations/${selectedAnnotation}/comments`,
        payload,
        {
          headers: { "x-user-id": current.id, "x-user-role": current.role },
        }
      );

      setComments((prev) => ({
        ...prev,
        [selectedAnnotation]: [...(prev[selectedAnnotation] || []), res.data],
      }));
      setNewComment("");
    } catch (err) {
      console.error("Failed to create comment:", err);
    }
  }, [selectedAnnotation, newComment, current.id, current.role]);

  const deleteComment = useCallback(
    async (annotationId: string, commentId: string) => {
      try {
        await http.delete(
          `/api/annotations/${annotationId}/comments/${commentId}`,
          {
            headers: { "x-user-id": current.id, "x-user-role": current.role },
          }
        );

        setComments((prev) => ({
          ...prev,
          [annotationId]: (prev[annotationId] || []).filter(
            (c) => c._id !== commentId
          ),
        }));
      } catch (err) {
        console.error("Failed to delete comment:", err);
      }
    },
    [current.id, current.role]
  );

  const handleMouseLeave = useCallback(() => {
    setIsDrawing(false);
    setDrawPath([]);
    setPreviewRect(null);
  }, []);

  const colors = ["#FFEB3B", "#FF5722", "#4CAF50", "#2196F3", "#9C27B0"];
  const { width, height } = dimensions;

  const canEdit = current.role !== "R1";

  return (
    <div className="flex flex-col bg-white h-full rounded-lg overflow-hidden">
      {canEdit && (
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4">
            <div className="flex flex-col gap-3 lg:gap-5 flex-1 overflow-hidden">
              {/* Tool Selection */}
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex-shrink-0">
                  Tools:
                </span>
                <div className="flex gap-2 ml-2 overflow-x-auto scrollbar-hidden">
                  {(["highlight", "draw", "rectangle", "circle"] as Tool[]).map(
                    (tool) => {
                      const icons = {
                        highlight: <PiHighlighterDuotone />,
                        draw: <MdOutlineDraw />,
                        rectangle: <PiRectangleLight />,
                        circle: <FaRegCircle />,
                      };
                      return (
                        <button
                          key={tool}
                          onClick={() => setCurrentTool(tool)}
                          className={`px-3 sm:px-4 py-1.5 sm:py-2 flex items-center justify-center gap-1 text-xs sm:text-sm rounded-lg font-medium transition-all duration-200 capitalize whitespace-nowrap ${
                            currentTool === tool
                              ? "bg-black text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow"
                          }`}
                        >
                          <span className="mr-1">{icons[tool]}</span>
                          {tool}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Color Selection */}
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex-shrink-0">
                  Colors:
                </span>
                <div className="flex gap-3 py-2 px-2 sm:gap-4 ml-2 overflow-x-auto scrollbar-hidden min-w-0">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setCurrentColor(color)}
                      className={`w-5 h-5 rounded-full transition-all duration-200 flex-shrink-0 ${
                        currentColor === color
                          ? "ring-2 ring-offset-2 ring-blue-400 transform scale-110 shadow-lg"
                          : "ring-2 ring-gray-300 hover:ring-gray-400 hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Visibility Selector */}
              <div className="flex items-start gap-2 overflow-hidden">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex-shrink-0 mt-1">
                  Visible to:
                </span>
                <div className="flex gap-2 sm:gap-3 flex-wrap ml-2 overflow-x-auto scrollbar-hidden min-w-0">
                  <label className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm cursor-pointer hover:text-blue-600 transition-colors whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedRoles === "all"}
                      onChange={() => toggleRole("all")}
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 cursor-pointer accent-blue-500"
                    />
                    <span className="font-medium">Everyone</span>
                  </label>
                  <label className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm cursor-pointer hover:text-blue-600 transition-colors whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={
                        Array.isArray(selectedRoles) &&
                        selectedRoles.includes("A1")
                      }
                      onChange={() => toggleRole("A1")}
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 cursor-pointer accent-blue-500"
                    />
                    <span className="font-medium">A1</span>
                  </label>
                  <label className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm cursor-pointer hover:text-blue-600 transition-colors whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={
                        Array.isArray(selectedRoles) &&
                        selectedRoles.includes("D1")
                      }
                      onChange={() => toggleRole("D1")}
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 cursor-pointer accent-blue-500"
                    />
                    <span className="font-medium">D1</span>
                  </label>
                  <label className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm cursor-pointer hover:text-blue-600 transition-colors whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={
                        Array.isArray(selectedRoles) &&
                        selectedRoles.includes("D2")
                      }
                      onChange={() => toggleRole("D2")}
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 cursor-pointer accent-blue-500"
                    />
                    <span className="font-medium">D2</span>
                  </label>
                  {(current.role === "A1" ||
                    current.role === "D1" ||
                    current.role === "D2") && (
                    <label className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm cursor-pointer hover:text-blue-600 transition-colors whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={
                          Array.isArray(selectedRoles) &&
                          selectedRoles.includes(current.id)
                        }
                        onChange={() => toggleRole(current.id)}
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 cursor-pointer accent-blue-500"
                      />
                      <span className="font-medium">Only Me</span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 self-start lg:self-auto">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white rounded-md hover:bg-gray-200 transition-colors shadow-sm font-bold text-gray-700 text-sm sm:text-base"
              >
                -
              </button>
              <span className="text-xs sm:text-sm font-semibold w-12 sm:w-14 text-center text-gray-700">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white rounded-md hover:bg-gray-200 transition-colors shadow-sm font-bold text-gray-700 text-sm sm:text-base"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar for read-only users - Only zoom controls and comments */}
      {!canEdit && (
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-sm font-semibold">Read-Only Mode</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCommentsPanel(!showCommentsPanel)}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 ${
                  showCommentsPanel
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow"
                }`}
              >
                Comments
              </button>
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                  className="w-8 h-8 flex items-center justify-center bg-white rounded-md hover:bg-gray-200 transition-colors shadow-sm font-bold text-gray-700"
                >
                  −
                </button>
                <span className="text-sm font-semibold w-14 text-center text-gray-700">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
                  className="w-8 h-8 flex items-center justify-center bg-white rounded-md hover:bg-gray-200 transition-colors shadow-sm font-bold text-gray-700"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* PDF Viewer */}
        <div
          ref={scrollRef}
          className="flex-1 h-full overflow-auto bg-white p-2 sm:p-4"
        >
          <Document
            file={getFileUrl(docId)}
            onLoadSuccess={(info) => setNumPages(info.numPages)}
            loading={
              <div className="flex items-center justify-center h-full mb-5">
                <div className="text-center flex items-center gap-3">
                  <CgSpinnerTwo className="animate-spin text-2xl text-gray-700" />
                  <p className="text-gray-600">Loading PDF</p>
                </div>
              </div>
            }
            error={
              <div className="flex items-center justify-center h-full">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <p className="text-red-600 font-semibold">
                    ❌ Failed to load PDF
                  </p>
                  <p className="text-sm text-red-500 mt-2">Please try again</p>
                </div>
              </div>
            }
          >
            {Array.from({ length: numPages }, (_, i) => {
              const pageNumber = i + 1;
              return (
                <PDFPageWithAnnotations
                  key={pageNumber}
                  pageNumber={pageNumber}
                  width={width}
                  height={height}
                  currentTool={currentTool}
                  currentColor={currentColor}
                  annotations={annotations}
                  isDrawing={isDrawing}
                  drawPath={drawPath}
                  previewRect={previewRect}
                  handleMouseDown={handleMouseDown}
                  handleMouseMove={handleMouseMove}
                  handleMouseUp={handleMouseUp}
                  handleMouseLeave={handleMouseLeave}
                  handleAnnotationClick={handleAnnotationClick}
                  setSelectedAnnotation={setSelectedAnnotation}
                />
              );
            })}
          </Document>
        </div>

        {/* Annotations List - Right Sidebar for larger screens */}
        <div className="hidden lg:block w-80 xl:w-96 border-l border-gray-200 bg-white overflow-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-3 sm:p-4 shadow-sm z-10">
            <h4 className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <TbScribble className="text-xl sm:text-2xl" /> Annotations
              <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                {annotations.filter((ann) => ann.kind !== "highlight").length}
              </span>
            </h4>
          </div>

          <div className="p-3 sm:p-4">
            {annotations.filter((ann) => ann.kind !== "highlight").length >
            0 ? (
              <div className="space-y-3">
                {annotations
                  .filter((ann) => ann.kind !== "highlight")
                  .map((ann) => (
                    <div
                      key={ann._id}
                      className={`group relative overflow-hidden rounded-xl border transition-all duration-300 cursor-pointer ${
                        selectedAnnotation === ann._id
                          ? "border-blue-400 bg-blue-50 shadow-lg shadow-blue-100 scale-[1.02]"
                          : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-md"
                      }`}
                      onClick={() => handleAnnotationClick(ann._id)}
                    >
                      {/* Color accent bar */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1"
                        style={{ backgroundColor: ann.color }}
                      />

                      <div className="pl-4 pr-3 py-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold shadow-sm"
                              style={{ backgroundColor: ann.color }}
                            >
                              {ann.kind === "freehand" ? (
                                <MdOutlineDraw className="text-base" />
                              ) : ann.kind === "shape" &&
                                ann.shape === "rect" ? (
                                <PiRectangleLight className="text-base" />
                              ) : ann.kind === "shape" &&
                                ann.shape === "ellipse" ? (
                                <FaRegCircle className="text-sm" />
                              ) : (
                                <BsFileText className="text-sm" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-gray-800 capitalize truncate">
                                {ann.kind === "freehand"
                                  ? "Drawing"
                                  : ann.kind === "shape" && ann.shape === "rect"
                                  ? "Rectangle"
                                  : ann.kind === "shape" &&
                                    ann.shape === "ellipse"
                                  ? "Circle"
                                  : ann.kind}
                              </p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <BsFileText className="text-[10px]" />
                                Page {ann.page}
                              </p>
                            </div>
                          </div>

                          {/* Delete button */}
                          {(current.role === "A1" ||
                            ann.creatorId === current.id) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteAnnotation(ann._id);
                              }}
                              className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                              title="Delete annotation"
                            >
                              <HiOutlineTrash className="text-base" />
                            </button>
                          )}
                        </div>

                        {/* Note */}
                        {ann.note && (
                          <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-2 line-clamp-2 italic">
                            "{ann.note}"
                          </div>
                        )}

                        {/* Footer - Comments count */}
                        {comments[ann._id] && comments[ann._id].length > 0 && (
                          <div className="flex items-center gap-1.5 text-blue-600 text-xs font-medium pt-1 border-t border-gray-100">
                            <BiMessageSquareDetail className="text-sm" />
                            <span>
                              {comments[ann._id].length}{" "}
                              {comments[ann._id].length === 1
                                ? "Comment"
                                : "Comments"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">
                <div className="text-4xl mb-2 flex items-center justify-center">
                  <TbScribbleOff />
                </div>
                <p className="text-sm text-black">No annotations yet</p>
                <p className="text-xs mt-1">
                  Start by selecting a tool and annotating the PDF
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Annotations List - Bottom Bar (shows on smaller screens) */}
      <div className="lg:hidden border-t border-gray-200 bg-white shadow-inner">
        {/* Toggle Header */}
        <button
          onClick={() => setMobileAnnotationsOpen(!mobileAnnotationsOpen)}
          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors active:bg-gray-100"
        >
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <TbScribble className="text-xl" /> Annotations
              <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                {annotations.filter((ann) => ann.kind !== "highlight").length}
              </span>
            </h4>
          </div>
          <div className="text-gray-500">
            {mobileAnnotationsOpen ? (
              <FiChevronDown className="text-xl" />
            ) : (
              <FiChevronUp className="text-xl" />
            )}
          </div>
        </button>

        {/* Collapsible Content */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            mobileAnnotationsOpen ? "max-h-64" : "max-h-0"
          }`}
        >
          <div className="p-3 pt-0 max-h-64 overflow-auto">
            {annotations.filter((ann) => ann.kind !== "highlight").length >
            0 ? (
              <div className="space-y-2">
                {annotations
                  .filter((ann) => ann.kind !== "highlight")
                  .map((ann) => (
                    <div
                      key={ann._id}
                      className={`group relative overflow-hidden rounded-xl border transition-all duration-300 cursor-pointer ${
                        selectedAnnotation === ann._id
                          ? "border-blue-400 bg-blue-50 shadow-md"
                          : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm active:scale-[0.98]"
                      }`}
                      onClick={() => handleAnnotationClick(ann._id)}
                    >
                      {/* Color accent bar */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1"
                        style={{ backgroundColor: ann.color }}
                      />

                      <div className="pl-3 pr-2 py-2.5 flex items-start gap-2">
                        {/* Icon */}
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-sm shadow-sm"
                          style={{ backgroundColor: ann.color }}
                        >
                          {ann.kind === "freehand" ? (
                            <MdOutlineDraw className="text-sm" />
                          ) : ann.kind === "shape" && ann.shape === "rect" ? (
                            <PiRectangleLight className="text-sm" />
                          ) : ann.kind === "shape" &&
                            ann.shape === "ellipse" ? (
                            <FaRegCircle className="text-xs" />
                          ) : (
                            <BsFileText className="text-xs" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <p className="font-semibold text-xs text-gray-800 capitalize truncate">
                                {ann.kind === "freehand"
                                  ? "Drawing"
                                  : ann.kind === "shape" && ann.shape === "rect"
                                  ? "Rectangle"
                                  : ann.kind === "shape" &&
                                    ann.shape === "ellipse"
                                  ? "Circle"
                                  : ann.kind}
                              </p>
                              <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
                                P.{ann.page}
                              </span>
                            </div>

                            {/* Delete button - mobile optimized */}
                            {(current.role === "A1" ||
                              ann.creatorId === current.id) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteAnnotation(ann._id);
                                }}
                                className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 active:scale-95 transition-all"
                                title="Delete"
                              >
                                <HiOutlineTrash className="text-sm" />
                              </button>
                            )}
                          </div>

                          {/* Note */}
                          {ann.note && (
                            <div className="text-[11px] text-gray-600 bg-gray-50 rounded px-2 py-1 mb-1 line-clamp-1 italic">
                              "{ann.note}"
                            </div>
                          )}

                          {/* Comments count */}
                          {comments[ann._id] &&
                            comments[ann._id].length > 0 && (
                              <div className="flex items-center gap-1 text-blue-600 text-[11px] font-medium">
                                <BiMessageSquareDetail className="text-xs" />
                                <span>{comments[ann._id].length}</span>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">
                <div className="text-4xl mb-2 flex items-center justify-center">
                  <TbScribbleOff />
                </div>
                <p className="text-sm text-black">No annotations yet</p>
                <p className="text-xs mt-1">
                  Start by selecting a tool and annotating the PDF
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comments Modal */}
      {showCommentsPanel && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCommentsPanel(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 bg-white rounded-t-2xl flex items-center justify-between">
              <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                Comments
              </h3>
              <button
                onClick={() => setShowCommentsPanel(false)}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center transition-colors text-xl"
                title="Close"
              >
                <IoMdClose />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6 bg-gray-50">
              {selectedAnnotation ? (
                <div>
                  {/* Comments List */}
                  <div className="space-y-4 mb-6">
                    {(comments[selectedAnnotation] || []).length > 0 ? (
                      (comments[selectedAnnotation] || []).map((comment) => (
                        <div
                          key={comment._id}
                          className="p-4 bg-white rounded-xl border border-gray-200"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {comment.author.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-gray-800 block">
                                  {comment.author}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(comment.createdAt).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            {(current.role === "A1" ||
                              comment.author === current.id) && (
                              <button
                                onClick={() =>
                                  deleteComment(selectedAnnotation, comment._id)
                                }
                                className="text-sm text-red-500 hover:text-white hover:bg-red-500 px-3 py-1 transition-all"
                                title="Delete comment"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed pl-13">
                            {comment.text}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-400 py-12">
                        <div className="text-5xl mb-3 flex items-center justify-center">
                          <LiaCommentSolid />
                        </div>
                        <p className="text-base font-medium">No comments yet</p>
                        {current.role !== "R1" && (
                          <p className="text-sm mt-1">
                            Be the first to comment!
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Add Comment */}
                  {current.role !== "R1" ? (
                    <div className="mt-6 bg-white p-5 rounded-xl border border-gray-200 shadow-md">
                      <label className="text-sm font-semibold text-gray-700 mb-3 block">
                        Add a Comment
                      </label>
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Type your comment here..."
                        className="w-full border border-gray-300 rounded-lg p-4 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                      <button
                        onClick={addComment}
                        disabled={!newComment.trim()}
                        className="mt-4 w-fit bg-black text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        Post Comment
                      </button>
                    </div>
                  ) : (
                    <div className="mt-6 bg-gray-50 p-5 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-2 text-gray-600">
                        <div>
                          <p className="text-sm font-semibold">
                            Read-Only Mode
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            You cannot add comments in read-only mode
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-20">
                  <div className="text-7xl mb-6 flex items-center justify-center">
                    <LiaCommentSolid />
                  </div>
                  <p className="text-xl font-medium">Click on an annotation</p>
                  <p className="text-base mt-2">
                    {current.role === "R1"
                      ? "to view comments"
                      : "to view or add comments"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleAnnotationProvider;
