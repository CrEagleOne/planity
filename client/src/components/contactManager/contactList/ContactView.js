import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import ReactModal from 'react-modal';
import { useTranslation } from '../../common/i18n/i18n';
import { useNavigate, useLocation } from 'react-router-dom';
import useToast from '../../../hooks/useToast';
import ToastContainer from '../../common/Toast/ToastContainer';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './ContactView.css';

const ContactBook = () => {
  const { t, currentLocale } = useTranslation();
  const { showSuccess, showError, toasts, removeToast } = useToast();
  const [contacts, setContacts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [modalType, setModalType] = useState(''); // 'create', 'edit', 'view'
  const [selectedContact, setSelectedContact] = useState(null);
  const [formData, setFormData] = useState({
    last_name: '',
    first_name: '',
    birthday_date: null,
    address: '',
    postal_code: '',
    city: '',
    country: '',
    email: '',
    mobile_phone: '',
    fixed_phone: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState({});
  const modalRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Manage body overflow when modals are open
  useEffect(() => {
    if (isModalOpen || isDeleteModalOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isModalOpen, isDeleteModalOpen]);

  // Fetch contacts from the database
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/contact');
        if (!response.ok) {
          throw new Error(t('errorFetchingContacts'));
        }
        const data = await response.json();
        setContacts(data);
      } catch (error) {
        showError(error.message || t('errorFetchingContacts'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchContacts();
  }, [t, showError]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle date change
  const handleDateChange = (date) => {
    setFormData({
      ...formData,
      birthday_date: date
    });
  };

  // Handle copy to clipboard with visual feedback
  const handleCopy = (value, fieldName, e) => {
    if (e) {
      e.stopPropagation();
    }
    if (value) {
      navigator.clipboard.writeText(value);
      showSuccess(t('copiedToClipboard'));
      setCopySuccess(prev => ({...prev, [fieldName]: true}));
      setTimeout(() => {
        setCopySuccess(prev => ({...prev, [fieldName]: false}));
      }, 2000);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    // Validate required fields
    if (!formData.last_name) {
      newErrors.last_name = t('lastNameRequired');
    }
    if (!formData.first_name) {
      newErrors.first_name = t('firstNameRequired');
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      try {
        let response;
        const contactData = {
          ...formData,
          birthday_date: formData.birthday_date ? format(formData.birthday_date, 'yyyy-MM-dd') : null
        };
        if (modalType === 'create') {
          response = await fetch('/api/contact', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(contactData),
          });
        } else if (modalType === 'edit') {
          response = await fetch(`/api/contact/${selectedContact.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(contactData),
          });
        }
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || t('errorSavingContact'));
        }
        showSuccess(t(modalType === 'create' ? 'contactCreatedSuccessfully' : 'contactUpdatedSuccessfully'));
        setIsModalOpen(false);
        // Refresh the contact list
        const updatedResponse = await fetch('/api/contact');
        const updatedData = await updatedResponse.json();
        setContacts(updatedData);
      } catch (error) {
        showError(error.message || t('errorSavingContact'));
      }
    }
  };

  // Handle contact deletion
  const handleDelete = (contactId) => {
    navigate(`${location.pathname}?contactId=${contactId}&mode=delete`);
    setContactToDelete(contactId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`/api/contact/${contactToDelete}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(t('errorDeletingContact'));
      }
      showSuccess(t('contactDeletedSuccessfully'));
      // Refresh the contact list
      const updatedResponse = await fetch('/api/contact');
      const updatedData = await updatedResponse.json();
      setContacts(updatedData);
      setIsDeleteModalOpen(false);
    } catch (error) {
      showError(error.message || t('errorDeletingContact'));
    }
  };

  // Handle contact edit
  const handleEdit = (contact) => {
    setSelectedContact(contact);
    setFormData({
      last_name: contact.last_name,
      first_name: contact.first_name,
      birthday_date: contact.birthday_date ? new Date(contact.birthday_date) : null,
      address: contact.address || '',
      postal_code: contact.postal_code || '',
      city: contact.city || '',
      country: contact.country || '',
      email: contact.email || '',
      mobile_phone: contact.mobile_phone || '',
      fixed_phone: contact.fixed_phone || ''
    });
    setModalType('edit');
    navigate(`${location.pathname}?contactId=${contact.id}&mode=edit`);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModalForContact = () => {
    setIsModalOpen(false);
    setErrors({});
    setFormData({
      last_name: '',
      first_name: '',
      birthday_date: null,
      address: '',
      postal_code: '',
      city: '',
      country: '',
      email: '',
      mobile_phone: '',
      fixed_phone: ''
    });
    navigate(location.pathname, { replace: true });
  };

  // Handle contact view
  const handleView = (contact) => {
    setSelectedContact(contact);
    setFormData({
      last_name: contact.last_name,
      first_name: contact.first_name,
      birthday_date: contact.birthday_date ? new Date(contact.birthday_date) : null,
      address: contact.address || '',
      postal_code: contact.postal_code || '',
      city: contact.city || '',
      country: contact.country || '',
      email: contact.email || '',
      mobile_phone: contact.mobile_phone || '',
      fixed_phone: contact.fixed_phone || ''
    });
    setModalType('view');
    navigate(`${location.pathname}?contactId=${contact.id}&mode=view`);
    setIsModalOpen(true);
  };

  // Group contacts by the first letter of the last name
  const groupContactsByLetter = () => {
    const groupedContacts = {};
    contacts.forEach(contact => {
      const firstLetter = contact.last_name.charAt(0).toUpperCase();
      if (!groupedContacts[firstLetter]) {
        groupedContacts[firstLetter] = [];
      }
      groupedContacts[firstLetter].push(contact);
    });
    return groupedContacts;
  };

  // Sort letters alphabetically
  const sortedLetters = Object.keys(groupContactsByLetter()).sort();

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        closeModalForContact();
      }
    };
    if (isModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModalOpen]);

  return (
    <div className="contact-book-container">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="contact-book-header">
        <h1 className="contact-book-title">{t('contactBook')}</h1>
        <button
          className="add-contact-button"
          onClick={() => {
            setModalType('create');
            setFormData({
              last_name: '',
              first_name: '',
              birthday_date: null,
              address: '',
              postal_code: '',
              city: '',
              country: '',
              email: '',
              mobile_phone: '',
              fixed_phone: ''
            });
            navigate(`${location.pathname}?mode=create`);
            setIsModalOpen(true);
          }}
          aria-label={t('addContact')}
        >
          {t('addContact')}
        </button>
      </div>
      {isLoading ? (
        <div className="loading-message">{t('loadingContacts')}</div>
      ) : (
        <div className="contact-content">
          {Object.keys(groupContactsByLetter()).length === 0 ? (
            <div className="no-contacts">{t('noContactsFound')}</div>
          ) : (
            <div className="contact-list">
              {sortedLetters.map(letter => (
                <div key={letter} className="contact-category">
                  <h2 className="contact-category-header">{letter}</h2>
                  {groupContactsByLetter()[letter].map(contact => (
                    <div key={contact.id} className="contact-item">
                      <div className="contact-info">
                        <div className="contact-name">{contact.last_name}, {contact.first_name}</div>
                      </div>
                      <div className="contact-actions">
                        <button
                          className="button view-button"
                          onClick={() => handleView(contact)}
                          aria-label={`${t('view')} ${contact.last_name} ${contact.first_name}`}
                          title={t('view')}
                        >
                          👁️
                        </button>
                        <button
                          className="button edit-button"
                          onClick={() => handleEdit(contact)}
                          aria-label={`${t('edit')} ${contact.last_name} ${contact.first_name}`}
                          title={t('edit')}
                        >
                          ✏️
                        </button>
                        <button
                          className="button delete-button"
                          onClick={() => handleDelete(contact.id)}
                          aria-label={`${t('delete')} ${contact.last_name} ${contact.first_name}`}
                          title={t('delete')}
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Contact Modal */}
      <ReactModal
        isOpen={isModalOpen}
        onRequestClose={closeModalForContact}
        contentLabel={
          modalType === 'create' ? t('createContact') :
          modalType === 'edit' ? t('editContact') :
          t('viewContact')
        }
        className="contact-modal"
        overlayClassName="modal-overlay"
        shouldCloseOnOverlayClick={true}
        ariaHideApp={false}
        style={{
          content: {
            maxHeight: '90vh',
            overflowY: 'auto'
          }
        }}
      >
        <div className="modal-container" ref={modalRef}>
          <div className="modal-header">
            <h2 className="modal-title">
              {modalType === 'create' ? t('createContact') :
               modalType === 'edit' ? t('editContact') :
               t('viewContact')}
            </h2>
            <button className="modal-close" onClick={closeModalForContact}>
              ×
            </button>
          </div>
          <form onSubmit={handleSubmit} className="contact-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="last_name" className="required-field">{t('lastName')}</label>
                {modalType === 'view' ? (
                  <div className="view-mode">
                    <span className="view-mode-value">{formData.last_name}</span>
                    <button
                      type="button"
                      className={`copy-button ${copySuccess['last_name'] ? 'success' : ''}`}
                      onClick={(e) => handleCopy(formData.last_name, 'last_name', e)}
                      aria-label={t('copyLastName')}
                    >
                      {copySuccess['last_name'] ? '✓' : '📋'}
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="form-control"
                    aria-required="true"
                  />
                )}
                {errors.last_name && (
                  <div className="form-error">
                    <span className="form-error-icon">⚠️</span>
                    <span id="last_name-error">{errors.last_name}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="first_name" className="required-field">{t('firstName')}</label>
                {modalType === 'view' ? (
                  <div className="view-mode">
                    <span className="view-mode-value">{formData.first_name}</span>
                    <button
                      type="button"
                      className={`copy-button ${copySuccess['first_name'] ? 'success' : ''}`}
                      onClick={(e) => handleCopy(formData.first_name, 'first_name', e)}
                      aria-label={t('copyFirstName')}
                    >
                      {copySuccess['first_name'] ? '✓' : '📋'}
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="form-control"
                    aria-required="true"
                  />
                )}
                {errors.first_name && (
                  <div className="form-error">
                    <span className="form-error-icon">⚠️</span>
                    <span id="first_name-error">{errors.first_name}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="birthday_date">{t('birthday_date')}</label>
                {modalType === 'view' ? (
                  <div className="view-mode">
                    <span className="view-mode-value">
                      {formData.birthday_date ? format(formData.birthday_date, 'yyyy-MM-dd') : t('notSpecified')}
                    </span>
                    <button
                      type="button"
                      className={`copy-button ${copySuccess['birthday_date'] ? 'success' : ''} ${!formData.birthday_date ? 'disabled' : ''}`}
                      onClick={(e) => formData.birthday_date && handleCopy(format(formData.birthday_date, 'yyyy-MM-dd'), 'birthday_date', e)}
                      aria-label={t('copyBirthday')}
                      disabled={!formData.birthday_date}
                    >
                      {copySuccess['birthday_date'] ? '✓' : '📋'}
                    </button>
                  </div>
                ) : (
                  <DatePicker
                    selected={formData.birthday_date}
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
                    isClearable
                  />
                )}
              </div>
              <div className="form-group">
                <label htmlFor="email">{t('email')}</label>
                {modalType === 'view' ? (
                  <div className="view-mode">
                    <span className="view-mode-value">{formData.email || t('notSpecified')}</span>
                    <button
                      type="button"
                      className={`copy-button ${copySuccess['email'] ? 'success' : ''} ${!formData.email ? 'disabled' : ''}`}
                      onClick={(e) => formData.email && handleCopy(formData.email, 'email', e)}
                      aria-label={t('copyEmail')}
                      disabled={!formData.email}
                    >
                      {copySuccess['email'] ? '✓' : '📋'}
                    </button>
                  </div>
                ) : (
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                )}
              </div>
              <div className="form-group">
                <label htmlFor="mobile_phone">{t('mobilePhone')}</label>
                {modalType === 'view' ? (
                  <div className="view-mode">
                    <span className="view-mode-value">{formData.mobile_phone || t('notSpecified')}</span>
                    <button
                      type="button"
                      className={`copy-button ${copySuccess['mobile_phone'] ? 'success' : ''} ${!formData.mobile_phone ? 'disabled' : ''}`}
                      onClick={(e) => formData.mobile_phone && handleCopy(formData.mobile_phone, 'mobile_phone', e)}
                      aria-label={t('copyMobilePhone')}
                      disabled={!formData.mobile_phone}
                    >
                      {copySuccess['mobile_phone'] ? '✓' : '📋'}
                    </button>
                  </div>
                ) : (
                  <input
                    type="tel"
                    id="mobile_phone"
                    name="mobile_phone"
                    value={formData.mobile_phone}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                )}
              </div>
              <div className="form-group">
                <label htmlFor="fixed_phone">{t('fixedPhone')}</label>
                {modalType === 'view' ? (
                  <div className="view-mode">
                    <span className="view-mode-value">{formData.fixed_phone || t('notSpecified')}</span>
                    <button
                      type="button"
                      className={`copy-button ${copySuccess['fixed_phone'] ? 'success' : ''} ${!formData.fixed_phone ? 'disabled' : ''}`}
                      onClick={(e) => formData.fixed_phone && handleCopy(formData.fixed_phone, 'fixed_phone', e)}
                      aria-label={t('copyFixedPhone')}
                      disabled={!formData.fixed_phone}
                    >
                      {copySuccess['fixed_phone'] ? '✓' : '📋'}
                    </button>
                  </div>
                ) : (
                  <input
                    type="tel"
                    id="fixed_phone"
                    name="fixed_phone"
                    value={formData.fixed_phone}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                )}
              </div>
              <div className="form-group">
                <label htmlFor="address">{t('address')}</label>
                {modalType === 'view' ? (
                  <div className="view-mode">
                    <span className="view-mode-value">{formData.address || t('notSpecified')}</span>
                    <button
                      type="button"
                      className={`copy-button ${copySuccess['address'] ? 'success' : ''} ${!formData.address ? 'disabled' : ''}`}
                      onClick={(e) => formData.address && handleCopy(formData.address, 'address', e)}
                      aria-label={t('copyAddress')}
                      disabled={!formData.address}
                    >
                      {copySuccess['address'] ? '✓' : '📋'}
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="postal_code">{t('postalCode')}</label>
                  {modalType === 'view' ? (
                    <div className="view-mode">
                      <span className="view-mode-value">{formData.postal_code || t('notSpecified')}</span>
                      <button
                        type="button"
                        className={`copy-button ${copySuccess['postal_code'] ? 'success' : ''} ${!formData.postal_code ? 'disabled' : ''}`}
                        onClick={(e) => formData.postal_code && handleCopy(formData.postal_code, 'postal_code', e)}
                        aria-label={t('copyPostalCode')}
                        disabled={!formData.postal_code}
                      >
                        {copySuccess['postal_code'] ? '✓' : '📋'}
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      id="postal_code"
                      name="postal_code"
                      value={formData.postal_code}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="city">{t('city')}</label>
                  {modalType === 'view' ? (
                    <div className="view-mode">
                      <span className="view-mode-value">{formData.city || t('notSpecified')}</span>
                      <button
                        type="button"
                        className={`copy-button ${copySuccess['city'] ? 'success' : ''} ${!formData.city ? 'disabled' : ''}`}
                        onClick={(e) => formData.city && handleCopy(formData.city, 'city', e)}
                        aria-label={t('copyCity')}
                        disabled={!formData.city}
                      >
                        {copySuccess['city'] ? '✓' : '📋'}
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  )}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="country">{t('country')}</label>
                {modalType === 'view' ? (
                  <div className="view-mode">
                    <span className="view-mode-value">{formData.country || t('notSpecified')}</span>
                    <button
                      type="button"
                      className={`copy-button ${copySuccess['country'] ? 'success' : ''} ${!formData.country ? 'disabled' : ''}`}
                      onClick={(e) => formData.country && handleCopy(formData.country, 'country', e)}
                      aria-label={t('copyCountry')}
                      disabled={!formData.country}
                    >
                      {copySuccess['country'] ? '✓' : '📋'}
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                )}
              </div>
            </div>
            {modalType !== 'view' && (
              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-button secondary"
                  onClick={closeModalForContact}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="modal-button primary"
                >
                  {t('save')}
                </button>
              </div>
            )}
            {modalType === 'view' && (
              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-button secondary"
                  onClick={closeModalForContact}
                >
                  {t('close')}
                </button>
              </div>
            )}
          </form>
        </div>
      </ReactModal>

      {/* Delete Confirmation Modal */}
      <ReactModal
        isOpen={isDeleteModalOpen}
        onRequestClose={() => setIsDeleteModalOpen(false)}
        className="contact-modal"
        overlayClassName="ReactModal__Overlay"
        contentLabel={t('confirmDeletion')}
        ariaHideApp={false}
        shouldCloseOnOverlayClick={true}
        onAfterOpen={() => {
          document.body.classList.add('modal-open');
        }}
        onAfterClose={() => {
          document.body.classList.remove('modal-open');
        }}
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
            <p>{t('confirmDeleteContactMessage')}</p>
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
              className="modal-button primary delete-button"
              onClick={confirmDelete}
            >
              {t('confirm')}
            </button>
          </div>
        </div>
      </ReactModal>
    </div>
  );
};

export default ContactBook;
