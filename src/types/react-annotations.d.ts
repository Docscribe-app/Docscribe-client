declare module 'react-annotations' {
  import * as React from 'react';
  export interface OverlayAnnotation {
    id: string;
    type: 'point' | 'rect';
    x: number;
    y: number;
    w?: number;
    h?: number;
    meta?: any;
  }
  export interface AnnotationOverlayProps {
    className?: string;
    annotations: OverlayAnnotation[];
    readOnly?: boolean;
    onAddPoint?: (pt: { x: number; y: number }) => void;
    onAddRect?: (r: { x: number; y: number; w: number; h: number }) => void;
    onDelete?: (id: string) => void;
  }
  export const AnnotationOverlay: React.FC<AnnotationOverlayProps>;
}
