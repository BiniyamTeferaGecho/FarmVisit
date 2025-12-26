import React, { useEffect, useRef, useState, Suspense } from 'react';
import Modal from './Modal';
const ProfileModal = React.lazy(() => import('../pages/profile'));
const SettingsModal = React.lazy(() => import('../pages/settings'));
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserCircle, FaCog, FaSignOutAlt, FaBell, FaSearch, FaBars, FaTh } from 'react-icons/fa';
import akfLogo from '../assets/images/AKF-Logo.png';
import { useAuth } from '../auth/AuthProvider';

function getInitials(name, fallback) {
  if (!name) return (fallback || '').slice(0, 2).toUpperCase();
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function TopNavFixed({ onToggleSidebar, onToggleCollapse }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const [imgError, setImgError] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, []);

  useEffect(() => {
    setImgError(false);
  }, [user?.avatarUrl]);

  const handleNavigate = (path) => {
    setOpen(false);
    navigate(path);
  };

  const openProfileModal = () => { setOpen(false); setShowProfileModal(true); };
  const openSettingsModal = () => { setOpen(false); setShowSettingsModal(true); };

  return (
    <>
    <header className="sticky top-0 z-50 w-full bg-white shadow-md h-16">
      <div className="w-full flex items-center justify-between px-4 h-full">
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            className="lg:hidden p-2 rounded-full hover:bg-gray-200 transition-colors"
          >
            <FaBars className="h-5 w-5 text-gray-600" />
          </button>
          <a href="#" className="flex items-center gap-3">
            <img src={akfLogo} alt="AKF" className="h-10 w-auto" />
            <span className="hidden sm:inline-block text-xl font-bold text-gray-800">
              Farm Visit Management
            </span>
          </a>
        </div>

        <div className="flex-1 flex justify-center px-4">
          <div className="relative w-full max-w-lg">
            <input
              type="search"
              placeholder="Search..."
              className="w-full h-10 pl-10 pr-4 rounded-full bg-gray-100 border-transparent focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <FaSearch className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={onToggleCollapse} 
            title="Collapse sidebar" 
            className="hidden lg:inline-flex p-2 rounded-full hover:bg-gray-200 transition-colors"
          >
            <FaTh className="h-5 w-5 text-gray-600" />
          </button>
          <button className="p-2 rounded-full hover:bg-gray-200 transition-colors">
            <FaBell className="h-5 w-5 text-gray-600" />
          </button>

          <div className="relative" ref={menuRef}>
            {user ? (
              <>
                <button
                  onClick={() => setOpen((prev) => !prev)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-200 transition-colors"
                  aria-haspopup="true"
                  aria-expanded={open}
                >
                  {user.avatarUrl && !imgError ? (
                    <img 
                      src={user.avatarUrl} 
                      alt={user.username || 'User'} 
                      onError={() => setImgError(true)} 
                      className="w-10 h-10 rounded-full object-cover border-2 border-gray-200" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold text-sm">
                      {getInitials(user.employee?.fullName || user.username || user.email || 'U')}
                    </div>
                  )}
                </button>

                <AnimatePresence>
                  {open && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
                    >
                      <div className="p-2">
                        <div className="flex items-center gap-3 px-3 py-2">
                          {user.avatarUrl && !imgError ? (
                            <img src={user.avatarUrl} alt="User" className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold">
                              {getInitials(user.employee?.fullName || user.username || 'U')}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-800 truncate max-w-[120px]">
                              {user.employee?.fullName ?? user.fullName ?? user.username}
                            </p>
                            <p className="text-xs text-gray-500 truncate max-w-[120px]">
                              {user.email ?? 'No email'}
                            </p>
                          </div>
                        </div>
                        <div className="border-t border-gray-200 my-2" />
                        <button
                          onClick={openProfileModal}
                          className="w-full flex items-center gap-3 text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          <FaUserCircle className="h-5 w-5 text-gray-500" />
                          <span>Profile</span>
                        </button>
                        <button
                          onClick={openSettingsModal}
                          className="w-full flex items-center gap-3 text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          <FaCog className="h-5 w-5 text-gray-500" />
                          <span>Settings</span>
                        </button>
                        <div className="border-t border-gray-200 my-2" />
                        <button
                          onClick={() => {
                            setOpen(false);
                            logout();
                            navigate('/', { replace: true });
                          }}
                          className="w-full flex items-center gap-3 text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <FaSignOutAlt className="h-5 w-5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              location.pathname === '/' && (
                <button 
                  onClick={() => navigate('/')} 
                  className="px-4 py-2 rounded-full bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors"
                >
                  Sign In
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </header>

    {/* Profile Modal */}
    <Modal open={showProfileModal} onClose={() => setShowProfileModal(false)} maxWidth="max-w-2xl" title="Profile">
      <Suspense fallback={<div className="p-6">Loading...</div>}>
        <ProfileModal modal={true} />
      </Suspense>
    </Modal>

    {/* Settings Modal */}
    <Modal open={showSettingsModal} onClose={() => setShowSettingsModal(false)} maxWidth="max-w-2xl" title="Settings">
      <Suspense fallback={<div className="p-6">Loading...</div>}>
        <SettingsModal modal={true} />
      </Suspense>
    </Modal>
    </>
  );
}