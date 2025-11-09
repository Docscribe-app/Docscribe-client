import { http, withUserHeaders } from './http';
import type { User } from '../types';

export interface ServerDocMeta {
  _id: string;
  fileId: string;
  name: string;
  uploaderId: string;
  uploadDate: string;
  fileSize?: number;
}

export interface ServerAnnotationPathPoint { x: number; y: number }

export interface ServerAnnotation {
  _id: string;
  docId: string;
  page: number;
  kind?: 'point' | 'highlight' | 'freehand' | 'shape';
  x?: number;
  y?: number;
  note: string;
  creatorId: string;
  visibility: 'all' | string[];
  createdAt: string;
  rect?: { x: number; y: number; w: number; h: number };
  path?: ServerAnnotationPathPoint[];
  shape?: 'rect' | 'ellipse';
}

export async function listDocuments(user: User) {
  const res = await http.get<ServerDocMeta[]>(`/api/documents`, withUserHeaders(user));
  return res.data;
}

export async function uploadDocuments(files: File[], user: User) {
  const fd = new FormData();
  files.forEach((f) => fd.append('files', f));
  const res = await http.post<ServerDocMeta[]>(`/api/documents`, fd, withUserHeaders(user));
  return res.data;
}

export function getFileUrl(docId: string) {
  const base = http.defaults.baseURL?.replace(/\/$/, '') || '';
  return `${base}/api/documents/${docId}/file`;
}

export async function listAnnotations(docId: string, user: User) {
  const res = await http.get<ServerAnnotation[]>(`/api/annotations/document/${docId}`, withUserHeaders(user));
  return res.data;
}

export async function createAnnotation(docId: string, data: Partial<ServerAnnotation>, user: User) {
  const res = await http.post<ServerAnnotation>(`/api/annotations/document/${docId}`, data, withUserHeaders(user));
  return res.data;
}

export async function updateAnnotation(id: string, data: Partial<ServerAnnotation>, user: User) {
  const res = await http.patch<ServerAnnotation>(`/api/annotations/${id}`, data, withUserHeaders(user));
  return res.data;
}

export async function deleteAnnotation(id: string, user: User) {
  const res = await http.delete<{ ok: boolean }>(`/api/annotations/${id}`, withUserHeaders(user));
  return res.data.ok;
}

export async function deleteDocument(docId: string, user: User) {
  const res = await http.delete<{ status: number }>(`/api/documents/${docId}`, withUserHeaders(user));
  console.log(res)
  return res.status === 200;
}
