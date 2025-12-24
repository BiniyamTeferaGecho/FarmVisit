import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaHome, FaUsers, FaBriefcase, FaLayerGroup, FaClipboardList, FaCalendarAlt, FaClock, FaChartBar, FaCog, FaChevronDown, FaChevronRight, FaTags, FaBookOpen, FaPhone, FaUserPlus, FaBuilding, FaIndustry, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../auth/AuthProvider';
import { href, useNavigate } from 'react-router-dom';

const menu = [
    { key: 'dashboard', label: 'Dashboard', href: '/dashboard?tab=dashboard', icon: FaHome },
    {
        key: 'companies', label: 'Companies', href: '/companies', icon: FaBuilding,rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN','ROLE_ADVISOR'],
        children: [
            { key: 'lookups', label: 'Lookups', icon: FaChartBar, href: '/dashboard?tab=lookups', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
            { key: 'lookuptypes', label: 'Lookup Type', icon: FaTags, href: '/dashboard?tab=lookuptypes', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
            { key: 'farmtypes', label: 'Farm Types', icon: FaTags, href: '/dashboard?tab=farmtypes', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
            { key: 'farmers', label: 'Farmers', icon: FaUserPlus, href: '/dashboard?tab=farmers', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
            { key: 'employees', label: 'Employees', icon: FaUsers, href: '/dashboard?tab=employees', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
            { key: 'farms', label: 'Farm', icon: FaIndustry, href: '/dashboard?tab=farms', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN','ROLE_ADVISOR'] },
        ]
    },
    {
        key: 'farmsvisit', label: 'Farms Visit', href: '/dashboard?tab=farmvisit', icon: FaBriefcase,rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN','ROLE_ADVISOR','ROLE_VIEWER'],
        children: [
            { key: 'layerfarm', label: 'Layer Farm', icon: FaLayerGroup, href: '/dashboard?tab=layerfarm', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN','ROLE_ADVISOR'] },
            { key: 'dairyfarm', label: 'Dairy Farm', icon: FaBookOpen, href: '/dashboard?tab=dairyfarm', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN','ROLE_ADVISOR'] },
            { key: 'farmvisitschedule', label: 'Visit Schedules', icon: FaCalendarAlt, href: '/dashboard?tab=farmvisitschedule', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN','ROLE_ADVISOR','ROLE_VIEWER'] },
            { key: 'advisorvisits', label: 'My Visits', icon: FaCalendarAlt, href: '/dashboard?tab=advisorvisits', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN','ROLE_ADVISOR'] },
        ]
    },
    {
        key: 'reports', label: 'Reports', href: '/dashboard?tab=reports', icon: FaChartBar, rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'],
        children: [
            { key: 'reports-farm', label: 'Farm', icon: FaIndustry, href: '/dashboard?tab=reports_farm', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
            { key: 'reports-farmers', label: 'Farmers', icon: FaUserPlus, href: '/dashboard?tab=reports_farmers', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
            { key: 'reports-visit', label: 'Visit', icon: FaCalendarAlt, href: '/dashboard?tab=reports_visit', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
            { key: 'reports-advisor', label: 'Advisor', icon: FaUsers, href: '/dashboard?tab=reports_advisor', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
        ]
    },
    {
        key: 'settings', label: 'Settings', href: '/settings', icon: FaCog,
        // Settings is restricted to admin roles
        rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'],
        children: [
            { key: 'roles', label: 'Roles', icon: FaTags, href: '/dashboard?tab=roles', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
            { key: 'permissions', label: 'Permissions', icon: FaTags, href: '/dashboard?tab=permissions', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
            { key: 'rolepermissions', label: 'Role Permissions', icon: FaUsers, href: '/dashboard?tab=rolepermissions', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
            { key: 'users', label: 'Users', icon: FaUsers, href: '/dashboard?tab=users', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
            { key: 'userroles', label: 'User Roles', icon: FaUsers, href: '/dashboard?tab=userroles', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
            { key: 'forms', label: 'Forms', icon: FaBookOpen, href: '/dashboard?tab=forms', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
            { key: 'formpermissions', label: 'Form Permissions', icon: FaBookOpen, href: '/dashboard?tab=formpermissions', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
            { key: 'groups', label: 'Groups', icon: FaUsers, href: '/dashboard?tab=groups', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
            { key: 'groupusers', label: 'Group Users', icon: FaUsers, href: '/dashboard?tab=groupusers', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
            { key: 'grouproles', label: 'Group Roles', icon: FaUsers, href: '/dashboard?tab=grouproles', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
                    { key: 'adminsessions', label: 'Sessions', icon: FaClock, href: '/admin/sessions', rolesAllowed: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] },
           
        ]
    },
];

const SidebarLink = ({ item, active, onClick, isCollapsed, isOpen, onToggle }) => {
    const { icon: Icon } = item;
    const hasChildren = item.children && item.children.length > 0;

    return (
        <motion.li
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-1"
        >
            <div
                onClick={(e) => { e.stopPropagation(); onClick && onClick(item, e); }}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ${active === item.key ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
                <div className="flex items-center">
                    <Icon className={`h-5 w-5 mr-3 ${active === item.key ? 'text-white' : 'text-indigo-500'}`} />
                    {!isCollapsed && <span className="font-semibold">{item.label}</span>}
                </div>
                    {hasChildren && !isCollapsed && (
                    <button onClick={(e) => { e.stopPropagation(); onToggle(item.key); }} className="p-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600">
                        {isOpen ? <FaChevronDown className="h-4 w-4" /> : <FaChevronRight className="h-4 w-4" />}
                    </button>
                )}
            </div>
            {hasChildren && isOpen && !isCollapsed && (
                <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="pl-8 mt-2 space-y-1"
                >
                    {item.children.map(child => (
                        <SidebarLink
                            key={`${item.key}-${child.key}`}
                            item={child}
                            active={active}
                            onClick={onClick}
                            isCollapsed={isCollapsed}
                        />
                    ))}
                </motion.ul>
            )}
        </motion.li>
    );
};

export default function Sidebar({ isOpen = false, isCollapsed = false, onClose, active, onChange, width = 1256, minWidth = 80 }) {
    const [query, setQuery] = useState('');
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [openKeys, setOpenKeys] = useState({});

    // Build normalized role/permission sets for quick checks (case-insensitive)
    const normalizeRoleItem = (r) => {
        if (!r) return null;
        if (typeof r === 'string') return r.trim().toLowerCase();
        if (typeof r === 'object') return (r.RoleName || r.name || r.Name || r.role || r.roleName || '').toString().trim().toLowerCase();
        return null;
    };
    const userRoles = Array.isArray(user?.roles || []) ? (user.roles || []).map(normalizeRoleItem).filter(Boolean) : [];
    const userPerms = Array.isArray(user?.permissions || []) ? (user.permissions || []).map(p => (typeof p === 'string' ? p.trim().toLowerCase() : (p && (p.Permission || p.permission || p.name) || '').toString().trim().toLowerCase())).filter(Boolean) : [];

    const hasAny = (haystack, needles) => {
        if (!haystack || haystack.length === 0) return false;
        if (!needles || needles.length === 0) return false;
        const set = new Set(haystack);
        return needles.some(n => set.has(n.toString().trim().toLowerCase()));
    };

    const isItemAllowed = (item) => {
        if (!item) return true;
        // rolesAllowed and permsAllowed are optional arrays on item
        if (item.rolesAllowed && Array.isArray(item.rolesAllowed) && item.rolesAllowed.length > 0) {
            const allowed = item.rolesAllowed.map(r => r.toString().trim().toLowerCase());
            if (hasAny(userRoles, allowed)) return true;
            // if roles explicitly required and none match, deny
            return false;
        }
        if (item.permsAllowed && Array.isArray(item.permsAllowed) && item.permsAllowed.length > 0) {
            const allowed = item.permsAllowed.map(p => p.toString().trim().toLowerCase());
            if (hasAny(userPerms, allowed)) return true;
            return false;
        }
        // no restriction -> allowed
        return true;
    };

    const handleLinkClick = (item, e) => {
        if (item.children && item.children.length > 0) {
            // clicking a parent with children toggles expansion
            toggleOpen(item.key);
        } else {
            const target = item.href ? item.href : `/dashboard?tab=${item.key}`;
            // Prevent default anchor behavior if event present
            if (e && typeof e.preventDefault === 'function') e.preventDefault();
            navigate(target);
            // Notify parent of the navigation so Dashboard can update active tab state.
            // Previously we only notified for non-dashboard targets which caused clicking
            // the top-level Dashboard item to not activate the dashboard tab. Always
            // call onChange when provided so the parent can react immediately.
            onChange && onChange(item.key);
            if (window.innerWidth < 1024) {
                // Delay closing the mobile sidebar slightly so navigation can settle
                try {
                    setTimeout(() => { if (typeof onClose === 'function') onClose(); }, 200);
                } catch (e) { if (typeof onClose === 'function') onClose(); }
            }
        }
    };

    const toggleOpen = (key) => {
        setOpenKeys(prev => {
            const isOpen = !!prev[key];
            return isOpen ? {} : { [key]: true };
        });
    };

    const normalized = (s = '') => s.trim().toLowerCase();
    const filteredMenu = menu.map(m => {
        // RBAC: skip top-level item if user is not allowed
        if (!isItemAllowed(m)) return null;

        if (!m.children) {
            return normalized(m.label).includes(normalized(query)) ? m : null;
        }

        const filteredChildren = m.children.filter(c => {
            // both query match and RBAC for the child (child may inherit parent's restriction if present)
            const matchesQuery = normalized(c.label).includes(normalized(query));
            const childAllowed = isItemAllowed(c) && isItemAllowed(m);
            return matchesQuery && childAllowed;
        });

        // If parent label matches query and parent is allowed, show parent even if children list is empty
        if (filteredChildren.length > 0 || normalized(m.label).includes(normalized(query))) {
            // If children exist, also filter them by RBAC; otherwise pass through parent
            return { ...m, children: filteredChildren };
        }
        return null;
    }).filter(Boolean);

    const sidebarContent = (
        <div className="flex flex-col h-full p-4 bg-white dark:bg-gray-800 shadow-xl">
            <div className="flex items-center mb-8">
                <FaIndustry className="h-8 w-8 text-indigo-600 mr-3" />
                {!isCollapsed && <h1 className="text-2xl font-bold text-gray-800 dark:text-white">FarmVisit</h1>}
            </div>

            {!isCollapsed && (
                <div className="relative mb-6">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search..."
                        className="w-full p-2 pl-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <FaChartBar className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
            )}

            <nav className="flex-1 overflow-y-auto">
                <ul>
                    {filteredMenu.map(item => (
                        <SidebarLink
                            key={item.key}
                            item={item}
                            active={active}
                            onClick={handleLinkClick}
                            isCollapsed={isCollapsed}
                            isOpen={openKeys[item.key]}
                            onToggle={toggleOpen}
                        />
                    ))}
                </ul>
            </nav>

            {/*  */}
        </div>
    );

    return (
        <>
            {/* Mobile Sidebar */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden"
                    >
                        {sidebarContent}
                    </motion.div>
                )}
            </AnimatePresence>
            {isOpen && <div className="fixed inset-0 bg-black opacity-50 z-40 lg:hidden" onClick={onClose}></div>}

            {/* Desktop Sidebar (in-flow on desktop so main content naturally fills remaining space) */}
            <motion.div
                animate={{ width: isCollapsed ? minWidth : width }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="hidden lg:flex z-30"
                style={{ height: 'calc(100vh - 64px)' }}
            >
                {sidebarContent}
            </motion.div>
        </>
    );
}