import React from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';

const ToastNotification = ({ id, message, type, onClose }) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FaCheckCircle className="toast-icon" />;
      case 'error':
        return <FaExclamationCircle className="toast-icon" />;
      case 'warning':
        return <FaExclamationCircle className="toast-icon" />;
      case 'info':
      default:
        return <FaInfoCircle className="toast-icon" />;
    }
  };

  const getClassName = () => {
    return `toast toast-${type}`;
  };

  return (
    <div className={getClassName()}>
      <div className="toast-icon-container">
        {getIcon()}
      </div>
      <div className="toast-content">
        <p className="toast-message">{message}</p>
      </div>
      <button className="toast-close" onClick={() => onClose(id)}>
        <FaTimes />
      </button>
    </div>
  );
};

export default ToastNotification;
