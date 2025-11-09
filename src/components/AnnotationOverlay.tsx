import React, { useCallback, useEffect, useRef, useState } from 'react';

type OverlayAnnotation =
  | { id: string; type: 'point'; x: number; y: number; meta?: any }
  | { id: string; type: 'rect'; x: number; y: number; w: number; h: number; meta?: any }
  | { id: string; type: 'ellipse'; x: number; y: number; w: number; h: number; meta?: any }
  | { id: string; type: 'path'; points: { x: number; y: number }[]; meta?: any };

interface Props {
  className?: string;
  annotations: OverlayAnnotation[];
  readOnly?: boolean;
  onAddPoint?: (pt: { x: number; y: number }) => void;
  onAddRect?: (r: { x: number; y: number; w: number; h: number }) => void;
  onAddEllipse?: (r: { x: number; y: number; w: number; h: number }) => void;
  onAddPath?: (pts: { x: number; y: number }[]) => void;
  onDelete?: (id: string) => void;
}

const AnnotationOverlay: React.FC<Props> = ({ className, annotations, readOnly, onAddPoint, onAddRect, onAddEllipse, onAddPath, onDelete }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [drawingPath, setDrawingPath] = useState<{ x: number; y: number }[] | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const toolRef = useRef<'point' | 'rect' | 'ellipse' | 'path'>('rect');

  // Simple key-based tool switcher: P(point), R(rect), E(ellipse), F(freehand)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (readOnly) return;
      const k = e.key.toLowerCase();
      if (k === 'p') toolRef.current = 'point';
      if (k === 'r') toolRef.current = 'rect';
      if (k === 'e') toolRef.current = 'ellipse';
      if (k === 'f') toolRef.current = 'path';
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [readOnly]);

  const toNorm = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current!;
    const rect = el.getBoundingClientRect();
    const x = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    const y = Math.min(Math.max((clientY - rect.top) / rect.height, 0), 1);
    return { x, y };
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return;
    // Left button only
    if (e.button !== 0) return;
    const p = toNorm(e.clientX, e.clientY);
    if (toolRef.current === 'path') {
      setDrawingPath([{ x: p.x, y: p.y }]);
    } else {
      startRef.current = p;
      setDrag({ x: p.x, y: p.y, w: 0, h: 0 });
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const p = toNorm(e.clientX, e.clientY);
    if (drawingPath) {
      setDrawingPath([...drawingPath, p]);
      return;
    }
    if (!startRef.current) return;
    const sx = startRef.current.x;
    const sy = startRef.current.y;
    const x = Math.min(sx, p.x);
    const y = Math.min(sy, p.y);
    const w = Math.abs(p.x - sx);
    const h = Math.abs(p.y - sy);
    setDrag({ x, y, w, h });
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (readOnly) return;
    if (drawingPath) {
      // Finish freehand
      const finalPts = drawingPath;
      setDrawingPath(null);
      if (finalPts.length > 1) onAddPath?.(finalPts);
      return;
    }
    const started = startRef.current;
    const ended = drag;
    startRef.current = null;
    setDrag(null);
    if (!started) return;

    if (!ended || (ended.w ?? 0) < 0.01 || (ended.h ?? 0) < 0.01) {
      // Consider it a point if tool is point or size too small
      if (onAddPoint && toolRef.current === 'point') {
        const p = toNorm(e.clientX, e.clientY);
        onAddPoint(p);
      }
      return;
    }
    if (toolRef.current === 'ellipse') onAddEllipse?.(ended);
    else onAddRect?.(ended);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e: Event) => e.preventDefault();
    el.addEventListener('dragstart', prevent);
    return () => el.removeEventListener('dragstart', prevent);
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{ cursor: readOnly ? 'default' : 'crosshair', pointerEvents: readOnly ? 'none' : 'auto' }}
    >
      {/* Existing annotations */}
      {annotations.map((a) => {
        if (a.type === 'point') {
          return (
            <button
              key={a.id}
              title={a.meta?.note}
              onClick={(e) => { e.stopPropagation(); onDelete?.(a.id); }}
              className="absolute w-3 h-3 rounded-full bg-yellow-400 border border-yellow-600 z-20"
              style={{ left: `${a.x * 100}%`, top: `${a.y * 100}%`, transform: 'translate(-50%, -50%)' }}
            />
          );
        }
        if (a.type === 'rect') {
          return (
            <div
              key={a.id}
              onClick={(e) => { e.stopPropagation(); onDelete?.(a.id); }}
              className="absolute border-2 border-blue-500/70 bg-blue-300/20 z-20"
              style={{ left: `${a.x * 100}%`, top: `${a.y * 100}%`, width: `${a.w * 100}%`, height: `${a.h * 100}%` }}
              title={a.meta?.note}
            />
          );
        }
        if (a.type === 'ellipse') {
          return (
            <div
              key={a.id}
              onClick={(e) => { e.stopPropagation(); onDelete?.(a.id); }}
              className="absolute border-2 border-fuchsia-500/70 bg-fuchsia-300/20 z-20"
              style={{ left: `${a.x * 100}%`, top: `${a.y * 100}%`, width: `${a.w * 100}%`, height: `${a.h * 100}%`, borderRadius: '50%' }}
              title={a.meta?.note}
            />
          );
        }
        // path
        return (
          <svg key={a.id} className="absolute z-20 pointer-events-none" style={{ left: 0, top: 0, width: '100%', height: '100%' }}>
            <polyline
              onClick={(e) => { e.stopPropagation(); onDelete?.(a.id); }}
              className="pointer-events-auto"
              points={a.points.map(p => `${p.x * 100}%,${p.y * 100}%`).join(' ')}
              fill="none"
              stroke="red"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        );
      })}

      {/* Drag preview */}
      {drag && (
        <div
          className="absolute border-2 border-emerald-500/70 bg-emerald-300/20 z-10"
          style={{ left: `${drag.x * 100}%`, top: `${drag.y * 100}%`, width: `${(drag.w ?? 0) * 100}%`, height: `${(drag.h ?? 0) * 100}%`, borderRadius: toolRef.current === 'ellipse' ? '50%' : undefined }}
        />
      )}

      {drawingPath && (
        <svg className="absolute z-10 pointer-events-none" style={{ left: 0, top: 0, width: '100%', height: '100%' }}>
          <polyline
            className="pointer-events-none"
            points={drawingPath.map(p => `${p.x * 100}%,${p.y * 100}%`).join(' ')}
            fill="none"
            stroke="red"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    </div>
  );
};

export default AnnotationOverlay;
