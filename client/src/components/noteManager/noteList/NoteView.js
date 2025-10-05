import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../common/i18n/i18n';
import { useNavigate, useLocation } from 'react-router-dom';
import useToast from '../../../hooks/useToast';
import ToastContainer from '../../common/Toast/ToastContainer';
import ReactModal from 'react-modal';
import './NoteView.css';

const NoteBook = () => {
  const { t } = useTranslation();
  const { showSuccess, showError, toasts, removeToast } = useToast();
  const [notes, setNotes] = useState([]);
  const [folders, setFolders] = useState([{ id: 0, name: 'Root', parentId: null }]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [modalType, setModalType] = useState('');
  const [selectedNote, setSelectedNote] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [currentFolder, setCurrentFolder] = useState({ id: 0, name: 'Root', parentId: null });
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    folderId: null
  });
  const [folderFormData, setFolderFormData] = useState({
    name: '',
    parentId: null
  });
  const [errors, setErrors] = useState({});
  const [folderErrors, setFolderErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState({});
  const [expandedFolders, setExpandedFolders] = useState({});
  const [folderSearch, setFolderSearch] = useState('');
  const [parentFolderSearch, setParentFolderSearch] = useState('');
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [showParentFolderDropdown, setShowParentFolderDropdown] = useState(false);
  const modalRef = useRef(null);
  const folderModalRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Manage body overflow when modals are open
  useEffect(() => {
    if (isModalOpen || isDeleteModalOpen || isFolderModalOpen) {
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
  }, [isModalOpen, isDeleteModalOpen, isFolderModalOpen]);

  // Fetch folders and notes from the database
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [foldersResponse, notesResponse] = await Promise.all([
          fetch('/api/folder'),
          fetch('/api/note')
        ]);
        if (!foldersResponse.ok) throw new Error(t('errorFetchingFolders'));
        if (!notesResponse.ok) throw new Error(t('errorFetchingNotes'));
        let foldersData = await foldersResponse.json();

        const rootFolderExists = foldersData.some(folder => folder.id === 0);

        if (!rootFolderExists) {
          try {
            const createRootResponse = await fetch('/api/folder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: 0,
                name: 'Root',
                parentId: null
              }),
            });
            if (!createRootResponse.ok) {
              throw new Error(t('errorCreatingRootFolder'));
            }

            const updatedFoldersResponse = await fetch('/api/folder');
            if (!updatedFoldersResponse.ok) throw new Error(t('errorFetchingFolders'));
            foldersData = await updatedFoldersResponse.json();
          } catch (error) {
            showError(error.message || t('errorCreatingRootFolder'));
          }
        }

        const notesData = await notesResponse.json();
        setFolders(foldersData);
        setNotes(notesData);

        if (foldersData.some(folder => folder.id === 0)) {
          setCurrentFolder(foldersData.find(folder => folder.id === 0));
          setSelectedFolder(foldersData.find(folder => folder.id === 0));
        } else {
          setCurrentFolder({ id: 0, name: 'Root', parentId: null });
          setSelectedFolder({ id: 0, name: 'Root', parentId: null });
        }
      } catch (error) {
        showError(error.message || t('errorFetchingData'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [t, showError]);


  // Get all folders including subfolders
  const getAllFolders = (folderList) => {
    let all = [...folderList];
    folderList.forEach(folder => {
      if (folder.children) {
        all = all.concat(getAllFolders(folder.children));
      }
    });
    return all;
  };

  // Flatten folders function to include all subfolders
  const flattenFolders = (folders) => {
    let flatList = [];
    folders.forEach(folder => {
      flatList.push(folder);
      if (folder.children && folder.children.length > 0) {
        flatList = flatList.concat(flattenFolders(folder.children));
      }
    });
    return flatList;
  };
  const allFoldersFlat = flattenFolders(folders);

  // Filter folders for search
  const filteredFolders = allFoldersFlat.filter(folder =>
    folder.name.toLowerCase().includes(folderSearch.toLowerCase())
  );
  const filteredParentFolders = allFoldersFlat.filter(folder =>
    folder.name.toLowerCase().includes(parentFolderSearch.toLowerCase()) &&
    folder.id !== selectedFolder?.id
  );

  // Set parent folder when creating a new folder
  useEffect(() => {
    if (modalType === 'createFolder') {
      setFolderFormData({
        name: '',
        parentId: currentFolder ? currentFolder.id : null
      });
      setParentFolderSearch(currentFolder ? currentFolder.name : '');
    }
  }, [modalType, currentFolder]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle folder form input changes
  const handleFolderInputChange = (e) => {
    const { name, value } = e.target;
    setFolderFormData({ ...folderFormData, [name]: value });
  };

  // Handle copy to clipboard with visual feedback
  const handleCopy = (value, fieldName, e) => {
    if (e) e.stopPropagation();
    if (value) {
      navigator.clipboard.writeText(value);
      showSuccess(t('copiedToClipboard'));
      setCopySuccess(prev => ({...prev, [fieldName]: true}));
      setTimeout(() => setCopySuccess(prev => ({...prev, [fieldName]: false})), 2000);
    }
  };

  // Handle form submission for notes
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.title) newErrors.title = t('titleRequired');
    if (!formData.content) newErrors.content = t('contentRequired');
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      try {
        let response;
        const noteData = { ...formData, folderId: formData.folderId || null };
        if (modalType === 'create') {
          response = await fetch('/api/note', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(noteData),
          });
        } else if (modalType === 'edit') {
          response = await fetch(`/api/note/${selectedNote.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(noteData),
          });
        }
        if (!response.ok) throw new Error(await response.json().error || t('errorSavingNote'));
        showSuccess(t(modalType === 'create' ? 'noteCreatedSuccessfully' : 'noteUpdatedSuccessfully'));
        setIsModalOpen(false);
        // Refresh the data
        const [foldersResponse, notesResponse] = await Promise.all([
          fetch('/api/folder'),
          fetch('/api/note')
        ]);
        const foldersData = await foldersResponse.json();
        const notesData = await notesResponse.json();
        setFolders(foldersData);
        setNotes(notesData);
      } catch (error) {
        showError(error.message || t('errorSavingNote'));
      }
    }
  };

  // Handle folder form submission
  const handleFolderSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!folderFormData.name) newErrors.name = t('folderNameRequired');
    setFolderErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      try {
        let response;
        const folderData = { name: folderFormData.name, parentId: folderFormData.parentId || null };
        if (modalType === 'createFolder') {
          response = await fetch('/api/folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(folderData),
          });
        } else if (modalType === 'editFolder') {
          response = await fetch(`/api/folder/${selectedFolder.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(folderData),
          });
        }
        if (!response.ok) throw new Error(await response.json().error || t('errorSavingFolder'));
        showSuccess(t(modalType === 'createFolder' ? 'folderCreatedSuccessfully' : 'folderUpdatedSuccessfully'));
        setIsFolderModalOpen(false);
        // Refresh the data
        const [foldersResponse, notesResponse] = await Promise.all([
          fetch('/api/folder'),
          fetch('/api/note')
        ]);
        const foldersData = await foldersResponse.json();
        const notesData = await notesResponse.json();
        setFolders(foldersData);
        setNotes(notesData);
      } catch (error) {
        showError(error.message || t('errorSavingFolder'));
      }
    }
  };

  // Handle note deletion
  const handleDelete = (id) => {
    setNoteToDelete(id);
    setIsDeleteModalOpen(true);
    navigate(`${location.pathname}?noteId=${id}&mode=delete&type=note`);
  };

  // Handle folder deletion with recursive option
  const handleFolderDelete = (id) => {
    if (id === 0) {
      showError(t('cannotDeleteRootFolder'));
      return;
    }
    setFolderToDelete(id);
    setIsDeleteModalOpen(true);
    navigate(`${location.pathname}?folderId=${id}&mode=delete&type=folder`);
  };

  // Confirm deletion with recursive handling
  const confirmDelete = async () => {
    try {
      let response;
      const wasCurrentFolderDeleted = currentFolder && currentFolder.id === folderToDelete;
      if (noteToDelete) {
        response = await fetch(`/api/note/${noteToDelete}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(t('errorDeletingNote'));
        showSuccess(t('noteDeletedSuccessfully'));
        if (selectedNote && selectedNote.id === noteToDelete) {
          setSelectedNote(null);
          setFormData({ title: '', content: '', folderId: null });
          if (isModalOpen) {
            setIsModalOpen(false);
            navigate(location.pathname, { replace: true });
          }
        }
      } else if (folderToDelete) {
        response = await fetch(`/api/folder/${folderToDelete}?recursive=true`, { method: 'DELETE' });
        if (!response.ok) throw new Error(t('errorDeletingFolder'));
        showSuccess(t('folderAndContentsDeletedSuccessfully'));
        if (wasCurrentFolderDeleted) {
          setCurrentFolder({ id: 0, name: 'Root', parentId: null });
          setSelectedFolder({ id: 0, name: 'Root', parentId: null });
          navigate(location.pathname, { replace: true });
        }
      }
      // Refresh data after deletion
      const [foldersResponse, notesResponse] = await Promise.all([
        fetch('/api/folder'),
        fetch('/api/note')
      ]);
      const foldersData = await foldersResponse.json();
      const notesData = await notesResponse.json();
      setFolders(foldersData);
      setNotes(notesData);
      setIsDeleteModalOpen(false);
      setNoteToDelete(null);
      setFolderToDelete(null);
    } catch (error) {
      showError(error.message || (noteToDelete ? t('errorDeletingNote') : t('errorDeletingFolder')));
    }
  };

  // Handle note edit
  const handleEdit = (note) => {
    setSelectedNote(note);
    setFormData({
      title: note.title,
      content: note.content,
      folderId: note.folderId || null
    });
    setModalType('edit');
    setIsModalOpen(true);
    navigate(`${location.pathname}?noteId=${note.id}&mode=edit&type=note`);
  };

  // Handle folder edit
  const handleFolderEdit = (folder) => {
    if (folder.id === 0) {
      showError(t('cannotEditRootFolder'));
      return;
    }
    setSelectedFolder(folder);
    setFolderFormData({
      name: folder.name,
      parentId: folder.parentId || null
    });
    if (folder.parentId) {
      const parentFolder = allFoldersFlat.find(f => f.id === folder.parentId);
      setParentFolderSearch(parentFolder ? parentFolder.name : '');
    } else {
      setParentFolderSearch('');
    }
    setModalType('editFolder');
    setIsFolderModalOpen(true);
    navigate(`${location.pathname}?folderId=${folder.id}&mode=edit&type=folder`);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setErrors({});
    setFormData({ title: '', content: '', folderId: null });
    navigate(location.pathname, { replace: true });
  };

  // Close folder modal
  const closeFolderModal = () => {
    setIsFolderModalOpen(false);
    setFolderErrors({});
    setFolderFormData({ name: '', parentId: null });
    navigate(location.pathname, { replace: true });
  };

  // Handle note view
  const handleView = (note) => {
    setSelectedNote(note);
    setFormData({
      title: note.title,
      content: note.content,
      folderId: note.folderId || null
    });
    setModalType('view');
    setIsModalOpen(true);
    navigate(`${location.pathname}?noteId=${note.id}&mode=view&type=note`);
  };

  // Handle folder view with improved existence check
  const handleFolderView = (folder) => {
    const folderExists = getAllFolders(folders).some(f => f.id === folder.id);
    if (folderExists) {
      setCurrentFolder(folder);
      setSelectedFolder(folder);
    } else {
      showError(t('folderNotFound'));
      setCurrentFolder({ id: 0, name: 'Root', parentId: null });
      setSelectedFolder({ id: 0, name: 'Root', parentId: null });
      navigate(location.pathname, { replace: true });
    }
  };

  // Toggle folder expansion
  const toggleFolder = (folderId, e) => {
    if (e) e.stopPropagation();
    setExpandedFolders(prev => ({...prev, [folderId]: !prev[folderId]}));
  };

  // Check if folder is expanded
  const isExpanded = (folderId) => expandedFolders[folderId] || false;

  // Check if folder is selected
  const isSelected = (folderId) => currentFolder && currentFolder.id === folderId;

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) closeModal();
      if (folderModalRef.current && !folderModalRef.current.contains(event.target)) closeFolderModal();
    };
    if (isModalOpen || isFolderModalOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isModalOpen, isFolderModalOpen]);

  // Filter notes - only show notes that belong exactly to the current folder
  const filteredNotes = currentFolder && currentFolder.id === 0
    ? notes.filter(note => note.folderId === null)
    : notes.filter(note => note.folderId === currentFolder?.id);

  // Render folder tree with proper click handler
  const renderFolderTree = (folders, level = 0) => {
    return folders.map(folder => (
      <div
        key={folder.id}
        className={`folder-item ${isSelected(folder.id) ? 'selected' : ''} ${
          folder.children && folder.children.length > 0 ? 'has-children' : ''
        } ${isExpanded(folder.id) ? 'expanded' : ''}`}
        style={{ marginLeft: `${level * 0.001}rem` }}
        onClick={(e) => {
          e.stopPropagation();
          handleFolderView(folder);
        }}
      >
        <div className="folder-header">
          <div className="folder-info">
            <div className="folder-icon-with-toggle">
              <div className="folder-icon">📁</div>
              {folder.children && folder.children.length > 0 && (
                <span
                  className="folder-toggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFolder(folder.id, e);
                  }}
                >
                  {isExpanded(folder.id) ? '▼' : '▶'}
                </span>
              )}
              <span className="folder-name">{folder.name}</span>
            </div>
          </div>
        </div>
        {folder.children && folder.children.length > 0 && isExpanded(folder.id) && (
          <div className="folder-children">
            {renderFolderTree(folder.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="note-book-container">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="note-book-header">
        <h1 className="note-book-title">{t('noteBook')}</h1>
        <div className="header-actions">
          <button
            className="add-note-button"
            onClick={() => {
              setModalType('create');
              setFormData({
                title: '',
                content: '',
                folderId: currentFolder ? currentFolder.id : null
              });
              setIsModalOpen(true);
              navigate(`${location.pathname}?mode=create&type=note`);
            }}
            aria-label={t('addNote')}
          >
            {t('addNote')}
          </button>
          <button
            className="add-folder-button"
            onClick={() => {
              setModalType('createFolder');
              setFolderFormData({
                name: '',
                parentId: currentFolder ? currentFolder.id : null
              });
              setParentFolderSearch(currentFolder ? currentFolder.name : '');
              setIsFolderModalOpen(true);
              navigate(`${location.pathname}?mode=create&type=folder`);
            }}
            aria-label={t('addFolder')}
          >
            {t('addFolder')}
          </button>
        </div>
      </div>
      {isLoading ? (
        <div className="loading-message">{t('loadingData')}</div>
      ) : (
        <div className="note-book-content">
          <div className="folders-sidebar">
            <h2>{t('folders')}</h2>
            <div className="folder-tree">
              {folders.length === 0 ? (
                <div className="no-folders">{t('noFoldersFound')}</div>
              ) : (
                renderFolderTree(folders)
              )}
            </div>
          </div>
          <div className="notes-main-content">
            <div className="current-folder-path">
              {!currentFolder ? (
                <span>{t('allNotes')}</span>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span>{t('currentFolder')}: {currentFolder.name}</span>
                  {currentFolder && currentFolder.id !== 0 && (
                    <div className="folder-actions">
                      <button
                        className="button edit-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFolderEdit(currentFolder);
                        }}
                        aria-label={`${t('edit')} ${currentFolder.name}`}
                        title={t('edit')}
                      >
                        ✏️
                      </button>
                      <button
                        className="button delete-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFolderDelete(currentFolder.id);
                        }}
                        aria-label={`${t('delete')} ${currentFolder.name}`}
                        title={t('delete')}
                      >
                        ❌
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {filteredNotes.length === 0 ? (
              <div className="no-notes">{t('noNotesInFolder')}</div>
            ) : (
              <div className="note-list">
                {filteredNotes.map(note => (
                  <div key={note.id} className="note-item">
                    <div className="note-info">
                      <div className="note-title">{note.title}</div>
                      <div className="note-content-preview">{note.content.substring(0, 50)}...</div>
                    </div>
                    <div className="note-actions">
                      <button
                        className="button view-button"
                        onClick={() => handleView(note)}
                        aria-label={`${t('view')} ${note.title}`}
                        title={t('view')}
                      >
                        👁️
                      </button>
                      <button
                        className="button edit-button"
                        onClick={() => handleEdit(note)}
                        aria-label={`${t('edit')} ${note.title}`}
                        title={t('edit')}
                      >
                        ✏️
                      </button>
                      <button
                        className="button delete-button"
                        onClick={() => handleDelete(note.id)}
                        aria-label={`${t('delete')} ${note.title}`}
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
        </div>
      )}
      {/* Main Note Modal */}
      <ReactModal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        contentLabel={
          modalType === 'create' ? t('createNote') :
          modalType === 'edit' ? t('editNote') :
          t('viewNote')
        }
        className="note-modal"
        overlayClassName="modal-overlay"
        shouldCloseOnOverlayClick={true}
        ariaHideApp={false}
        style={{ content: { maxHeight: '90vh', overflowY: 'auto' } }}
      >
        <div className="modal-container" ref={modalRef}>
          <div className="modal-header">
            <h2 className="modal-title">
              {modalType === 'create' ? t('createNote') :
               modalType === 'edit' ? t('editNote') :
               t('viewNote')}
            </h2>
            <button className="modal-close" onClick={closeModal}>×</button>
          </div>
          <form onSubmit={handleSubmit} className="note-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="title" className="required-field">{t('title')}</label>
                {modalType === 'view' ? (
                  <div className="view-mode">
                    <span className="view-mode-value">{formData.title}</span>
                    <button
                      type="button"
                      className={`copy-button ${copySuccess['title'] ? 'success' : ''}`}
                      onClick={(e) => handleCopy(formData.title, 'title', e)}
                      aria-label={t('copyTitle')}
                    >
                      {copySuccess['title'] ? '✓' : '📋'}
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="form-control"
                    aria-required="true"
                  />
                )}
                {errors.title && (
                  <div className="form-error">
                    <span className="form-error-icon">⚠️</span>
                    <span id="title-error">{errors.title}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="folderId">{t('folder')}</label>
                {modalType === 'view' ? (
                  <div className="view-mode">
                    <span className="view-mode-value">
                      {formData.folderId ? (() => {
                        const folder = allFoldersFlat.find(f => f.id === formData.folderId);
                        return folder?.name || t('noFolder');
                      })() : t('noFolder')}
                    </span>
                  </div>
                ) : (
                  <div className="folder-select">
                    <input
                      type="text"
                      id="folderSearch"
                      name="folderSearch"
                      value={folderSearch}
                      onChange={(e) => setFolderSearch(e.target.value)}
                      onFocus={() => setShowFolderDropdown(true)}
                      onBlur={() => setTimeout(() => setShowFolderDropdown(false), 200)}
                      placeholder={t('searchFolders')}
                      className="form-control"
                      autoComplete="off"
                    />
                    {showFolderDropdown && (
                      <div className="folder-dropdown">
                        <ul>
                          {filteredFolders.map(folder => (
                            <li
                              key={folder.id}
                              onClick={() => {
                                setFormData({ ...formData, folderId: folder.id });
                                setFolderSearch(folder.name);
                                setShowFolderDropdown(false);
                              }}
                            >
                              {folder.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <input type="hidden" id="folderId" name="folderId" value={formData.folderId || ''} />
                  </div>
                )}
              </div>
              <div className="form-group full-width-textarea">
                <label htmlFor="content" className="required-field">{t('content')}</label>
                {modalType === 'view' ? (
                  <div className="view-mode">
                    <span className="view-mode-value">{formData.content}</span>
                    <button
                      type="button"
                      className={`copy-button ${copySuccess['content'] ? 'success' : ''}`}
                      onClick={(e) => handleCopy(formData.content, 'content', e)}
                      aria-label={t('copyContent')}
                    >
                      {copySuccess['content'] ? '✓' : '📋'}
                    </button>
                  </div>
                ) : (
                  <textarea
                    id="content"
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    className="form-control modal-textarea"
                    aria-required="true"
                  />
                )}
                {errors.content && (
                  <div className="form-error">
                    <span className="form-error-icon">⚠️</span>
                    <span id="content-error">{errors.content}</span>
                  </div>
                )}
              </div>
            </div>
            {modalType !== 'view' ? (
              <div className="modal-actions">
                <button type="button" className="modal-button secondary" onClick={closeModal}>
                  {t('cancel')}
                </button>
                <button type="submit" className="modal-button primary">{t('save')}</button>
              </div>
            ) : (
              <div className="modal-actions">
                <button type="button" className="modal-button secondary" onClick={closeModal}>
                  {t('close')}
                </button>
              </div>
            )}
          </form>
        </div>
      </ReactModal>
      {/* Folder Modal */}
      <ReactModal
        isOpen={isFolderModalOpen}
        onRequestClose={closeFolderModal}
        contentLabel={
          modalType === 'createFolder' ? t('createFolder') :
          t('editFolder')
        }
        className="note-modal"
        overlayClassName="modal-overlay"
        shouldCloseOnOverlayClick={true}
        ariaHideApp={false}
        style={{ content: { maxHeight: '90vh', overflowY: 'auto' } }}
      >
        <div className="modal-container" ref={folderModalRef}>
          <div className="modal-header">
            <h2 className="modal-title">
              {modalType === 'createFolder' ? t('createFolder') : t('editFolder')}
            </h2>
            <button className="modal-close" onClick={closeFolderModal}>×</button>
          </div>
          <form onSubmit={handleFolderSubmit} className="note-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name" className="required-field">{t('folderName')}</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={folderFormData.name}
                  onChange={handleFolderInputChange}
                  className="form-control"
                  aria-required="true"
                />
                {folderErrors.name && (
                  <div className="form-error">
                    <span className="form-error-icon">⚠️</span>
                    <span id="name-error">{folderErrors.name}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="parentId">{t('parentFolder')}</label>
                <div className="folder-select">
                  <input
                    type="text"
                    id="parentFolderSearch"
                    name="parentFolderSearch"
                    value={parentFolderSearch}
                    onChange={(e) => setParentFolderSearch(e.target.value)}
                    onFocus={() => setShowParentFolderDropdown(true)}
                    onBlur={() => setTimeout(() => setShowParentFolderDropdown(false), 200)}
                    placeholder={t('searchFolders')}
                    className="form-control"
                    autoComplete="off"
                  />
                  {showParentFolderDropdown && (
                    <div className="folder-dropdown">
                      <ul>
                        {filteredParentFolders.map(folder => (
                          <li
                            key={folder.id}
                            onClick={() => {
                              setFolderFormData({ ...folderFormData, parentId: folder.id });
                              setParentFolderSearch(folder.name);
                              setShowParentFolderDropdown(false);
                            }}
                          >
                            {folder.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <input type="hidden" id="parentId" name="parentId" value={folderFormData.parentId || ''} />
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="modal-button secondary" onClick={closeFolderModal}>
                {t('cancel')}
              </button>
              <button type="submit" className="modal-button primary">{t('save')}</button>
            </div>
          </form>
        </div>
      </ReactModal>
      {/* Delete Confirmation Modal */}
      <ReactModal
        isOpen={isDeleteModalOpen}
        onRequestClose={() => {
          setIsDeleteModalOpen(false);
          setNoteToDelete(null);
          setFolderToDelete(null);
        }}
        className="note-modal"
        overlayClassName="ReactModal__Overlay"
        contentLabel={t('confirmDeletion')}
        ariaHideApp={false}
        shouldCloseOnOverlayClick={true}
        onAfterOpen={() => document.body.classList.add('modal-open')}
        onAfterClose={() => document.body.classList.remove('modal-open')}
      >
        <div className="modal-form">
          <div className="modal-header">
            <h3 className="modal-title">{t('confirmDeletion')}</h3>
            <button
              type="button"
              className="modal-close"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setNoteToDelete(null);
                setFolderToDelete(null);
              }}
            >
              ×
            </button>
          </div>
          <div className="modal-content">
            <p>
              {noteToDelete
                ? t('confirmDeleteNoteMessage')
                : t('confirmDeleteFolderMessage')}
            </p>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="modal-button secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setNoteToDelete(null);
                setFolderToDelete(null);
              }}
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

export default NoteBook;
