import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, Moon, Sun, X } from 'lucide-react';
import TopNav from '../components/TopNav';
import BottomNav from '../components/BottomNav';
import Sidebar from '../components/Sidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBoundary from '../components/ErrorBoundary';
import DashboardHome from './dashboardComponents/DashboardHome';
import LookupType from './LookupType';
import Lookups from './Lookups';
import LayerFarm from './LayerFarm';

export default function Dashboard() {
  const HEADER_HEIGHT = 64;
  const MIN_SIDEBAR = 82;
  const DEFAULT_SIDEBAR = 280;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    return sidebarCollapsed ? MIN_SIDEBAR : (Number(localStorage.getItem('sidebarWidth')) || DEFAULT_SIDEBAR);
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [reverseMode, setReverseMode] = useState(() => localStorage.getItem('reverse') === 'true');

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTabId, setActiveTabId] = useState(() => searchParams.get('tab') || 'dashboard');
  const [tabs, setTabs] = useState([{ id: 'dashboard', title: 'Dashboard' }]);
  const [loadingModule, setLoadingModule] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    localStorage.setItem('sidebarWidth', String(sidebarWidth));
    document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
    document.body.classList.toggle('sidebar-collapsed', sidebarCollapsed);
    document.body.classList.toggle('sidebar-expanded', !sidebarCollapsed);
  }, [sidebarWidth, sidebarCollapsed]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    // Apply Tailwind's class-based dark mode and persist choice
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    // Apply a simple "reverse" (inverted colors) mode. Stored as 'reverse' in localStorage.
    document.documentElement.classList.toggle('reverse', reverseMode);
    localStorage.setItem('reverse', reverseMode ? 'true' : 'false');
  }, [reverseMode]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const titles = useMemo(() => ({
    dashboard: 'Dashboard',
    lookuptypes: 'Lookup Types',
    lookups: 'Lookups',
    layerfarm: 'Layer Farm',
    dairyfarm: 'Dairy Farm',
    farmvisit: 'Farm Visit',
    advisorvisits: 'My Visits',
    farmers: 'Farmers',
    employees: 'Employees',
    farms: 'Farms',
    profile: 'My Profile',
    reports: 'Reports',
    settings: 'Settings',
    roles: 'Roles',
    permissions: 'Permissions',
    users: 'Users',
    userroles: 'User Roles',
    rolepermissions: 'Role Permissions',
    forms: 'Forms',
    grouproles: 'Group Roles',
    groups: 'Groups',
    groupusers: 'Group Users',
    formpermissions: 'Form Permissions',
    farmvisitschedule: 'Visit Schedules',
  }), []);

  const compactTopPages = useMemo(() => new Set(['farmvisit', 'profile']), []);
  const compactTop = compactTopPages.has(activeTabId);

  const components = useMemo(() => ({
    dashboard: <DashboardHome reloadKey={reloadKey} />,
    lookuptypes: <LookupType reloadKey={reloadKey} />,
    lookups: <Lookups reloadKey={reloadKey} />,
    layerfarm: <LayerFarm reloadKey={reloadKey} />,
    dairyfarm: React.createElement(React.lazy(() => import('./DairyFarm')), { reloadKey }),
    farmvisit: React.createElement(React.lazy(() => import('./FarmVisit')), { reloadKey }),
    advisorvisits: React.createElement(React.lazy(() => import('./AdvisorVisits')), { reloadKey }),
    farmvisitschedule: React.createElement(React.lazy(() => import('./FarmVisitSchedule')), { reloadKey }),
    farmers: React.createElement(React.lazy(() => import('./Farmers')), { reloadKey }),
    employees: React.createElement(React.lazy(() => import('./Employee')), { reloadKey }),
    farms: React.createElement(React.lazy(() => import('./Farms')), { reloadKey }),
    profile: React.createElement(React.lazy(() => import('./profile')), { reloadKey }),
    reports: React.createElement(React.lazy(() => import('./Reports')), { reloadKey }),
    settings: React.createElement(React.lazy(() => import('./settings')), { reloadKey }),
    roles: React.createElement(React.lazy(() => import('./Role')), { reloadKey }),
    permissions: React.createElement(React.lazy(() => import('./Permission')), { reloadKey }),
    users: React.createElement(React.lazy(() => import('./user')), { reloadKey }),
    rolepermissions: React.createElement(React.lazy(() => import('./PermissionRole')), { reloadKey }),
    forms: React.createElement(React.lazy(() => import('./Forms')), { reloadKey }),
    grouproles: React.createElement(React.lazy(() => import('./GroupRole')), { reloadKey }),
    groups: React.createElement(React.lazy(() => import('./Group')), { reloadKey }),
    groupusers: React.createElement(React.lazy(() => import('./GroupUser')), { reloadKey }),
    formpermissions: React.createElement(React.lazy(() => import('./FormPermission')), { reloadKey }),
    userroles: React.createElement(React.lazy(() => import('./UserRole')), { reloadKey }),
  }), [reloadKey]);

  const handleToggleCollapse = () => {
    setSidebarCollapsed(prev => {
      const newCollapsed = !prev;
      localStorage.setItem('sidebarCollapsed', String(newCollapsed));
      setSidebarWidth(newCollapsed ? MIN_SIDEBAR : DEFAULT_SIDEBAR);
      return newCollapsed;
    });
  };

  const handleOpenTab = (key) => {
    setLoadingModule(true);
    setTimeout(() => {
      if (!tabs.some(t => t.id === key)) {
        setTabs(prev => [...prev, { id: key, title: titles[key] || key }]);
      }
      // update URL query param when opening tab
      try {
        const next = new URLSearchParams(searchParams);
        next.set('tab', key);
        setSearchParams(next);
      } catch (e) {
        // fallback: directly set state
        setActiveTabId(key);
      }
      setLoadingModule(false);
    }, 150);
  };

  // Keep the active tab in sync with the `?tab=` query parameter so
  // the selected tab is restored on reload and the URL updates when
  // the user selects a different tab.
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && titles[tab]) {
      if (!tabs.some(t => t.id === tab)) {
        setTabs(prev => [...prev, { id: tab, title: titles[tab] }]);
      }
      setActiveTabId(tab);
    }
    // if query param is invalid we leave the activeTabId alone
  }, [searchParams, titles]);

  // Listen for profile updates (e.g., saved from a modal) and refresh current view
  useEffect(() => {
    function onProfileUpdated() {
      setReloadKey(k => k + 1);
    }
    window.addEventListener('profile-updated', onProfileUpdated);
    return () => window.removeEventListener('profile-updated', onProfileUpdated);
  }, []);

  const handleCloseTab = (key) => {
    if (key === 'dashboard') return;
    setTabs(prev => prev.filter(t => t.id !== key));
    if (activeTabId === key) {
      // switch URL back to dashboard tab when closing the active tab
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'dashboard');
      setSearchParams(next);
    }
  };

  const refreshActiveTab = () => setReloadKey(k => k + 1);

  return (
    <div className={`min-h-screen w-full bg-gray-50 dark:bg-gray-900 transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
      <div style={{ height: HEADER_HEIGHT }} className="fixed top-0 left-0 right-0 z-40">
        <TopNav onToggleSidebar={() => setSidebarOpen(s => !s)} onToggleCollapse={handleToggleCollapse} />
      </div>

      <div style={{ paddingTop: HEADER_HEIGHT }} className="flex w-full relative">
        <Sidebar
          isOpen={sidebarOpen}
          isCollapsed={sidebarCollapsed}
          active={activeTabId}
          onChange={handleOpenTab}
          onClose={() => setSidebarOpen(false)}
          width={sidebarWidth}
          minWidth={MIN_SIDEBAR}
        />

        <motion.main
          className="flex-1 flex flex-col hide-vertical-scroll w-full"
          style={{
            height: `calc(100vh - ${HEADER_HEIGHT}px)`,
            overflowY: 'auto',
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <ErrorBoundary>
            <div className="flex-1 flex flex-col p-0">
              <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between px-4">
                  <div className="flex items-center overflow-x-auto">
                    {tabs.map(t => (
                      <button
                        key={t.id}
                        onClick={() => {
                          // update URL when selecting tab
                          const next = new URLSearchParams(searchParams);
                          next.set('tab', t.id);
                          setSearchParams(next);
                        }}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
                          activeTabId === t.id
                            ? 'text-teal-600 dark:text-teal-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                      >
                        {t.title}
                        {activeTabId === t.id && (
                          <motion.div
                            layoutId="active-tab-indicator"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 dark:bg-teal-400"
                          />
                        )}
                        {t.id !== 'dashboard' && (
                          <span
                            onClick={(e) => { e.stopPropagation(); handleCloseTab(t.id); }}
                            className="ml-2 rounded-full p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                          >
                            <X className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pl-4">
                    <button
                      onClick={refreshActiveTab}
                      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      aria-label="Refresh"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>

                      <button
                        onClick={() => setReverseMode(r => !r)}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="Toggle reverse"
                        title="Reverse colors"
                      >
                        {/* Use the imported Moon / Sun icons to indicate reverse state */}
                        {reverseMode ? (
                          <Sun className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        ) : (
                          <Moon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        )}
                        <span className="sr-only">Toggle reverse mode</span>
                      </button>
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeTabId}_${reloadKey}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="flex-1"
                >
                  <div className="h-full w-full">
                    <div className={`w-full h-full p-4 sm:p-6 ${compactTop ? 'pt-2' : ''}`}>
                      <Suspense fallback={<div className="h-full flex items-center justify-center"><LoadingSpinner /></div>}>
                        {loadingModule
                          ? <div className="h-full flex items-center justify-center"><LoadingSpinner /></div>
                          : (components[activeTabId] || components.dashboard)}
                      </Suspense>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </ErrorBoundary>
        </motion.main>
      </div>
      <BottomNav />
    </div>
  );
}
