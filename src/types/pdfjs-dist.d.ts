declare module 'pdfjs-dist/build/pdf.worker.mjs?url' {
  const url: string;
  export default url;
}
declare module 'pdfjs-dist' {
  export const GlobalWorkerOptions: any;
  export function getDocument(src: string | any): any;
}
