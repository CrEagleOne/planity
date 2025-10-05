import { useState, useCallback } from 'react';
import { useTranslation } from '../components/common/i18n/i18n';

const useToast = () => {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', title = '', duration = 5000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { id, message, type, title };
    setToasts((prevToasts) => [...prevToasts, newToast]);
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const showSuccess = useCallback((message, title = t('success')) => {
    showToast(message, 'success', title);
  }, [showToast, t]);

  const showError = useCallback((message, title = t('error')) => {
    showToast(message, 'error', title);
  }, [showToast, t]);

  const showWarning = useCallback((message, title = t('warning')) => {
    showToast(message, 'warning', title);
  }, [showToast, t]);

  const showInfo = useCallback((message, title = t('info')) => {
    showToast(message, 'info', title);
  }, [showToast, t]);

  return {
    toasts,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};

export default useToast;
