import React from 'react';
import PropTypes from 'prop-types';
import './Toast.css';

const ToastContainer = ({ toasts, removeToast }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return 'ℹ';
    }
  };

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <div className="toast-icon-container">
            {getIcon(toast.type)}
          </div>
          <div className="toast-content">
            {toast.title && <h4 className="toast-title">{toast.title}</h4>}
            <p className="toast-message">{toast.message}</p>
          </div>
          <button
            className="toast-close"
            onClick={() => removeToast(toast.id)}
            aria-label="Fermer la notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

ToastContainer.propTypes = {
  toasts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
      title: PropTypes.string,
      message: PropTypes.string.isRequired,
    })
  ).isRequired,
  removeToast: PropTypes.func.isRequired,
};

export default ToastContainer;
