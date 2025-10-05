import React, { useState, useEffect, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import { format, parseISO, isBefore } from 'date-fns';
import Select from 'react-select';
import {FiSearch, FiCalendar, FiTag, FiUsers, FiCheckCircle} from 'react-icons/fi';
import ReactModal from 'react-modal';
import { ChromePicker } from 'react-color';
import ToastContainer from '../../common/Toast/ToastContainer';
import { useTranslation } from '../../common/i18n/i18n';
import { isEmptyString, toLocalISODate } from '../../common/utils';
import useToast from '../../../hooks/useToast';
import { useNavigate, useLocation } from 'react-router-dom';
import './EventView.css';

const EventTable = () => {
  // Local state variables
  const navigate = useNavigate();
  const location = useLocation();
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [filters, setFilters] = useState({
    searchTerm: '',
    start_date: null,
    end_date: null,
    selectedCategories: [],
    selectedPeople: [],
    selectedStatus: []
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    id: null,
    title: '',
    description: '',
    start_date: toLocalISODate(new Date()),
    end_date: null,
    categories: [],
    people: [],
    color: '#3683d6'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'start_date', direction: 'asc' });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const [errors, setErrors] = useState({});
  const [peopleList, setPeopleList] = useState([]);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { t, currentLocale } = useTranslation();

  // Options for status filter
  const statusOptions = [
    { value: 'upcoming', label: t('upcoming') },
    { value: 'ongoing', label: t('ongoing') },
    { value: 'past', label: t('past') }
  ];

  // Load initial data on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        // Load categories
        const categoriesResponse = await fetch('/api/category');
        if (!categoriesResponse.ok) throw new Error('Error loading categories');
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);
        // Load people
        const peopleResponse = await fetch('/api/people');
        if (!peopleResponse.ok) throw new Error('Error loading people');
        const peopleData = await peopleResponse.json();
        setPeopleList(peopleData);
        // Load events
        const eventsResponse = await fetch('/api/event');
        if (!eventsResponse.ok) throw new Error('Error loading events');
        const eventsData = await eventsResponse.json();
        // Pre-process events to ensure categories and people always exist
        const processedEvents = eventsData.map(event => ({
          ...event,
          categories: event.categories || [],
          people: event.people || []
        }));
        setEvents(processedEvents);
        showSuccess(t('dataLoadedSuccessfully'));
      } catch (error) {
        console.error('Error loading initial data:', error);
        showError(t('errorLoadingData'));
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [showSuccess, showError, t]);

  // Generate options for comboboxes from loaded data
  const categoryOptions = categories.map(category => ({
    value: category.id.toString(),
    label: category.title || 'No name',
    color: category.color || '#3683d6'
  }));
  const peopleOptions = peopleList.map(person => ({
    value: person.id.toString(),
    label: `${person.last_name || 'Unknown'} ${person.first_name || ''}`.trim(),
  }));

  // Convert a date to date-only (ignore time)
  const toDateOnly = (value) => {
    const d = new Date(value);
    if (isNaN(d)) return null; // invalid value
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  // Check if an event is ongoing (ignoring time)
  const isEventOngoing = (event) => {
    const nowDate = toDateOnly(new Date());
    const startDate = toDateOnly(event.start_date);
    const endDate = toDateOnly(event.end_date || event.start_date);
    if (!startDate || !endDate || !nowDate) return false;
    return nowDate >= startDate && nowDate <= endDate;
  };

  // Check if an event is past (ignoring time)
  const isEventPast = (event) => {
    const nowDate = toDateOnly(new Date());
    // Use end_date if available, otherwise start_date
    const endDate = toDateOnly(event.end_date || event.start_date);
    if (!endDate) return false; // if no valid date, consider not past
    return nowDate > endDate && !isEventOngoing(event);
  };

  // Filter events based on current filters
  const filterEvents = useCallback(() => {
    let result = [...events];
    // Filter by search term
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      result = result.filter(event =>
        event.title.toLowerCase().includes(searchTerm) ||
        (event.description && event.description.toLowerCase().includes(searchTerm))
      );
    }
    // Filter by start date
    if (filters.start_date) {
      result = result.filter(event =>
        new Date(event.start_date) >= new Date(filters.start_date)
      );
    }
    // Filter by end date
    if (filters.end_date) {
      result = result.filter(event => {
        const eventend_date = event.end_date ? new Date(event.end_date) : new Date(event.start_date);
        return eventend_date <= new Date(filters.end_date);
      });
    }
    // Filter by categories
    if (filters.selectedCategories.length > 0) {
      result = result.filter(event =>
        event.categories && event.categories.some(catId =>
          filters.selectedCategories.includes(catId.toString())
        )
      );
    }
    // Filter by people
    if (filters.selectedPeople.length > 0) {
      result = result.filter(event =>
        event.people && event.people.some(personId =>
          filters.selectedPeople.includes(personId.toString())
        )
      );
    }
    // Filter by status
    if (filters.selectedStatus.length > 0) {
      const now = new Date();
      result = result.filter(event => {
        const start_date = new Date(event.start_date);
        const end_date = event.end_date ? new Date(event.end_date) : start_date;
        const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const start_dateOnly = new Date(start_date.getFullYear(), start_date.getMonth(), start_date.getDate());
        const end_dateOnly = new Date(end_date.getFullYear(), end_date.getMonth(), end_date.getDate());
        const isOngoing = nowDate >= start_dateOnly && nowDate <= end_dateOnly;
        const isPast = nowDate > end_dateOnly && !isOngoing;
        if (filters.selectedStatus.includes('ongoing') && isOngoing) return true;
        if (filters.selectedStatus.includes('past') && isPast) return true;
        if (filters.selectedStatus.includes('upcoming') && !isOngoing && !isPast) return true;
        return false;
      });
    }
    // Sort results
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (sortConfig.key === 'start_date' || sortConfig.key === 'end_date') {
          const dateA = a[sortConfig.key] ? new Date(a[sortConfig.key]).getTime() : 0;
          const dateB = b[sortConfig.key] ? new Date(b[sortConfig.key]).getTime() : 0;
          return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    setFilteredEvents(result);
  }, [events, filters, sortConfig]);

  // Load events from API
  const fetchEvents = async (showSuccessMsg = true) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/event');
      if (!response.ok) throw new Error('Error loading events');
      const data = await response.json();
      setEvents(data);
      if (showSuccessMsg) {
        showSuccess(t('eventsLoadedSuccessfully'));
      }
    } catch (error) {
      console.error('Error:', error);
      showError(t('errorLoadingEvents'));
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new event
  const handleAddEvent = async (eventData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...eventData,
        categories: Array.isArray(eventData.categories) ? eventData.categories : [],
        people: Array.isArray(eventData.people) ? eventData.people : [],
        start_date: eventData.start_date.toISOString(),
        end_date: eventData.end_date ? eventData.end_date.toISOString() : null
      };
      const response = await fetch('/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Error adding event');
      await fetchEvents(false);
      showSuccess(t('eventAddedSuccessfully'));
      return { success: true };
    } catch (error) {
      console.error('Error:', error);
      showError(t('errorAddingEvent'));
      return { success: false, message: error.message };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit an existing event
  const handleEditEvent = async (eventData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...eventData,
        categories: Array.isArray(eventData.categories) ? eventData.categories.map(id => id.toString()) : [],
        people: Array.isArray(eventData.people) ? eventData.people.map(id => id.toString()) : [],
        start_date: eventData.start_date.toISOString(),
        end_date: eventData.end_date ? eventData.end_date.toISOString() : null,
      };
      if (!payload.id) throw new Error('Event ID missing');
      const response = await fetch(`/api/event/?eventId=${payload.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Error updating event');
      await fetchEvents(false);
      showSuccess(t('eventUpdatedSuccessfully'));
      return { success: true };
    } catch (error) {
      console.error('Error:', error);
      showError(t('errorUpdatingEvent'));
      return { success: false, message: error.message };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete an event
  const handleDeleteEvent = async (eventId) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/event/${eventId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Error deleting event');
      await fetchEvents(false);
      showSuccess(t('eventDeletedSuccessfully'));
      return { success: true };
    } catch (error) {
      console.error('Error:', error);
      showError(t('errorDeletingEvent'));
      return { success: false, message: error.message };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm delete action
  const confirmDelete = async () => {
    if (eventToDelete) {
      await handleDeleteEvent(eventToDelete);
      setIsDeleteModalOpen(false);
    }
  };

  // Open modal for adding/editing an event
  const openModal = (event = null) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        id: event.id,
        title: event.title,
        description: event.description || '',
        start_date: event.start_date ? parseISO(event.start_date) : new Date(),
        end_date: event.end_date ? parseISO(event.end_date) : null,
        categories: event.categories ? event.categories.map(id => id.toString()) : [],
        people: event.people ? event.people.map(id => id.toString()) : [],
        color: event.color || '#3683d6'
      });
      navigate(`${location.pathname}?eventId=${event.id}&mode=edit`);
    } else {
      setEditingEvent(null);
      setFormData({
        id: null,
        title: '',
        description: '',
        start_date: new Date(),
        end_date: null,
        categories: [],
        people: [],
        color: '#3683d6'
      });
      navigate(`${location.pathname}?mode=create`);
    }
    setIsModalOpen(true);
  };

  // Close modal
  const closeModalForEvent = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    setErrors({});
    setFormData({
      id: null,
      title: '',
      description: '',
      start_date: new Date(),
      end_date: null,
      categories: [],
      people: [],
      color: '#3683d6'
    });
    setShowColorPicker(false);
    navigate(location.pathname, { replace: true });
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle date changes
  const handleDateChange = (name, date) => {
    const formattedDate = date ? date : '';
    setFormData(prev => ({
      ...prev,
      [name]: formattedDate
    }));
  };

  // Handle category changes
  const handleCategoryChange = (selectedOptions) => {
    const selectedIds = selectedOptions ? selectedOptions.map(option => option.value) : [];
    setFormData(prev => ({
      ...prev,
      categories: selectedIds
    }));
  };

  // Handle person changes
  const handlePersonChange = (selectedOptions) => {
    const selectedIds = selectedOptions ? selectedOptions.map(option => option.value) : [];
    setFormData(prev => ({
      ...prev,
      people: selectedIds
    }));
  };

  // Handle filter changes
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle color changes
  const handleColorChange = (color) => {
    setFormData(prev => ({
      ...prev,
      color: color.hex
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const newErrors = {};
    // Validate required fields
    if (isEmptyString(formData.title)) {
      newErrors.title = t('titleRequired');
    }
    if (!formData.start_date) {
      newErrors.start_date = t('start_dateRequired');
    }
    if (formData.end_date && isBefore(new Date(formData.end_date), new Date(formData.start_date))) {
      newErrors.end_date = t('end_dateBeforestart_date');
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      const payload = {
        ...formData,
        start_date: formData.start_date,
        end_date: formData.end_date ? formData.end_date : null,
        categories: formData.categories || [],
        people: formData.people || [],
        color: formData.color
      };
      try {
        if (editingEvent) {
          await handleEditEvent(payload);
        } else {
          await handleAddEvent(payload);
        }
        closeModalForEvent();
      } catch (error) {
        console.error('Error:', error);
        showError(t('errorSavingEvent'));
      }
    }
    setIsSubmitting(false);
  };

  // Handle delete action for an event
  const handleDelete = (category_id) => {
    navigate(`${location.pathname}?taskId=${category_id}&mode=delete`);
    setEventToDelete(category_id);
    setIsDeleteModalOpen(true);
  };

  // Handle sorting
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Styles for select components with colors
  const colourStyles = {
    control: (styles) => ({ ...styles, backgroundColor: 'white' }),
    option: (styles, { data }) => ({
      ...styles,
      color: data.color ? getContrastColor(data.color) : 'black',
      backgroundColor: data.color || 'white',
      ':hover': {
        backgroundColor: data.color ? '#00000020' : '#f0f0f0',
        color: data.color ? getContrastColor(data.color) : 'black'
      }
    }),
    multiValue: (styles, { data }) => ({
      ...styles,
      backgroundColor: data.color || '#f0f0f0'
    }),
    multiValueLabel: (styles, { data }) => ({
      ...styles,
      color: data.color ? getContrastColor(data.color) : 'black'
    }),
    multiValueRemove: (styles, { data }) => ({
      ...styles,
      color: data.color ? getContrastColor(data.color) : 'black',
      ':hover': {
        backgroundColor: '#ff000030',
        color: 'white'
      }
    })
  };

  // Function to get a contrasting color for text
  const getContrastColor = (hexColor) => {
    if (!hexColor) return '#000000';
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  // Selected options for filters
  const selectedCategoryFilterOptions = categoryOptions.filter(option =>
    filters.selectedCategories.includes(option.value)
  );

  const selectedPeopleFilterOptions = peopleOptions.filter(option =>
    filters.selectedPeople.includes(option.value)
  );

// Selected options for filters
  const selectedCategoryFormOptions = categoryOptions.filter(option =>
    formData.categories.includes(option.value)
  );

  const selectedPeopleFormOptions = peopleOptions.filter(option =>
    formData.people.includes(option.value)
  );

  // Apply filters after data loading
  useEffect(() => {
    if (!isLoading) {
      filterEvents();
    }
  }, [isLoading, filterEvents]);

  return (
    <div className="event-table-container">
      <h2>{t('eventManagement')}</h2>
      {isLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>{t('loadingData')}</p>
        </div>
      ) : (
        <>
          <div className="event-actions">
            <button
              className="button add-button"
              onClick={() => openModal()}
              disabled={isSubmitting}
            >
              <span className="button-content">
                <span className="add-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </span>
                <span className="button-text">{t('addEvent')}</span>
              </span>
            </button>
            <button
              className="button refresh-button"
              onClick={fetchEvents}
              disabled={isSubmitting}
              title={t('refreshData')}
            >
              <span className="refresh-icon">
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M22 11.5a10 10 0 0 1-10 10 10 10 0 0 1-10-10 10 10 0 0 1 10-10 10 10 0 0 1 10 10z"></path>
                </svg>
              </span>
            </button>
          </div>

           {/* Filter section */}
          <div className="event-filters">
            <div className="filter-group">
              <label htmlFor="searchTerm">
                <FiSearch className="filter-icon" />
                {t('search')}
              </label>
              <input
                type="text"
                id="searchTerm"
                name="searchTerm"
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                placeholder={t('searchByTitleOrDescription')}
                className="form-input"
              />
            </div>
            <div className="filter-group">
              <label>
                <FiCalendar className="filter-icon" />
                {t('start_date')}
              </label>
              <DatePicker
                selected={filters.start_date}
                onChange={(date) => handleFilterChange('start_date', date)}
                showTimeSelect
                locale={currentLocale()}
                timeCaption={t('time')}
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="Pp"
                className="form-input datepicker-custom"
                placeholderText={t('selectDate')}
                isClearable
              />
            </div>
            <div className="filter-group">
              <label>
                <FiCalendar className="filter-icon" />
                {t('end_date')}
              </label>
              <DatePicker
                selected={filters.end_date}
                onChange={(date) => handleFilterChange('end_date', date)}
                showTimeSelect
                locale={currentLocale()}
                timeCaption={t('time')}
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="Pp"
                className="form-input datepicker-custom"
                minDate={filters.start_date}
                placeholderText={t('selectDate')}
                isClearable
              />
            </div>
            <div className="filter-group">
              <label>
                <FiTag className="filter-icon" />
                {t('categories')}
              </label>
              {categories.length > 0 ? (
                <Select
                  isMulti
                  name="selectedCategories"
                  options={categoryOptions}
                  className="basic-multi-select"
                  classNamePrefix="select"
                  onChange={(selected) => handleFilterChange('selectedCategories',
                    selected ? selected.map(option => option.value) : []
                  )}
                  value={selectedCategoryFilterOptions}
                  styles={colourStyles}
                  placeholder={t('selectCategories')}
                />
              ) : (
                <p>{t('noCategoriesAvailable')}</p>
              )}
            </div>
            <div className="filter-group">
              <label>
                <FiUsers className="filter-icon" />
                {t('people')}
              </label>
              {peopleList.length > 0 ? (
                <Select
                  isMulti
                  name="selectedPeople"
                  options={peopleOptions}
                  className="basic-multi-select"
                  classNamePrefix="select"
                  onChange={(selected) => handleFilterChange('selectedPeople',
                    selected ? selected.map(option => option.value) : []
                  )}
                  value={selectedPeopleFilterOptions}
                  placeholder={t('selectPeople')}
                />
              ) : (
                <p>{t('noPeopleAvailable')}</p>
              )}
            </div>
            <div className="filter-group">
              <label>
                <FiCheckCircle className="filter-icon" />
                {t('status')}
              </label>
              <Select
                isMulti
                name="selectedStatus"
                options={statusOptions}
                className="basic-multi-select"
                classNamePrefix="select"
                onChange={(selected) => handleFilterChange('selectedStatus',
                  selected ? selected.map(option => option.value) : []
                )}
                value={statusOptions.filter(option =>
                  filters.selectedStatus.includes(option.value)
                )}
                placeholder={t('selectStatus')}
              />
            </div>
          </div>

          {/* Event table */}
          <div className="event-table-responsive">
            {filteredEvents.length === 0 ? (
              <div className="no-events-message">
                {t('noEventsFound')}
              </div>
            ) : (
              <table className="event-table">
                <thead>
                  <tr>
                    <th onClick={() => requestSort('title')}>
                      {t('title')} {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => requestSort('start_date')}>
                      {t('start_date')} {sortConfig.key === 'start_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => requestSort('end_date')}>
                      {t('end_date')} {sortConfig.key === 'end_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>{t('categories')}</th>
                    <th>{t('people')}</th>
                    <th>{t('status')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map(event => {
                    const ongoing = isEventOngoing(event);
                    const past = isEventPast(event);
                    return (
                      <tr key={event.id} className={ongoing ? 'ongoing' : past ? 'past' : 'upcoming'}>
                        <td className="event-title">{event.title}</td>
                        <td>{event.start_date ? format(new Date(event.start_date), 'dd/MM/yyyy HH:mm') : '-'}</td>
                        <td>{event.end_date ? format(new Date(event.end_date), 'dd/MM/yyyy HH:mm') : '-'}</td>
                        <td>
                          {event.categories && event.categories.length > 0 ? (
                            <div className="category-tags">
                              {event.categories.slice(0, 3).map((catId, index) => { // Limiter à 3 catégories max
                                const category = categories.find(c => c.id.toString() === catId.toString());
                                return category ? (
                                  <span
                                    key={catId}
                                    className="category-tag"
                                    style={{ backgroundColor: category.color || '#e0e0e0' }}
                                    title={category.title}
                                  >
                                    {category.title}
                                    {index < 2 && event.categories.length > 3 ? '' : ''} {/* Espace uniquement si pas dernier */}
                                  </span>
                                ) : null;
                              })}
                              {event.categories.length > 3 && (
                                <span className="category-tag more-tag" title={t('moreCategories', { count: event.categories.length - 3 })}>
                                  +{event.categories.length - 3}
                                </span>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                        <td>
                          {event.people && event.people.length > 0 ? (
                            <div className="people-tags">
                              {event.people.slice(0, 3).map((personId, index) => { // Limiter à 3 personnes max
                                const person = peopleList.find(p => p.id.toString() === personId.toString());
                                return person ? (
                                  <span key={personId} className="people-tag" title={`${person.last_name} ${person.first_name}`}>
                                    {person.avatar ? (
                                      <img
                                        src={person.avatar}
                                        alt={`${person.last_name} ${person.first_name}`}
                                        className="people-avatar-small"
                                      />
                                    ) : (
                                      <span className="people-avatar-placeholder-small">
                                        {person.last_name.charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                  </span>
                                ) : null;
                              })}
                              {event.people.length > 3 && (
                                <span className="people-tag" title={t('morePeople', { count: event.people.length - 3 })}>
                                  +{event.people.length - 3}
                                </span>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                        <td>
                          {ongoing ? (
                            <span className="status-badge ongoing">{t('ongoing')}</span>
                          ) : past ? (
                            <span className="status-badge past">{t('past')}</span>
                          ) : (
                            <span className="status-badge upcoming">{t('upcoming')}</span>
                          )}
                        </td>
                        <td className="action-buttons">
                          <button
                            className="button edit-button"
                            onClick={() => openModal(event)}
                            title={t('edit')}
                            disabled={isSubmitting}
                          >
                            ✏️
                          </button>
                          <button
                            className="button delete-button"
                            onClick={() => handleDelete(event.id)}
                            title={t('delete')}
                            disabled={isSubmitting}
                          >
                            ❌
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Modal for adding/editing an event */}
          <ReactModal
            isOpen={isModalOpen}
            onRequestClose={closeModalForEvent}
            className="event-modal"
            overlayClassName="ReactModal__Overlay"
            contentLabel={editingEvent ? t('editEvent') : t('addEvent')}
            ariaHideApp={false}
            shouldCloseOnOverlayClick={true}
          >
            <div className="modal-header">
              <h2 className="modal-title">{editingEvent ? t('editEvent') : t('addEvent')}</h2>
              <button className="modal-close" onClick={closeModalForEvent}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="event-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="title" className="required-field">{t('title')}</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="form-input"
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
                  <label htmlFor="color">{t('color')}</label>
                  <div className="color-picker-container">
                    <div
                      className="color-preview"
                      style={{ backgroundColor: formData.color }}
                      onClick={() => setShowColorPicker(!showColorPicker)}
                    >
                      {t('color')}: {formData.color}
                    </div>
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
                  </div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="start_date" className="required-field">{t('start_date')}</label>
                  <DatePicker
                    selected={formData.start_date}
                    onChange={(date) => handleDateChange('start_date', date)}
                    showTimeSelect
                    locale={currentLocale()}
                    timeCaption={t('time')}
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat="Pp"
                    className="form-input"
                    disabled={isSubmitting}
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
                    selected={formData.end_date}
                    onChange={(date) => handleDateChange('end_date', date)}
                    showTimeSelect
                    locale={currentLocale()}
                    timeCaption={t('time')}
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat="Pp"
                    className="form-input"
                    minDate={formData.start_date}
                    disabled={isSubmitting}
                    isClearable
                    placeholderText={t('optional')}
                  />
                  {errors.end_date && (
                    <div className="form-error">
                      <span className="form-error-icon">⚠️</span>
                      <span id="end_date-error">{errors.end_date}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="description">{t('description')}</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="form-input form-textarea"
                  rows="3"
                  disabled={isSubmitting}
                  placeholder={t('descriptionPlaceholder')}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="categories">{t('categories')}</label>
                  {categories.length > 0 ? (
                    <Select
                      isMulti
                      name="categories"
                      options={categoryOptions}
                      className="basic-multi-select"
                      classNamePrefix="select"
                      onChange={handleCategoryChange}
                      value={selectedCategoryFormOptions}
                      styles={colourStyles}
                      isDisabled={isSubmitting}
                      placeholder={t('selectCategories')}
                    />
                  ) : (
                    <p>{t('noCategoriesAvailable')}</p>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="people">{t('involvedPeople')}</label>
                  {peopleList.length > 0 ? (
                    <Select
                      isMulti
                      name="people"
                      options={peopleOptions}
                      className="basic-multi-select"
                      classNamePrefix="select"
                      onChange={handlePersonChange}
                      value={selectedPeopleFormOptions}
                      isDisabled={isSubmitting}
                      placeholder={t('selectPeople')}
                    />
                  ) : (
                    <p>{t('noPeopleAvailable')}</p>
                  )}
                </div>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="button secondary-button"
                  onClick={closeModalForEvent}
                  disabled={isSubmitting}
                >
                  {t('cancel')}
                </button>
                {editingEvent && (
                  <button
                    type="button"
                    className="button delete-button"
                    onClick={() => handleDelete(editingEvent.id)}
                    disabled={isSubmitting}
                  >
                    {t('delete')}
                  </button>
                )}
                <button
                  type="submit"
                  className="button primary-button"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (editingEvent ? t('updating') : t('adding')) : (editingEvent ? t('update') : t('add'))}
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
        </>
      )}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default EventTable;
