import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({
  open,
  onClose,
  children,
  className = '',
  closeOnBackdrop = true,
  maxWidth = 'max-w-3xl',
  title = null,
  footer = null,
  closeOnEsc = true,
  showCloseIcon = true,
  ariaLabel = null,
}) {
  const [visible, setVisible] = useState(open);
  const overlayRef = useRef(null);
  const contentRef = useRef(null);
  const previousActiveRef = useRef(null);

  useEffect(() => {
    if (open) setVisible(true);
    else {
      const t = setTimeout(() => setVisible(false), 220);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = orig };
  }, [open]);

  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose && onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, closeOnEsc]);

  // Focus management & simple focus trap
  useEffect(() => {
    if (!open) return;
    previousActiveRef.current = document.activeElement;
    const focusableSelector = 'a[href], area[href], input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';
    const node = contentRef.current;
    const focusable = node ? Array.from(node.querySelectorAll(focusableSelector)).filter(el => el.offsetParent !== null) : [];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (first) first.focus();

    function handleKey(e) {
      if (e.key !== 'Tab') return;
      if (!first || !last) return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last && last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first && first.focus();
        }
      }
    }

    node && node.addEventListener('keydown', handleKey);
    return () => {
      node && node.removeEventListener('keydown', handleKey);
      try { previousActiveRef.current && previousActiveRef.current.focus(); } catch (e) { /* ignore */ }
    };
  }, [open]);

  if (!visible) return null;

  const handleBackdrop = (e) => {
    if (!closeOnBackdrop) return;
    if (e.target === overlayRef.current) {
      onClose && onClose();
    }
  };

  const overlayStyle = {
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)'
  };

  const content = (
    <div
      ref={overlayRef}
      onMouseDown={handleBackdrop}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8`}
      style={{ backgroundColor: open ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)', transition: 'background-color 200ms ease', ...overlayStyle }}
      aria-modal="true"
      role="dialog"
      aria-labelledby={ariaLabel || (title ? 'modal-title' : undefined)}
    >
      <div
        ref={contentRef}
        className={`bg-white rounded-xl shadow-2xl w-full ${maxWidth} transform transition-all duration-200 ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} ${className}`}
        style={{ willChange: 'transform, opacity', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseIcon) && (
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="text-lg font-semibold text-gray-800" id="modal-title">{title}</div>
            {showCloseIcon && onClose && (
              <button onClick={onClose} aria-label="Close" className="text-gray-500 hover:text-gray-700 rounded focus:outline-none focus:ring">
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-auto" style={{ flex: '1 1 auto' }}>
          {children}
        </div>

        {/* Footer area (optional) */}
        {footer && (
          <div className="px-6 py-4 border-t bg-gray-50 rounded-b">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
