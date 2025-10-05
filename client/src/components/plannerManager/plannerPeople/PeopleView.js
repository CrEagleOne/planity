import React, { useState, useEffect, useRef } from 'react';
import ToastContainer from '../../common/Toast/ToastContainer';
import ReactModal from 'react-modal';
import { FiUploadCloud, FiTrash2 } from 'react-icons/fi';
import { useTranslation } from '../../common/i18n/i18n';
import './PeopleView.css';
import useToast from '../../../hooks/useToast';
import DatePicker from 'react-datepicker';
import { generateAvatarImage, isEmptyString, toLocalISODate, compressImage, getInitials } from '../../common/utils';
import { useNavigate, useLocation } from 'react-router-dom';

const PeopleFormModal = ({
  isOpen,
  onSubmit,
  onRequestClose,
  editingPerson
}) => {
  // Initialize translation hook and state variables
  const { t, currentLocale } = useTranslation();
  const [personData, setpersonData] = useState({
    id: null,
    last_name: '',
    first_name: '',
    avatar: null,
    birthday_date: ''
  });
  const [avatarPreview] = useState(null);
  const [setIsDragOver] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState(null);
  const [isCompressing] = useState(false);
  const [isSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const [errors, setErrors] = useState({});


  // Initialize form data based on whether we're editing an existing person or adding a new one
  React.useEffect(() => {
    if (editingPerson) {
      setpersonData({
        id: editingPerson.id || null,
        last_name: editingPerson.last_name || '',
        first_name: editingPerson.first_name || '',
        avatar: editingPerson.avatar || null,
        birthday_date: editingPerson.birthday_date || ''
      });
      if (editingPerson.avatar) {
        setPreviewAvatar(editingPerson.avatar);
      } else if (editingPerson.last_name && editingPerson.first_name) {
        const initials = getInitials(editingPerson.last_name, editingPerson.first_name);
        setPreviewAvatar(generateAvatarImage(initials));
      }
    } else {
      setpersonData({
        last_name: '',
        first_name: '',
        avatar: null,
        birthday_date: ''
      });
      setPreviewAvatar(null);
    }
  }, [editingPerson]);

  // Handle input changes for form fields
  const handleChange = (e) => {
    const { name, value } = e.target;
    setpersonData(prev => ({
      ...prev,
      [name]: value
    }));
    if ((name === 'first_name' || name === 'last_name') && !personData.avatar) {
      const last_nameValue = name === 'last_name' ? value : personData.last_name;
      const first_nameValue = name === 'first_name' ? value : personData.first_name;
      if (last_nameValue && first_nameValue) {
        const initials = getInitials(last_nameValue, first_nameValue);
        setPreviewAvatar(generateAvatarImage(initials));
      }
    }
  };

  // Handle date changes for the birthday field
  const handleDateChange = (date) => {
    const formattedDate = date ? toLocalISODate(date) : '';
    setpersonData(prev => ({
      ...prev,
      birthday_date: formattedDate
    }));
  };

  // Handle form submission with validation
  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    // Validate last name
    if (!personData.last_name.trim()) {
      newErrors.last_name = t('last_nameRequired');
    } else if (personData.last_name.trim().length < 2 || personData.last_name.trim().length > 50) {
      newErrors.last_name = t('last_nameLengthInvalid', { min: 2, max: 50 });
    }

    // Validate first name
    if (!personData.first_name.trim()) {
      newErrors.first_name = t('first_nameRequired');
    } else if (personData.first_name.trim().length < 2 || personData.first_name.trim().length > 50) {
      newErrors.first_name = t('first_nameLengthInvalid', { min: 2, max: 50 });
    }

    // Validate birthday date
    if (isEmptyString(personData.birthday_date)) {
      newErrors.birthday_date = t('birthday_dateRequired');
    } else if (personData.birthday_date) {
      const birthday_date = new Date(personData.birthday_date);
      const now = new Date();
      const minAgeDate = new Date();
      minAgeDate.setFullYear(now.getFullYear() - 120);

      if (isNaN(birthday_date.getTime())) {
        newErrors.birthday_date = t('invalidDate');
      } else if (birthday_date > now) {
        newErrors.birthday_date = t('birthday_dateInFuture');
      } else if (birthday_date < minAgeDate) {
        newErrors.birthday_date = t('birthday_dateTooOld');
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      let avatarValue = personData.avatar;
      if (!avatarValue && personData.last_name && personData.first_name) {
        const initials = getInitials(personData.last_name, personData.first_name);
        avatarValue = generateAvatarImage(initials);
      }
      const dataToSubmit = {
        ...personData,
        avatar: avatarValue
      };
      // Determine action type (add/edit) based on whether we have an ID
      const actionType = editingPerson ? 'edit' : 'add';
      onSubmit(dataToSubmit, actionType);
    }
  };

  // Handle drag over event for avatar upload
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  // Handle drag leave event for avatar upload
  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  // Handle file drop for avatar upload
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert(t('fileTooLarge'));
        return;
      }
      try {
        const compressedFile = await compressImage(file);
        if (compressedFile.size > 1 * 1024 * 1024) {
          alert(t('compressedImageTooLarge'));
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewAvatar(reader.result);
          setpersonData(prev => ({
            ...prev,
            avatar: reader.result
          }));
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error('Error processing image:', error);
        alert(t('imageProcessingError'));
      }
    }
  };

  // Remove the avatar
  const removeAvatar = () => {
    setPreviewAvatar(null);
    setpersonData(prev => ({
      ...prev,
      avatar: null
    }));
  };

  // Handle file selection for avatar upload
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert(t('fileTooLarge'));
        return;
      }
      try {
        const compressedFile = await compressImage(file);
        if (compressedFile.size > 1 * 1024 * 1024) {
          alert(t('compressedImageTooLarge'));
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewAvatar(reader.result);
          setpersonData(prev => ({
            ...prev,
            avatar: reader.result
          }));
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error('Error processing image:', error);
        alert(t('imageProcessingError'));
      }
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel={editingPerson ? t('editPerson') : t('addPerson')}
      className="people-modal"
      overlayClassName="people-modal-overlay"
    >
      <div className="modal-header">
        <h2 className="modal-title">{editingPerson ? t('editPerson') : t('addPerson')}</h2>
        <button className="modal-close" onClick={onRequestClose}>
          ×
        </button>
      </div>
      <form onSubmit={handleSubmit} className="people-form modal-form">
        <div className="form-section modal-content">
          <div className="avatar-upload-section">
            <div
              className="avatar-drop-zone"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              role="button"
              aria-label={t('dragDropOrClick')}
              tabIndex="0"
            >
              <div className="avatar-preview-container">
                {previewAvatar ? (
                  typeof previewAvatar === 'string' && (previewAvatar.startsWith('http') || previewAvatar.startsWith('data:image')) ? (
                    <img src={previewAvatar} alt={t('avatar')} className="avatar-image" />
                  ) : (
                    <div className="avatar-initials-container">
                      <div className="avatar-initials">
                        {previewAvatar}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="avatar-placeholder" style={{ backgroundColor: '#4a4a4a' }}>
                    {personData.last_name?.charAt(0).toUpperCase() ||
                     personData.first_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <div className="dropzone-content">
                <FiUploadCloud size={24} className="upload-icon" />
                <p className="dropzone-text">
                  {t('dragDropHere')}
                </p>
                <p className="dropzone-subtext">
                  {t('orClickToSelect')}
                </p>
                <p className="file-requirements">
                  {t('fileRequirements')}
                </p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
                aria-label={t('selectImage')}
              />
              {isCompressing && (
                <div className="compression-overlay">
                  <div className="spinner"></div>
                  <p className="compression-message">{t('compressingImage')}</p>
                </div>
              )}
            </div>
            <div className="avatar-actions">
              <label className="upload-button modal-button">
                <FiUploadCloud size={16} />
                <span>{avatarPreview ? t('changeImage') : t('chooseImage')}</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              </label>
              {previewAvatar && (
                <button
                  type="button"
                  className="remove-avatar-button modal-button secondary"
                  onClick={removeAvatar}
                  disabled={isSubmitting}
                >
                  <FiTrash2 size={16} />
                  <span>{t('delete')}</span>
                </button>
              )}
            </div>
          </div>
          <div className="form-fields">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="last_name" className="required-field">{t('last_name')}</label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={personData.last_name}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="form-control"
                />
                {errors.last_name && (
                  <div className="form-error">
                    <span className="form-error-icon">⚠️</span>
                    <span id="last_name-error">{errors.last_name}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="first_name" className="required-field">{t('first_name')}</label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={personData.first_name}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="form-control"
                />
                {errors.first_name && (
                  <div className="form-error">
                    <span className="form-error-icon">⚠️</span>
                    <span id="first_name-error">{errors.first_name}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="birthday_date" className="required-field">{t('birthday_date')}</label>
                <DatePicker
                  selected={personData.birthday_date ? new Date(personData.birthday_date) : null}
                  onChange={handleDateChange}
                  dateFormat="yyyy-MM-dd"
                  locale={currentLocale()}
                  className="form-control"
                  id="birthday_date"
                  name="birthday_date"
                  placeholderText="YYYY-MM-DD"
                  showMonthDropdown
                  showYearDropdown
                  dropdownMode="select"
                />
                {errors.birthday_date && (
                  <div className="form-error">
                    <span className="form-error-icon">⚠️</span>
                    <span id="birthday_date-error">{errors.birthday_date}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="modal-button secondary"
            onClick={onRequestClose}
            disabled={isSubmitting}
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            className="modal-button primary"
            disabled={isSubmitting || !personData.last_name || !personData.first_name}
          >
            {isSubmitting ? t('saving') : (editingPerson ? t('update') : t('add'))}
          </button>
        </div>
      </form>
    </ReactModal>
  );
};

const PeopleManagement = () => {
  // Initialize hooks for navigation, location, state, and translation
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const [people, setPeople] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [PersonToDelete, setPersonToDelete] = useState(null);
  const { t } = useTranslation();

  // Load initial data on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/people');
        if (!response.ok) throw new Error('Erreur lors du chargement des personnes');
        const data = await response.json();
        showSuccess(t('dataLoadedSuccessfully'));
        setPeople(data);
      } catch (error) {
        console.error('Erreur:', error);
        showError(t('errorLoadingPeople'));
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [showSuccess, showError, t]);

  // Fetch people data from API
  const fetchPeople = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/people');
      if (!response.ok) throw new Error('Erreur lors du chargement des personnes');
      const data = await response.json();
      setPeople(data);
    } catch (error) {
      console.error('Erreur:', error);
      showError(t('errorLoadingPeople'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new person
  const handleAddPerson = async (personData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personData)
      });
      if (!response.ok) throw new Error('Erreur lors de l\'ajout');
      const newPerson = await response.json();
      setPeople(prev => [...prev, newPerson]);
      await fetchPeople();
      showSuccess(t('personAddedSuccessfully'), 'success');
      return newPerson;
    } catch (error) {
      console.error('Erreur:', error);
      showError(t('errorAddingPerson'), 'error');
      return { success: false, message: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Edit an existing person
  const handleEditPerson = async (personData) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/people/${personData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personData)
      });
      if (!response.ok) throw new Error('Erreur lors de la mise à jour');
      await fetchPeople();
      showSuccess(t('personUpdatedSuccessfully'), 'success');
      return { success: true };
    } catch (error) {
      console.error('Erreur:', error);
      showError(t('errorUpdatingPerson'), 'error');
      return { success: false, message: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a person
  const handleDeleteEvent = async (personId) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/people/${personId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Erreur lors de la suppression');
      await fetchPeople();
      showSuccess(t('personDeletedSuccessfully'), 'success');
      return { success: true };
    } catch (error) {
      console.error('Erreur:', error);
      showError(t('errorDeletingPerson'), 'error');
      return { success: false, message: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Open modal for adding/editing a person
  const openModalForPerson = (person = null) => {
    setEditingPerson(person);
    setIsModalOpen(true);
    if (person) {
      navigate(`${location.pathname}?personId=${person.id}&mode=edit`);
    } else {
      navigate(`${location.pathname}?mode=create`);
    }
  };

  // Close the modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPerson(null);
    navigate(location.pathname);
  };

  // Handle form submission from the modal
  const handleSubmit = async (personData, actionType) => {
    try {
      let result;
      if (actionType === 'edit' && personData.id) {
        result = await handleEditPerson(personData);
      } else {
        result = await handleAddPerson(personData);
      }
      closeModal(); // Close the modal after submission
      await fetchPeople(); // Refresh the list
      return result;
    } catch (error) {
      console.error('Erreur:', error);
      showError(t('errorSaving'), 'error');
      throw error;
    }
  };

  // Handle person deletion
  const handleDelete = (personId) => {
    navigate(`${location.pathname}?personId=${personId}&mode=delete`);
    setPersonToDelete(personId);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete action
  const confirmDelete = async () => {
    if (PersonToDelete) {
      await handleDeleteEvent(PersonToDelete);
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <div className="people-management-container">
      <h2>{t('peopleManagement')}</h2>
      <div className="people-actions">
        <button
          className="button add-button"
          onClick={() => openModalForPerson()}
        >
          + {t('addPerson')}
        </button>
      </div>
      <div className="people-list">
        {isLoading ? (
          <div className="loading-state">
            <p>{t('loading')}</p>
          </div>
        ) : people.length === 0 ? (
          <div className="empty-state">
            <p>{t('noPeopleAdded')}</p>
          </div>
        ) : (
          <div className="people-grid">
            {people.map(person => (
              <div key={person.id} className="person-card">
                <div className="person-avatar-container">
                  {person.avatar ? (
                    <img
                      src={person.avatar}
                      alt={person.last_name}
                      className="person-avatar"
                      style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      className="person-avatar-placeholder"
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        backgroundColor: '#4a4a4a',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: '#fff',
                        fontWeight: 'bold'
                      }}
                    >
                      {person.last_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="person-info">
                  <h3 style={{ marginTop: '10px' }}>{person.first_name} {person.last_name}</h3>
                  {person.birthday_date && <p className="person-detail">{person.birthday_date}</p>}
                </div>
                <div className="person-actions">
                  <button
                    className="button edit-button"
                    onClick={() => openModalForPerson(person)}
                    title={t('edit')}
                  >
                    ✏️
                  </button>
                  <button
                    className="button delete-button"
                    onClick={() => handleDelete(person.id)}
                    title={t('delete')}
                  >
                    ❌
                  </button>
                </div>
              </div>
            ))}
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
          </div>
        )}
      </div>
      <PeopleFormModal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        onSubmit={handleSubmit}
        editingPerson={editingPerson}
      />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default PeopleManagement;
