import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL;

console.log(`API Base URL: ${baseURL}`);

export const http = axios.create({
  baseURL,
});

export const withUserHeaders = (user: { id: string; role: string }) => ({
  headers: {
    "x-user-id": user.id,
    "x-user-role": user.role,
  },
});
