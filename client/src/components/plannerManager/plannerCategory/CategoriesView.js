import React, { useState, useEffect } from 'react';
import { ChromePicker } from 'react-color';
import DatePicker from 'react-datepicker';
import ReactModal from 'react-modal';
import useToast from '../../../hooks/useToast';
import ToastContainer from '../../common/Toast/ToastContainer';
import { useTranslation } from '../../common/i18n/i18n';
import './CategoriesView.css';
import { isEmptyString, toLocalISODate } from '../../common/utils';
import { useNavigate, useLocation } from 'react-router-dom';

const CategoryManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    id: null,
    title: '',
    color: '#3683d6',
    start_date: new Date(),
    end_date: null,
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [errors, setErrors] = useState({});
  const { t } = useTranslation();

  // Effect to load initial data when the component mounts
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/category');
        if (!response.ok) throw new Error('Erreur lors du chargement des catégories');
        const data = await response.json();
        setCategories(data);
        showSuccess(t('dataLoadedSuccessfully'));
      } catch (error) {
        console.error('Erreur:', error);
        showError(t('errorLoadingCategories'), 'error');
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [showSuccess, showError, t]);

  // Function to fetch categories from the API
  const fetchCategories = async (showSuccessMsg = true) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/category');
      if (!response.ok) throw new Error('Erreur lors du chargement des catégories');
      const data = await response.json();
      setCategories(data);
      if (showSuccessMsg) {
        showSuccess(t('dataLoadedSuccessfully'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      showError(t('errorLoadingCategories'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle changes in form inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Function to open the modal for adding/editing a category
  const openModalForCategory = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        id: category.id,
        title: category.title,
        color: category.color || '#3683d6',
        start_date: new Date(category.start_date),
        end_date: category.end_date ? new Date(category.end_date) : null
      });
      // Mettre à jour l'URL pour refléter que nous sommes en mode édition
      navigate(`${location.pathname}?categoryId=${category.id}&mode=edit`);
    } else {
      setEditingCategory(null);
      setFormData({
        id: null,
        title: '',
        color: '#3683d6',
        start_date: new Date(),
        end_date: null
      });
      // Mettre à jour l'URL pour refléter que nous sommes en mode création
      navigate(`${location.pathname}?mode=create`);
    }
    setIsModalOpen(true);
  };

  // Function to close the modal for adding/editing a category
  const closeModalForCategory = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setErrors({});
    setFormData({
      id: null,
      title: '',
      color: '#3683d6',
      start_date: new Date(),
      end_date: null,
    });
    navigate(location.pathname, { replace: true });
  };

  // Function to handle color changes
  const handleColorChange = (color) => {
    setFormData(prev => ({
      ...prev,
      color: color.hex
    }));
  };

  // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const newErrors = {};
    try {
      if (isEmptyString(formData.title)) {
        console.log("here")
        newErrors.title = t('titleRequired');
      }
      // Validation pour start_date
      if (isEmptyString(formData.start_date)) {
        newErrors.start_date = t('start_dateRequired');
      }
      setErrors(newErrors);
      if (Object.keys(newErrors).length === 0) {
        const formattedData = {
          ...formData,
          start_date: toLocalISODate(formData.start_date),
          end_date: formData.end_date ? toLocalISODate(formData.end_date) : null
        };
        if (editingCategory) {
          await handleEditCategory(formattedData);
        } else {
          await handleAddCategory(formattedData);
        }
        closeModalForCategory();
      }
    } catch (error) {
      console.error('Erreur:', error);
      showError(t('errorSaving'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to add a new category
  const handleAddCategory = async (categoryData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      });
      if (!response.ok) throw new Error('Erreur lors de l\'ajout');
      await fetchCategories(false);
      showSuccess(t('categoryAddedSuccessfully'), 'success');
      return { success: true };
    } catch (error) {
      console.error('Erreur:', error);
      showError(t('errorAddingCategory'), 'error');
      return { success: false, message: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Function to edit an existing category
  const handleEditCategory = async (categoryData) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/category/${categoryData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      });
      if (!response.ok) throw new Error('Erreur lors de la mise à jour');
      await fetchCategories(false);
      showSuccess(t('categoryUpdatedSuccessfully'), 'success');
      return { success: true };
    } catch (error) {
      console.error('Erreur:', error);
      showError(t('errorUpdatingCategory'), 'error');
      return { success: false, message: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Function to delete a category
  const handleDeleteCategory = async (category_id) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/category/${category_id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Erreur lors de la suppression');
      await fetchCategories(false);
      showSuccess(t('categoryDeletedSuccessfully'), 'success');
      return { success: true };
    } catch (error) {
      console.error('Erreur:', error);
      showError(t('errorDeletingCategory'), 'error');
      return { success: false, message: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle the delete button click
  const handleDelete = (category_id) => {
    navigate(`${location.pathname}?categoryId=${category_id}&mode=delete`);
    setCategoryToDelete(category_id);
    setIsDeleteModalOpen(true);
  };

  // Function to confirm the deletion of a category
  const confirmDelete = async () => {
    if (categoryToDelete) {
      await handleDeleteCategory(categoryToDelete);
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <div className="category-management-container">
      <h2>{t('categoryManagement')}</h2>
      <div className="category-actions">
        <button
          className="button add-button"
          onClick={() => openModalForCategory()}
        >
          + {t('addCategory')}
        </button>
      </div>
      <div className="category-list">
        {categories.length === 0 ? (
          <div className="empty-state">
            <p>{t('noCategoriesAdded')}</p>
          </div>
        ) : (
          <div className="category-grid">
            {categories.map(category => (
              <div key={category.id} className="category-card">
                <div
                  className="category-color-indicator"
                  style={{ backgroundColor: category.color || '#3683d6' }}
                ></div>
                <div className="category-info">
                  <h3>{category.title}</h3>
                  <div className="category-dates">
                    <p>{t('start_date')}: {category.start_date ? new Date(category.start_date).toLocaleDateString() : 'N/A'}</p>
                    <p>{t('end_date')}: {category.end_date ? new Date(category.end_date).toLocaleDateString() : t('noend_date')}</p>
                  </div>
                </div>
                <div className="category-actions">
                  <button
                    className="button edit-button"
                    onClick={() => openModalForCategory(category)}
                    title={t('edit')}
                  >
                    ✏️
                  </button>
                  <button
                    className="button delete-button"
                    onClick={() => handleDelete(category.id)}
                    title={t('delete')}
                  >
                    ❌
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ReactModal
        isOpen={isModalOpen}
        onRequestClose={closeModalForCategory}
        className="category-modal"
        overlayClassName="ReactModal__Overlay"
        contentLabel={editingCategory ? t('editCategory') : t('addCategory')}
        ariaHideApp={false}
        shouldCloseOnOverlayClick={true}
      >
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-header">
            <h3 className="modal-title">
              {editingCategory ? t('editCategory') : t('addCategory')}
            </h3>
            <button
              type="button"
              className="modal-close"
              onClick={closeModalForCategory}
            >
              ×
            </button>
          </div>
          <div className="modal-content">
            <div className="form-group">
              <label htmlFor="title" className="required-field">{t('title')}</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="form-control"
                disabled={isSubmitting}
              />
              {errors.title && (
                <div className="form-error">
                  <span className="form-error-icon">⚠️</span>
                  <span id="title-error">{errors.title}</span>
                </div>
              )}
            </div>
            <div className="form-group">
              <label>{t('color')}</label>
              <div className="color-picker-container">
                <div
                  className="color-preview"
                  style={{ backgroundColor: formData.color }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                >
                  <div className="color-preview-inner">
                    {formData.color}
                    <div className="color-preview-swatch" style={{ backgroundColor: formData.color }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="form-row"></div>
              <div className="form-group">
                <label htmlFor="start_date" className="required-field">{t('start_date')}</label>
                <DatePicker
                  id="start_date"
                  name="start_date"
                  selected={formData.start_date}
                  onChange={(date) => setFormData(prev => ({ ...prev, start_date: date }))}
                  dateFormat="yyyy-MM-dd"
                  className="form-control"
                  disabled={isSubmitting}
                  portalId="date-picker-portal"
                  popperPlacement="bottom-start"
                  withPortal
                />
                {errors.start_date && (
                  <div className="form-error">
                    <span className="form-error-icon">⚠️</span>
                    <span id="start_date-error">{errors.start_date}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="end_date">{t('end_dateOptional')}</label>
                <DatePicker
                  id="end_date"
                  name="end_date"
                  selected={formData.end_date}
                  onChange={(date) => setFormData(prev => ({ ...prev, end_date: date }))}
                  dateFormat="yyyy-MM-dd"
                  className="form-control"
                  disabled={isSubmitting}
                  minDate={formData.start_date}
                  isClearable
                  placeholderText={t('selectend_date')}
                  portalId="date-picker-portal"
                  popperPlacement="bottom-start"
                  withPortal

                />
              </div>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="modal-button secondary"
              onClick={closeModalForCategory}
              disabled={isSubmitting}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="modal-button primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner spinner-small"></span>
                  {t('saving')}
                </>
              ) : (editingCategory ? t('update') : t('add'))}
            </button>
          </div>
        </form>
      </ReactModal>
      <ReactModal
        isOpen={isDeleteModalOpen}
        onRequestClose={() => setIsDeleteModalOpen(false)}
        className="category-modal"
        overlayClassName="ReactModal__Overlay"
        contentLabel={t('confirmDeletion')}
        ariaHideApp={false}
        shouldCloseOnOverlayClick={true}
      >
        <div className="modal-form">
          <div className="modal-header">
            <h3 className="modal-title">{t('confirmDeletion')}</h3>
            <button
              type="button"
              className="modal-close"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              ×
            </button>
          </div>
          <div className="modal-content">
            <p>{t('confirmDeleteCategoryMessage')}</p>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="modal-button secondary"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              className="modal-button primary"
              onClick={confirmDelete}
            >
              {t('confirm')}
            </button>
          </div>
        </div>
      </ReactModal>
      {showColorPicker && (
        <div className="color-picker-portal">
          <div className="color-picker-backdrop" onClick={() => setShowColorPicker(false)} />
          <div className="color-picker-wrapper">
            <ChromePicker
              color={formData.color}
              onChange={handleColorChange}
              disableAlpha={true}
            />
            <div className="color-picker-actions">
              <button
                type="button"
                className="color-picker-button"
                onClick={() => setShowColorPicker(false)}
              >
                {t('validate')}
              </button>
            </div>
          </div>
        </div>
      )}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default CategoryManagement;
