import React from 'react';

// PUBLIC_INTERFACE
export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  /** Themed button component. */
  return <button className={`btn btn-${variant} btn-${size} ${className}`} {...props} />;
}

// PUBLIC_INTERFACE
export function Card({ className = '', children }) {
  /** Simple surface container. */
  return <div className={`card ${className}`}>{children}</div>;
}

// PUBLIC_INTERFACE
export function Pill({ tone = 'neutral', children }) {
  /** Small badge-like pill. */
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

// PUBLIC_INTERFACE
export function Modal({ open, title, children, onClose, footer }) {
  /** Modal overlay. */
  if (!open) return null;
  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" aria-label={title || 'Dialog'}>
      <div className="modal">
        <div className="modalHeader">
          <div className="modalTitle">{title}</div>
          <button className="iconBtn" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>
        <div className="modalBody">{children}</div>
        {footer ? <div className="modalFooter">{footer}</div> : null}
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
export function Input({ label, hint, error, ...props }) {
  /** Labeled input with error/hint lines. */
  return (
    <label className="field">
      <span className="fieldLabel">{label}</span>
      <input className={`input ${error ? 'inputError' : ''}`} {...props} />
      {error ? <span className="fieldError">{error}</span> : null}
      {!error && hint ? <span className="fieldHint">{hint}</span> : null}
    </label>
  );
}

// PUBLIC_INTERFACE
export function TextArea({ label, hint, error, ...props }) {
  /** Labeled textarea. */
  return (
    <label className="field">
      <span className="fieldLabel">{label}</span>
      <textarea className={`textarea ${error ? 'inputError' : ''}`} {...props} />
      {error ? <span className="fieldError">{error}</span> : null}
      {!error && hint ? <span className="fieldHint">{hint}</span> : null}
    </label>
  );
}
