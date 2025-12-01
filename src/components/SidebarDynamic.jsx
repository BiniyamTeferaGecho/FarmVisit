// src/components/SidebarDynamic.jsx
import React from 'react';
import { MENU } from '../config/menu';
import { useAuth } from '../auth/AuthProvider';
import { NavLink } from 'react-router-dom';

function allowed(item, user) {
  if (!user) return false;
  const { roles = [], permissions = [] } = user;
  if (Array.isArray(item.rolesAllowed) && item.rolesAllowed.length) {
    if (item.rolesAllowed.some(r => roles.includes(r))) return true;
  }
  if (Array.isArray(item.permissionsAllowed) && item.permissionsAllowed.length) {
    if (item.permissionsAllowed.some(p => permissions.includes(p))) return true;
  }
  // visible by default if both arrays empty -> authenticated users
  if ((!item.permissionsAllowed || item.permissionsAllowed.length === 0) && (!item.rolesAllowed || item.rolesAllowed.length === 0)) return true;
  return false;
}

export default function SidebarDynamic() {
  const { user } = useAuth();
  return (
    <aside className="w-64 bg-white h-full shadow">
      <nav className="p-4 space-y-1">
        {MENU.filter(item => allowed(item, user)).map(item => {
          const Icon = item.icon;
          return (
            <NavLink key={item.path} to={item.path} className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
              <Icon className="w-5 h-5 text-indigo-600" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}