import React from 'react';
import { useUser } from '../context/UserContext';

const UserSwitcher: React.FC = () => {
  const { users, current, switchTo } = useUser();

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <label className="text-xs sm:text-sm text-gray-600 hidden sm:inline">Switch user:</label>
      <select
        value={current.id}
        onChange={(e) => switchTo(e.target.value)}
        className="border border-gray-300 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      >
        {users.map(u => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
    </div>
  );
};

export default UserSwitcher;
