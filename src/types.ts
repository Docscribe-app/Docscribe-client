export type Role = "A1" | "D1" | "D2" | "R1";

export interface User {
  id: string;
  name: string;
  role: Role;
}

export interface DocumentMeta {
  id: string;
  name: string;
  uploader: string;
  uploadDate: string;
  dataUrl: string;
}

export type Visibility = "all" | Role[];

export interface Annotation {
  id: string;
  docId: string;
  page: number;
  x: number;
  y: number;
  note: string;
  creator: string;
  visibility: Visibility;
  createdAt: string;
}
