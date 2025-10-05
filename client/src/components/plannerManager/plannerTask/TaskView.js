import React, { useState, useEffect, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import { format, parseISO, isBefore } from 'date-fns';
import Select from 'react-select';
import ReactModal from 'react-modal';
import {
  FiChevronDown,
  FiChevronUp,
  FiFilter,
  FiSearch,
  FiCalendar,
  FiTag,
  FiUsers,
  FiCheckCircle,
  FiFlag,
  FiRepeat,
  FiX
} from 'react-icons/fi';
import ToastContainer from '../../common/Toast/ToastContainer';
import { useTranslation } from '../../common/i18n/i18n';
import { isEmptyString, toLocalISODate } from '../../common/utils';
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import useToast from '../../../hooks/useToast';
import { useNavigate, useLocation } from 'react-router-dom';
import './TaskView.css';

// TaskTable component for managing tasks
const TaskTable = () => {
  // Initialize hooks for navigation, location, state, and translation
  const navigate = useNavigate();
  const location = useLocation();
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [filters, setFilters] = useState({
    searchTerm: '',
    start_date: null,
    end_date: null,
    selectedCategories: [],
    selectedPeople: [],
    selectedStatus: [],
    selectedPriorities: [],
    selectedRecurrences: []
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    id: null,
    title: '',
    description: '',
    start_date: toLocalISODate(new Date()),
    end_date: null,
    categories: [],
    people: [],
    recurrence: 'never',
    priority: 'medium',
    status: 'todo'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'start_date', direction: 'asc' });
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const [errors, setErrors] = useState({});
  const [peopleList, setPeopleList] = useState([]);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('kanban');
  const { t, currentLocale } = useTranslation();

  // Options for status, recurrence, and priority - defined early to avoid initialization issues
  const statusOptions = [
    { value: 'todo', label: t('toDo') },
    { value: 'in_progress', label: t('inProgress') },
    { value: 'completed', label: t('completed') }
  ];

  const priorityOptions = [
    { value: 'low', label: t('low') },
    { value: 'medium', label: t('medium') },
    { value: 'high', label: t('high') },
    { value: 'urgent', label: t('urgent') }
  ];

  const recurrenceOptions = [
    { value: 'never', label: t('never') },
    { value: 'daily', label: t('daily') },
    { value: 'weekly', label: t('weekly') },
    { value: 'monthly', label: t('monthly') },
    { value: 'yearly', label: t('yearly') }
  ];

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
        // Load tasks
        const tasksResponse = await fetch('/api/task');
        if (!tasksResponse.ok) throw new Error('Error loading tasks');
        const tasksData = await tasksResponse.json();
        // Pre-process tasks to ensure categories and people always exist
        const processedTasks = tasksData.map(task => ({
          ...task,
          categories: task.categories || [],
          people: task.people || [],
          status: task.status || 'todo',
          priority: task.priority || 'medium',
          recurrence: task.recurrence || 'never'
        }));
        setTasks(processedTasks);
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

  // Check if a task is overdue
  const isTaskOverdue = (task) => {
    if (task.status === 'completed') return false;
    const now = toLocalISODate(new Date());
    const dueDate = task.end_date ? toLocalISODate(new Date(task.end_date)) : null;
    return dueDate && now > dueDate;
  };

  // Function to group tasks by status
  const groupTasksByStatus = () => {
    const groups = {};
    statusOptions.forEach(option => {
      groups[option.value] = {
        title: option.label,
        tasks: []
      };
    });
    groups['undefined'] = {
      title: t('undefinedStatus'),
      tasks: []
    };

    filteredTasks.forEach(task => {
      if (!task.id) {
        console.warn('Task without ID found:', task);
        return;
      }
      if (groups[task.status]) {
        groups[task.status].tasks.push(task);
      } else {
        groups['undefined'].tasks.push(task);
      }
    });

    statusOptions.forEach(option => {
      if (!groups[option.value]) {
        groups[option.value] = {
          title: option.label,
          tasks: []
        };
      }
    });
    return groups;
  };

  // Component for the task card
  const TaskCard = ({ task, index }) => {
    const overdue = isTaskOverdue(task);
    if (!task.id) {
      console.error('Task without valid ID:', task);
      return null;
    }

    return (
      <Draggable draggableId={task.id.toString()} index={index}>
        {(provided) => (
          <div
            className={`kanban-card ${overdue ? 'overdue' : ''}`}
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
          >
            <div className="card-header">
              <h4>{task.title}</h4>
              {overdue && (
                <span className="overdue-badge" title={t('overdue')}>
                  {t('overdueShort')}
                </span>
              )}
            </div>
            <div className="card-body">
              <div className="card-meta">
                {task.end_date && (
                  <div className="card-date">
                    <span className="meta-label">{t('due')}: </span>
                    <span className={overdue ? 'due-date overdue' : 'due-date'}>
                      {format(new Date(task.end_date), 'dd/MM/yyyy')}
                    </span>
                  </div>
                )}
                <div className="card-priority">
                  <span className={`priority-badge ${task.priority}`}>
                    {priorityOptions.find(opt => opt.value === task.priority)?.label || task.priority}
                  </span>
                </div>
              </div>
              {task.categories && task.categories.length > 0 && (
                <div className="card-categories">
                  {task.categories.slice(0, 3).map(catId => {
                    const category = categories.find(c => c.id.toString() === catId.toString());
                    return category ? (
                      <span
                        key={catId}
                        className="category-tag"
                        style={{ backgroundColor: category.color || '#e0e0e0' }}
                        title={category.title}
                      >
                        {category.title}
                      </span>
                    ) : null;
                  })}
                  {task.categories.length > 3 && (
                    <span className="category-tag more-tag">
                      +{task.categories.length - 3}
                    </span>
                  )}
                </div>
              )}
              {task.people && task.people.length > 0 && (
                <div className="card-people">
                  {task.people.slice(0, 4).map((personId, index) => {
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
                  {task.people.length > 4 && (
                    <span className="people-tag" title={t('morePeople', { count: task.people.length - 4 })}>
                      +{task.people.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="card-actions">
              <button
                className="button edit-button"
                onClick={() => openModalForTask(task)}
                title={t('edit')}
                disabled={isSubmitting}
              >
                ✏️
              </button>
              <button
                className="button delete-button"
                onClick={() => handleDelete(task.id)}
                title={t('delete')}
                disabled={isSubmitting}
              >
                ❌
              </button>
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  // Component for the Kanban board
  const KanbanBoard = () => {
    const taskGroups = groupTasksByStatus();

    const onDragEnd = async (result) => {
      if (!result.destination) return;

      const { source, destination } = result;

      // If the task is dropped in the same place, do nothing
      if (source.droppableId === destination.droppableId && source.index === destination.index) {
        return;
      }

      // Find the dragged task
      const taskIndex = tasks.findIndex(task => task.id.toString() === result.draggableId);
      if (taskIndex === -1) return;

      const updatedTask = {
        ...tasks[taskIndex],
        status: destination.droppableId
      };

      try {
        setIsSubmitting(true);

        // Update locally first for immediate feedback
        const newTasks = [...tasks];
        newTasks[taskIndex] = updatedTask;
        setTasks(newTasks);

        // Then update via API
        const response = await fetch(`/api/task/${updatedTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: destination.droppableId }),
        });

        if (!response.ok) throw new Error('Error updating task status');

        showSuccess(t('taskUpdatedSuccessfully'));
      } catch (error) {
        console.error('Error updating task status:', error);
        showError(t('errorUpdatingTask'));
        // Revert changes if API fails
        await fetchTasks(false);
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban-container">
          {statusOptions.map(option => {
            const status = option.value;
            const columnTasks = taskGroups[status]?.tasks || [];

            return (
              <Droppable droppableId={status} key={status}>
                {(provided) => (
                  <div
                    className="kanban-column"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    <h3>
                      {option.label}
                      <span className="task-count">{columnTasks.length}</span>
                    </h3>
                    <div className="kanban-cards">
                      {columnTasks.map((task, index) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          index={index}
                        />
                      ))}
                      {provided.placeholder}
                    </div>
                    {columnTasks.length === 0 && (
                      <div className="empty-column-message">
                        <p>{t('noTasksInThisStatus')}</p>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    );
  };

  // Filter tasks
  const filterTasks = useCallback(() => {
    let result = [...tasks];
    // Filter by search term
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      result = result.filter(task =>
        task.title.toLowerCase().includes(searchTerm) ||
        (task.description && task.description.toLowerCase().includes(searchTerm))
      );
    }
    // Filter by start date
    if (filters.start_date) {
      result = result.filter(task =>
        new Date(task.start_date) >= new Date(filters.start_date)
      );
    }
    // Filter by end date
    if (filters.end_date) {
      result = result.filter(task => {
        const taskEndDate = task.end_date ? new Date(task.end_date) : new Date(task.start_date);
        return taskEndDate <= new Date(filters.end_date);
      });
    }
    // Filter by categories
    if (filters.selectedCategories.length > 0) {
      result = result.filter(task =>
        task.categories && task.categories.some(catId =>
          filters.selectedCategories.includes(catId.toString())
        )
      );
    }
    // Filter by people
    if (filters.selectedPeople.length > 0) {
      result = result.filter(task =>
        task.people && task.people.some(personId =>
          filters.selectedPeople.includes(personId.toString())
        )
      );
    }
    // Filter by status
    if (filters.selectedStatus.length > 0) {
      result = result.filter(task =>
        filters.selectedStatus.includes(task.status)
      );
    }
    // Filter by priority
    if (filters.selectedPriorities.length > 0) {
      result = result.filter(task =>
        filters.selectedPriorities.includes(task.priority)
      );
    }
    // Filter by recurrence
    if (filters.selectedRecurrences.length > 0) {
      result = result.filter(task =>
        filters.selectedRecurrences.includes(task.recurrence)
      );
    }
    // Sort the results
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
    setFilteredTasks(result);
  }, [tasks, filters, sortConfig]);

  // Load tasks
  const fetchTasks = async (showSuccessMsg = true) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/task');
      if (!response.ok) throw new Error('Error loading tasks');
      const data = await response.json();
      setTasks(data);
      if (showSuccessMsg) {
        showSuccess(t('tasksLoadedSuccessfully'));
      }
    } catch (error) {
      console.error('Error:', error);
      showError(t('errorLoadingTasks'));
    } finally {
      setIsLoading(false);
    }
  };

  // Add a task
  const handleAddTask = async (taskData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...taskData,
        categories: Array.isArray(taskData.categories) ? taskData.categories : [],
        people: Array.isArray(taskData.people) ? taskData.people : [],
        start_date: taskData.start_date,
        end_date: taskData.end_date ? taskData.end_date : null
      };
      const response = await fetch('/api/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Error adding task');
      await fetchTasks(false);
      showSuccess(t('taskAddedSuccessfully'));
      return { success: true };
    } catch (error) {
      console.error('Error:', error);
      showError(t('errorAddingTask'));
      return { success: false, message: error.message };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit a task
  const handleEditTask = async (taskData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...taskData,
        categories: Array.isArray(taskData.categories) ? taskData.categories.map(id => id.toString()) : [],
        people: Array.isArray(taskData.people) ? taskData.people.map(id => id.toString()) : [],
        start_date: taskData.start_date,
        end_date: taskData.end_date ? taskData.end_date : null,
      };
      if (!payload.id) throw new Error('Missing task ID');
      const response = await fetch(`/api/task/${payload.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Error updating task');
      await fetchTasks(false);
      showSuccess(t('taskUpdatedSuccessfully'));
      return { success: true };
    } catch (error) {
      console.error('Error:', error);
      showError(t('errorUpdatingTask'));
      return { success: false, message: error.message };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete a task
  const handleDeleteTask = async (taskId) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/task/${taskId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Error deleting task');
      await fetchTasks(false);
      showSuccess(t('taskDeletedSuccessfully'));
      closeModalForTask()
      return { success: true };
    } catch (error) {
      console.error('Error:', error);
      showError(t('errorDeletingTask'));
      return { success: false, message: error.message };
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (taskToDelete) {
      await handleDeleteTask(taskToDelete);
      setIsDeleteModalOpen(false)
    }
  };

  // Open modal for adding/editing
  const openModalForTask = (task = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        id: task.id,
        title: task.title,
        description: task.description || '',
        start_date: task.start_date ? parseISO(task.start_date) : toLocalISODate(new Date()),
        end_date: task.end_date ? parseISO(task.end_date) : null,
        categories: task.categories ? task.categories.map(id => id.toString()) : [],
        people: task.people ? task.people.map(id => id.toString()) : [],
        recurrence: task.recurrence || 'never',
        priority: task.priority || 'medium',
        status: task.status || 'todo'
      });
      navigate(`${location.pathname}?taskId=${task.id}&mode=edit`);
    } else {
      setEditingTask(null);
      setFormData({
        id: null,
        title: '',
        description: '',
        start_date: toLocalISODate(new Date()),
        end_date: null,
        categories: [],
        people: [],
        recurrence: 'never',
        priority: 'medium',
        status: 'todo'
      });
      navigate(`${location.pathname}?mode=create`);
    }
    setIsModalOpen(true);
  };

  // Close modal
  const closeModalForTask = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    setIsSubmitting(false);
    setErrors({});
    setFormData({
      id: null,
      title: '',
      description: '',
      start_date: toLocalISODate(new Date()),
      end_date: null,
      categories: [],
      people: [],
      recurrence: 'never',
      priority: 'medium',
      status: 'todo'
    });
    navigate(location.pathname, { replace: true });
  };

  // Handle changes in the form
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle date changes
  const handleDateChange = (name, date) => {
    const formattedDate = date ? toLocalISODate(date) : '';
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

  // Handle people changes
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

  // Handle recurrence changes
  const handleRecurrenceChange = (selectedOption) => {
    setFormData(prev => ({
      ...prev,
      recurrence: selectedOption.value
    }));
  };

  // Handle priority changes
  const handlePriorityChange = (selectedOption) => {
    setFormData(prev => ({
      ...prev,
      priority: selectedOption.value
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
        recurrence: formData.recurrence,
        priority: formData.priority,
        status: formData.status
      };
      try {
        if (editingTask) {
          await handleEditTask(payload);
        } else {
          await handleAddTask(payload);
        }
        closeModalForTask();
      } catch (error) {
        console.error('Error:', error);
        showError(t('errorSavingTask'));
      }
    }
  };

  const handleDelete = (taskId) => {
    navigate(`${location.pathname}?taskId=${taskId}&mode=delete`);
    setTaskToDelete(taskId);
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

  // Styles for selectors with colors
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

  // Function to get contrasting color for text
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
  const selectedPriorityFilterOptions = priorityOptions.filter(option =>
    filters.selectedPriorities.includes(option.value)
  );
  const selectedRecurrenceFilterOptions = recurrenceOptions.filter(option =>
    filters.selectedRecurrences.includes(option.value)
  );

  // Selected options for the form
  const selectedCategoryFormOptions = categoryOptions.filter(option =>
    formData.categories.includes(option.value)
  );
  const selectedPeopleFormOptions = peopleOptions.filter(option =>
    formData.people.includes(option.value)
  );

  // Calculate statistics for the dashboard
  const calculateStats = () => {
    if (filteredTasks.length === 0) return {
      total: 0,
      completed: 0,
      inProgress: 0,
      overdue: 0,
      priorities: { low: 0, medium: 0, high: 0, urgent: 0 }
    };
    const stats = {
      total: filteredTasks.length,
      completed: filteredTasks.filter(task => task.status === 'completed').length,
      inProgress: filteredTasks.filter(task => task.status === 'in_progress').length,
      overdue: filteredTasks.filter(task => isTaskOverdue(task)).length,
      priorities: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0
      }
    };
    filteredTasks.forEach(task => {
      stats.priorities[task.priority] = (stats.priorities[task.priority] || 0) + 1;
    });
    return stats;
  };

  const stats = calculateStats();

  // Apply filters after data loading
  useEffect(() => {
    if (!isLoading) {
      filterTasks();
    }
  }, [isLoading, filterTasks]);

  return (
    <div className="task-table-container">
      <h2>{t('taskManagement')}</h2>
      {isLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>{t('loadingData')}</p>
        </div>
      ) : (
        <>
          <div className="task-actions">
            <button
              className="button add-button"
              onClick={() => openModalForTask()}
              disabled={isSubmitting}
            >
              <span className="button-content">
                <span className="add-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </span>
                <span className="button-text">{t('addTask')}</span>
              </span>
            </button>
            <button
              className="button refresh-button"
              onClick={fetchTasks}
              disabled={isSubmitting}
              title={t('refreshData')}
            >
              <span className="refresh-icon">
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M22 11.5a10 10 0 0 1-10 10 10 10 0 0 1-10-10 10 10 0 0 1 10-10 10 10 0 0 1 10 10z"></path>
                </svg>
              </span>
            </button>
            <div className="view-mode-selector">
              <button
                className={`button ${viewMode === 'kanban' ? 'active' : ''}`}
                onClick={() => setViewMode('kanban')}
                title={t('kanbanView')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                </svg>
                {t('kanban')}
              </button>
              <button
                className={`button ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title={t('tableView')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="21" y1="10" x2="3" y2="10"></line>
                  <line x1="21" y1="6" x2="3" y2="6"></line>
                  <line x1="21" y1="14" x2="3" y2="14"></line>
                  <line x1="21" y1="18" x2="3" y2="18"></line>
                  <line x1="7" y1="3" x2="7" y2="21"></line>
                  <line x1="11" y1="3" x2="11" y2="21"></line>
                  <line x1="15" y1="3" x2="15" y2="21"></line>
                  <line x1="19" y1="3" x2="19" y2="21"></line>
                </svg>
                {t('table')}
              </button>
            </div>
          </div>
          {/* Filters section */}
          <div className="task-filters">
            <div className="filters-header" onClick={() => setShowFilters(!showFilters)}>
              <h3>
                <FiFilter className="icon" /> {t('taskFiltersTitle')}
              </h3>
              <button className="filter-toggle">
                {showFilters ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
              </button>
            </div>
            <div className={`filters-content ${!showFilters ? 'hidden' : ''}`}>
              {/* Bouton pour effacer tous les filtres */}
              {(
                filters.searchTerm ||
                filters.start_date ||
                filters.end_date ||
                filters.selectedCategories.length > 0 ||
                filters.selectedPeople.length > 0 ||
                filters.selectedStatus.length > 0 ||
                filters.selectedPriorities.length > 0 ||
                filters.selectedRecurrences.length > 0
              ) && (
                <button
                  className="clear-all-filters"
                  onClick={() => {
                    setFilters({
                      searchTerm: '',
                      start_date: null,
                      end_date: null,
                      selectedCategories: [],
                      selectedPeople: [],
                      selectedStatus: [],
                      selectedPriorities: [],
                      selectedRecurrences: []
                    });
                  }}
                >
                  <FiX className="icon" /> {t('clearAllFilters')}
                </button>
              )}

              {/* Badges de filtres actifs */}
              <div className="active-filters">
                {filters.searchTerm && (
                  <div className="active-filter-badge">
                    <FiSearch className="filter-icon" />
                    {t('search')}: {filters.searchTerm}
                    <button
                      className="remove-filter"
                      onClick={() => handleFilterChange('searchTerm', '')}
                    >
                      ×
                    </button>
                  </div>
                )}
                {filters.start_date && (
                  <div className="active-filter-badge">
                    <FiCalendar className="filter-icon" />
                    {t('start_date')}: {format(new Date(filters.start_date), 'dd/MM/yyyy')}
                    <button
                      className="remove-filter"
                      onClick={() => handleFilterChange('start_date', null)}
                    >
                      ×
                    </button>
                  </div>
                )}
                {filters.end_date && (
                  <div className="active-filter-badge">
                    <FiCalendar className="filter-icon" />
                    {t('end_date')}: {format(new Date(filters.end_date), 'dd/MM/yyyy')}
                    <button
                      className="remove-filter"
                      onClick={() => handleFilterChange('end_date', null)}
                    >
                      ×
                    </button>
                  </div>
                )}
                {filters.selectedCategories.length > 0 && (
                  <div className="active-filter-badge">
                    <FiTag className="filter-icon" />
                    {t('categories')}: {filters.selectedCategories.length}
                    <button
                      className="remove-filter"
                      onClick={() => handleFilterChange('selectedCategories', [])}
                    >
                      ×
                    </button>
                  </div>
                )}
                {filters.selectedPeople.length > 0 && (
                  <div className="active-filter-badge">
                    <FiUsers className="filter-icon" />
                    {t('people')}: {filters.selectedPeople.length}
                    <button
                      className="remove-filter"
                      onClick={() => handleFilterChange('selectedPeople', [])}
                    >
                      ×
                    </button>
                  </div>
                )}
                {filters.selectedStatus.length > 0 && (
                  <div className="active-filter-badge">
                    <FiCheckCircle className="filter-icon" />
                    {t('status')}: {filters.selectedStatus.length}
                    <button
                      className="remove-filter"
                      onClick={() => handleFilterChange('selectedStatus', [])}
                    >
                      ×
                    </button>
                  </div>
                )}
                {filters.selectedPriorities.length > 0 && (
                  <div className="active-filter-badge">
                    <FiFlag className="filter-icon" />
                    {t('priority')}: {filters.selectedPriorities.length}
                    <button
                      className="remove-filter"
                      onClick={() => handleFilterChange('selectedPriorities', [])}
                    >
                      ×
                    </button>
                  </div>
                )}
                {filters.selectedRecurrences.length > 0 && (
                  <div className="active-filter-badge">
                    <FiRepeat className="filter-icon" />
                    {t('recurrence')}: {filters.selectedRecurrences.length}
                    <button
                      className="remove-filter"
                      onClick={() => handleFilterChange('selectedRecurrences', [])}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              {/* Ligne de recherche (pleine largeur) */}
              <div className="filter-row search-row">
                <div className="filter-group full-width">
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
              </div>

              {/* Ligne des dates */}
              <div className="filter-row dates-row">
                <div className="filter-group">
                  <label>
                    <FiCalendar className="filter-icon" />
                    {t('start_date')}
                  </label>
                  <DatePicker
                    selected={filters.start_date}
                    onChange={(date) => handleFilterChange('start_date', date)}
                    locale={currentLocale()}
                    dateFormat="P"
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
                    locale={currentLocale()}
                    dateFormat="P"
                    className="form-input datepicker-custom"
                    minDate={filters.start_date}
                    placeholderText={t('selectDate')}
                    isClearable
                  />
                </div>
              </div>

              {/* Ligne catégories et personnes */}
              <div className="filter-row categories-people-row">
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
              </div>

              {/* Ligne statut, priorité et récurrence */}
              <div className="filter-row status-priority-recurrence-row">
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
                <div className="filter-group">
                  <label>
                    <FiFlag className="filter-icon" />
                    {t('priority')}
                  </label>
                  <Select
                    isMulti
                    name="selectedPriorities"
                    options={priorityOptions}
                    className="basic-multi-select"
                    classNamePrefix="select"
                    onChange={(selected) => handleFilterChange('selectedPriorities',
                      selected ? selected.map(option => option.value) : []
                    )}
                    value={selectedPriorityFilterOptions}
                    placeholder={t('selectPriorities')}
                  />
                </div>
                <div className="filter-group">
                  <label>
                    <FiRepeat className="filter-icon" />
                    {t('recurrence')}
                  </label>
                  <Select
                    isMulti
                    name="selectedRecurrences"
                    options={recurrenceOptions}
                    className="basic-multi-select"
                    classNamePrefix="select"
                    onChange={(selected) => handleFilterChange('selectedRecurrences',
                      selected ? selected.map(option => option.value) : []
                    )}
                    value={selectedRecurrenceFilterOptions}
                    placeholder={t('selectRecurrences')}
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Dashboard statistics */}
          <div className="dashboard">
            <div className="dashboard-card">
              <h3>{t('totalTasks')}</h3>
              <p>{stats.total}</p>
            </div>
            <div className="dashboard-card">
              <h3>{t('completedTasks')}</h3>
              <p>{stats.completed}</p>
            </div>
            <div className="dashboard-card">
              <h3>{t('inProgressTasks')}</h3>
              <p>{stats.inProgress}</p>
            </div>
            <div className="dashboard-card">
              <h3>{t('overdueTasks')}</h3>
              <p>{stats.overdue}</p>
            </div>
            <div className="dashboard-card">
              <h3>{t('highPriorityTasks')}</h3>
              <p>{stats.priorities.high + stats.priorities.urgent}</p>
            </div>
          </div>
          {/* Task table */}
          <div className="task-table-responsive">
            {filteredTasks.length === 0 ? (
              <div className="no-tasks-message">
                {t('noTasksFound')}
              </div>
            ) : viewMode === 'kanban' ? (
              <KanbanBoard />
            ) : (
              <div className="task-table-responsive">
                <table className="task-table">
                  <thead>
                    <tr>
                      <th onClick={() => requestSort('title')}>
                        {t('title')} {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => requestSort('start_date')}>
                        {t('start_date')} {sortConfig.key === 'start_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => requestSort('end_date')}>
                        {t('dueDate')} {sortConfig.key === 'end_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th>{t('priority')}</th>
                      <th>{t('recurrence')}</th>
                      <th>{t('status')}</th>
                      <th>{t('categories')}</th>
                      <th>{t('people')}</th>
                      <th>{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map(task => {
                      const overdue = isTaskOverdue(task);
                      return (
                        <tr key={task.id} className={overdue ? 'overdue' : ''}>
                          <td className="task-title">{task.title}</td>
                          <td>{task.start_date ? format(new Date(task.start_date), 'dd/MM/yyyy') : '-'}</td>
                          <td>{task.end_date ? format(new Date(task.end_date), 'dd/MM/yyyy') : '-'}</td>
                          <td>
                            <span className={`priority-badge ${task.priority}`}>
                              {priorityOptions.find(opt => opt.value === task.priority)?.label || task.priority}
                            </span>
                          </td>
                          <td>
                            {recurrenceOptions.find(opt => opt.value === task.recurrence)?.label || task.recurrence}
                          </td>
                          <td>
                            {statusOptions.find(opt => opt.value === task.status)?.label || task.status}
                            {overdue && <span className="overdue-badge">{t('overdue')}</span>}
                          </td>
                          <td>
                            {task.categories && task.categories.length > 0 ? (
                              <div className="category-tags">
                                {task.categories.slice(0, 3).map((catId, index) => {
                                  const category = categories.find(c => c.id.toString() === catId.toString());
                                  return category ? (
                                    <span
                                      key={catId}
                                      className="category-tag"
                                      style={{ backgroundColor: category.color || '#e0e0e0' }}
                                      title={category.title}
                                    >
                                      {category.title}
                                    </span>
                                  ) : null;
                                })}
                                {task.categories.length > 3 && (
                                  <span className="category-tag more-tag" title={t('moreCategories', { count: task.categories.length - 3 })}>
                                    +{task.categories.length - 3}
                                  </span>
                                )}
                              </div>
                            ) : '-'}
                          </td>
                          <td>
                            {task.people && task.people.length > 0 ? (
                              <div className="people-tags">
                                {task.people.slice(0, 3).map((personId, index) => {
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
                                {task.people.length > 3 && (
                                  <span className="people-tag" title={t('morePeople', { count: task.people.length - 3 })}>
                                    +{task.people.length - 3}
                                  </span>
                                )}
                              </div>
                            ) : '-'}
                          </td>
                          <td className="action-buttons">
                            <button
                              className="button edit-button"
                              onClick={() => openModalForTask(task)}
                              title={t('edit')}
                              disabled={isSubmitting}
                            >
                              ✏️
                            </button>
                            <button
                              className="button delete-button"
                              onClick={() => handleDelete(task.id)}
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
              </div>
            )}
          </div>
          {/* Modal for adding/editing a task */}
          <ReactModal
            isOpen={isModalOpen}
            onRequestClose={closeModalForTask}
            className="task-modal"
            overlayClassName="ReactModal__Overlay"
            contentLabel={editingTask ? t('editTask') : t('addTask')}
            ariaHideApp={false}
            shouldCloseOnOverlayClick={true}
            onAfterOpen={() => {
              document.body.classList.add('modal-open');
            }}
            onAfterClose={() => {
              document.body.classList.remove('modal-open');
            }}
          >
            <div className="modal-header">
              <h2 className="modal-title">{editingTask ? t('editTask') : t('addTask')}</h2>
              <button className="modal-close" onClick={closeModalForTask}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="task-form">
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
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="priority">{t('priority')}</label>
                  <Select
                    name="priority"
                    options={priorityOptions}
                    className="basic-select"
                    classNamePrefix="select"
                    onChange={handlePriorityChange}
                    value={priorityOptions.find(option => option.value === formData.priority)}
                    isDisabled={isSubmitting}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="recurrence">{t('recurrence')}</label>
                  <Select
                    name="recurrence"
                    options={recurrenceOptions}
                    className="basic-select"
                    classNamePrefix="select"
                    onChange={handleRecurrenceChange}
                    value={recurrenceOptions.find(option => option.value === formData.recurrence)}
                    isDisabled={isSubmitting}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="start_date" className="required-field">{t('start_date')}</label>
                  <DatePicker
                    selected={formData.start_date}
                    onChange={(date) => handleDateChange('start_date', date)}
                    locale={currentLocale()}
                    dateFormat="P"
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
                  <label htmlFor="end_date">{t('dueDateOptional')}</label>
                  <DatePicker
                    selected={formData.end_date}
                    onChange={(date) => handleDateChange('end_date', date)}
                    locale={currentLocale()}
                    dateFormat="P"
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
                  <label htmlFor="people">{t('assignedPeople')}</label>
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
                  onClick={closeModalForTask}
                  disabled={isSubmitting}
                >
                  {t('cancel')}
                </button>
                {editingTask && (
                  <button
                    type="button"
                    className="button delete-button"
                    onClick={() => handleDelete(editingTask.id)}
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
                  {isSubmitting ? (editingTask ? t('updating') : t('adding')) : (editingTask ? t('update') : t('add'))}
                </button>
              </div>
            </form>
          </ReactModal>
          <ReactModal
            isOpen={isDeleteModalOpen}
            onRequestClose={() => setIsDeleteModalOpen(false)}
            className="task-modal"
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
                <p>{t('confirmDeleteTaskMessage')}</p>
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

export default TaskTable;
