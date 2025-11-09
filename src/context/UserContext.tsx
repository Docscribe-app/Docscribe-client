import React, { createContext, useContext, useState } from "react";
import type { User } from "../types";

const defaultUsers: User[] = [
  { id: "A1", name: "Admin (A1)", role: "A1" },
  { id: "D1", name: "Default user 1 (D1)", role: "D1" },
  { id: "D2", name: "Default user 2 (D2)", role: "D2" },
  { id: "R1", name: "Read-only (R1)", role: "R1" },
];

interface UserContextValue {
  users: User[];
  current: User;
  switchTo: (id: string) => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [users] = useState<User[]>(defaultUsers);
  const [currentId, setCurrentId] = useState<string>("A1");

  const current = users.find((u) => u.id === currentId)!;

  const switchTo = (id: string) => setCurrentId(id);

  return (
    <UserContext.Provider value={{ users, current, switchTo }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
};
