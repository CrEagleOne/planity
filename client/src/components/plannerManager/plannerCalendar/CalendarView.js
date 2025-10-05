import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, isWithinInterval, addMonths, addDays, addYears, subMonths, getWeek, getYear, isBefore } from 'date-fns';
import ReactModal from 'react-modal';
import Select from 'react-select';
import { useTranslation } from '../../common/i18n/i18n';
import useToast from '../../../hooks/useToast';
import ToastContainer from '../../common/Toast/ToastContainer';
import './CalendarView.css';

const CalendarView = () => {
  const { t, currentLocale } = useTranslation();
  const { showSuccess, showError, toasts, removeToast } = useToast();

  // Main states for the calendar
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [people, setPeople] = useState([]);
  const [categories, setCategories] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2022, i, 1), 'MMMM', { locale: currentLocale() })
  }));

  // Generate abbreviated weekdays (e.g., 'Mo', 'Tu', etc.)
  const weekdays = eachDayOfInterval(
    {
      start: startOfWeek(new Date(), { weekStartsOn: 1 }), /// Start on Monday
      end: endOfWeek(new Date(), { weekStartsOn: 1 }),
    }
  ).map((day) => {
    const fullDayName = format(day, 'EEEE', { locale: currentLocale() });
    return fullDayName.substring(0, 2);
  });

  // Week headers including the week number label
  const weekHeaders = [t('weekShort'), ...weekdays];

  // Options for year dropdown
  const yearOptions = Array.from({ length: 10 }, (_, i) => ({
    value: 2023 + i,
    label: (2023 + i).toString()
  }));

  
  // Memoized maps for categories and people for quick lookup
  const categoriesMap = useMemo(() => {
    return categories.reduce((acc, category) => {
      acc[category.id] = category;
      return acc;
    }, {});
  }, [categories]);

  const peopleMap = useMemo(() => {
    return people.reduce((acc, person) => {
      acc[person.id] = person;
      return acc;
    }, {});
  }, [people]);

  // Load data from APIs on component mount or when dependencies change
  useEffect(() => {
    const loadData = async () => {
      // Generate instances for recurring items for the current month
      const generateRecurringInstances = (item) => {
        if (!item.recurrence) {
          return [item];
        }

        if (!item.end_date) {
          const startDate = parseISO(item.start_date);
          return [{
            ...item,
            original_id: item.id,
            id: `${item.id}-${format(startDate, 'yyyyMMdd')}`,
            start_date: format(startDate, 'yyyy-MM-dd'),
            end_date: format(startDate, 'yyyy-MM-dd'),
            is_recurring_instance: true
          }];
        }

        const instances = [];
        const startDate = parseISO(item.start_date);
        const endDate = parseISO(item.end_date);

        let current = startOfMonth(currentDate);
        if (isBefore(startDate, current)) {
          while (isBefore(current, startDate)) {
            current = addMonths(current, 1);
          }
        } else {
          current = startDate;
        }

        while (isBefore(current, endOfMonth(currentDate)) && isBefore(current, endDate)) {
          const instanceStart = new Date(current);
          const instanceEnd = new Date(Math.min(parseISO(item.end_date), endOfMonth(currentDate)));

          instances.push({
            ...item,
            original_id: item.id,
            id: `${item.id}-${format(instanceStart, 'yyyyMMdd')}`,
            start_date: format(instanceStart, 'yyyy-MM-dd'),
            end_date: format(instanceEnd, 'yyyy-MM-dd'),
            is_recurring_instance: true
          });

          switch(item.recurrence) {
            case 'daily':
              current = addDays(current, 1);
              break;
            case 'weekly':
              current = addDays(current, 7);
              break;
            case 'monthly':
              current = addMonths(current, 1);
              break;
            case 'yearly':
              current = addYears(current, 1);
              break;
            default:
              break;
          }
        }

        return instances.length > 0 ? instances : [item];
      };

      const processRecurringItems = (items) => {
        return items.map(item => {
          if (item.recurrence) {
            return generateRecurringInstances(item);
          }
          return item;
        }).flat();
      };

      try {
        setIsLoading(true);
        // Fetch events, tasks, people, and categories in parallel
        const [eventsResponse, tasksResponse, peopleResponse, categoriesResponse, contactsResponse] = await Promise.all([
          fetch('/api/event'),
          fetch('/api/task'),
          fetch('/api/people'),
          fetch('/api/category'),
          fetch('/api/contact')
        ]);

        if (!eventsResponse.ok) throw new Error(t('errorLoadingEvents'));
        if (!tasksResponse.ok) throw new Error(t('errorLoadingTasks'));
        if (!peopleResponse.ok) throw new Error(t('errorLoadingPeople'));
        if (!categoriesResponse.ok) throw new Error(t('errorLoadingCategories'));
        if (!contactsResponse.ok) throw new Error(t('errorLoadingContacts'));

        const [eventsData, tasksData, peopleData, categoriesData, contactsData] = await Promise.all([
          eventsResponse.json(),
          tasksResponse.json(),
          peopleResponse.json(),
          categoriesResponse.json(),
          contactsResponse.json()
        ]);
        

        setEvents(processRecurringItems(eventsData));
        setTasks(processRecurringItems(tasksData));
        setPeople(peopleData);
        setCategories(categoriesData);
        setContacts(contactsData);
        showSuccess(t('dataLoadedSuccessfully'));
      } catch (error) {
        console.error('Erreur:', error);
        showError(t('errorLoadingData'));
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [t, showSuccess, showError, currentDate]);

  // Group birthdays by day (month and day)
  const birthdaysByDay = useMemo(() => {
    const map = {};
    people.forEach(person => {
      if (!person.birthday_date) { return; }
      const dayMonth = format(parseISO(person.birthday_date), 'MM-dd');
      if (!map[dayMonth]) map[dayMonth] = [];
      map[dayMonth].push(person);
    });
    contacts.forEach(contact => {
      if (!contact.birthday_date) { return; }
      const dayMonth = format(parseISO(contact.birthday_date), 'MM-dd');
      if (!map[dayMonth]) map[dayMonth] = [];
      map[dayMonth].push({ ...contact, type: 'contact' });
    });
    return map;
  }, [people, contacts]);

  const getBirthdaysForDay = (day) => {
    const dayMonth = format(day, 'MM-dd');
    const result = birthdaysByDay[dayMonth] || [];
    return result;
  };

  // Generate calendar grid for the current month
  const generateCalendar = () => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    const weeks = [];
    let currentWeek = [];

    days.forEach(day => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    return weeks;
  };

  // Component for displaying category information
  const CategoryDisplay = ({ categoryId }) => {
    const category = categoriesMap[categoryId];
    if (!category) return null;

    return (
      <div className="category-card" style={{ backgroundColor: category.color }}>
        <div className="category-info">
          <div className="category-name">{category.name}</div>
          {category.description && (
            <div className="category-desc">{category.description}</div>
          )}
        </div>
      </div>
    );
  };

  const PersonDisplay = ({ personId }) => {
    const person = peopleMap[personId];
    if (!person) return null;

    return (
      <div key={personId} className="person-item" title={`${person.last_name} ${person.first_name}`}>
        {person.avatar ?
          <img src={person.avatar} alt={`${person.first_name} ${person.last_name}`} className="person-avatar" /> :
          <div className="person-avatar placeholder">
            {person.first_name.charAt(0)}{person.last_name.charAt(0)}
          </div>
        }
      </div>
    );
  };

  // Get events, tasks, and birthdays for a specific day
  const getItemsForDay = (day) => {
    const dayEvents = [];
    const dayTasks = [];
    const dayBirthdays = getBirthdaysForDay(day);

    // Filter events for the day
    events.forEach(event => {
      const eventStart = parseISO(event.start_date);
      const eventEnd = event.end_date ? parseISO(event.end_date) : eventStart;

      if (isWithinInterval(day, { start: eventStart, end: eventEnd }) || isSameDay(day, eventStart)) {
        dayEvents.push(event);
      }
    });

    // Filter tasks for the day
    tasks.forEach(task => {
      const taskStart = parseISO(task.start_date);
      const taskEnd = task.end_date ? parseISO(task.end_date) : new Date('2099-12-31');

      if (isWithinInterval(day, { start: taskStart, end: taskEnd }) || isSameDay(day, taskStart)) {
        dayTasks.push(task);
      }
    });
    return { events: dayEvents, tasks: dayTasks, birthdays: dayBirthdays };
  };

    // Handle month change from dropdown
  const handleMonthChange = (selectedOption) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(selectedOption.value);
    setCurrentDate(newDate);
  };

  // Handle year change from dropdown
  const handleYearChange = (selectedOption) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(selectedOption.value);
    setCurrentDate(newDate);
  };

   // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  // Open modal with selected item details
  const openModal = (item, type) => {
    setSelectedItem(item);
    setModalType(type);
    setIsModalOpen(true);
  };

  // Close the modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  // Render the calendar
  const renderCalendar = () => {
    const weeks = generateCalendar();
    const monthName = format(currentDate, 'MMMM yyyy', { locale: currentLocale() });

    return (
      <div className="calendar-container">
        <div className="calendar-header">
          <button onClick={goToPreviousMonth} aria-label={t('previousMonth')}>&lt;</button>
          <h2>{monthName}</h2>
          <button onClick={goToNextMonth} aria-label={t('nextMonth')}>&gt;</button>
        </div>

        <div className="calendar-filters">
          <div className="filter-group">
            <Select
              options={monthOptions}
              onChange={handleMonthChange}
              defaultValue={monthOptions.find(option => option.value === currentDate.getMonth())}
              className="basic-select"
              classNamePrefix="calendar-select"
              aria-label={t('selectMonth')}
            />
          </div>
          <div className="filter-group">
            <Select
              options={yearOptions}
              onChange={handleYearChange}
              defaultValue={yearOptions.find(option => option.value === getYear(currentDate))}
              className="year-select"
              classNamePrefix="calendar-select"
              aria-label={t('selectYear')}
            />
          </div>
        </div>

        <div className="calendar-weekdays">
          {weekHeaders.map(day => (
            <div key={day} className="weekday-header">{day}</div>
          ))}
        </div>

        <div className="calendar-weeks">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="calendar-week">
              <div className="week-number">
                {getWeek(week[0], { locale: currentLocale() })}
              </div>
              {week.map(day => {
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isToday = isSameDay(day, new Date());
                
                const { events: dayEvents, tasks: dayTasks, birthdays: dayBirthdays } = getItemsForDay(day);
                return (
                  <div
                    key={format(day, 'yyyy-MM-dd')}
                    className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                  >
                    <div className="day-header">
                      {format(day, 'd')}
                      {dayBirthdays.length > 0 && (
                        <div className="birthday-icon-container">
                          <span className="birthday-icon" aria-label={`${t('birthdaysToday')} : ${dayBirthdays.map(p => `${p.last_name} ${p.first_name}`).join(', ')}`}>
                            🎂
                          </span>
                          <div className="birthday-tooltip">
                            <h4>{t('birthdaysToday')}</h4>
                            <ul>
                              {[...new Set(dayBirthdays.map(p => p.id))].map(id => {
                                const item = dayBirthdays.find(p => p.id === id);
                                return (
                                  <li key={id}>
                                    {item.type === 'contact' ? '📋 ' : '👤 '}
                                    {item.last_name} {item.first_name}
                                    {item.type === 'contact' ? ` (${t('contact')})` : ` (${t('person')})`}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="day-content">
                      {dayEvents.slice(0, 2).map(event => (
                        <div
                          key={event.id}
                          className="calendar-event"
                          style={{ backgroundColor: event.color || '#4a6fa5' }}
                          onClick={() => openModal(event, 'event')}
                          title={event.title}
                        >
                          <span className="event-title">{event.title}</span>
                          {event.end_date && !isSameDay(parseISO(event.start_date), parseISO(event.end_date)) && (
                            <span className="event-duration">→</span>
                          )}
                        </div>
                      ))}
                      {dayTasks.slice(0, 2).map(task => (
                        <div
                          key={task.id}
                          className="calendar-task"
                          onClick={() => openModal(task, 'task')}
                          title={task.title}
                        >
                          <span className="task-indicator" />
                          <span className="task-title">{task.title}</span>
                        </div>
                      ))}
                      {dayEvents.length + dayTasks.length > 2 && (
                        <div className="more-items">
                          +{dayEvents.length + dayTasks.length - 2} {t('more')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="calendar-view-container">
      <h1>{t('calendarView')}</h1>

      {isLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>{t('loadingData')}</p>
        </div>
      ) : (
        <>
          {renderCalendar()}

           {/* Modal for event/task details */}
          <ReactModal
            isOpen={isModalOpen}
            onRequestClose={closeModal}
            className={modalType === 'event' ? "event-modal" : "task-modal"}
            overlayClassName="ReactModal__Overlay"
            ariaHideApp={false}
            shouldCloseOnOverlayClick={true}
          >
            {selectedItem && (
              <>
                <div className="modal-header">
                  <h2>{selectedItem.title}</h2>
                  <button onClick={closeModal} className="modal-close" aria-label={t('close')}>
                    ×
                  </button>
                </div>

                {/* Common content for both events and tasks */}
                {selectedItem.description && (
                  <div className="item-description">
                    <h3>{t('description')}</h3>
                    <p>{selectedItem.description}</p>
                  </div>
                )}

                <div className="item-dates">
                  <div className="date-item">
                    <span className="date-label">{t('startDate')}</span>
                    <span className="date-value">
                      {format(parseISO(selectedItem.start_date), 'PPpp')}
                    </span>
                  </div>
                  {selectedItem.end_date && (
                    <div className="date-item">
                      <span className="date-label">{modalType === 'event' ? t('endDate') : t('dueDate')}</span>
                      <span className="date-value">
                        {format(parseISO(selectedItem.end_date), 'PPpp')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Specific content based on modal type */}
                {modalType === 'event' ? (
                  <div className="event-details">
                    {selectedItem.color && (
                      <div className="color-indicator" style={{ backgroundColor: selectedItem.color }} />
                    )}
                    {selectedItem.categories && selectedItem.categories.length > 0 && (
                      <div className="categories-section">
                        <h3>{t('categories')}</h3>
                        <div className="categories-list">
                          {selectedItem.categories.map(categoryId => (
                            <CategoryDisplay key={categoryId} categoryId={categoryId} categories={categories} />
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedItem.people && selectedItem.people.length > 0 && (
                      <div className="people-section">
                        <h3>{t('involvedPeople')}</h3>
                        <div className="people-avatars">
                          {selectedItem.people.map(personId => (
                            <PersonDisplay key={personId} personId={personId} people={people} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="task-details">
                    {selectedItem.priority && (
                      <div className="priority-item">
                        <span className="priority-label">{t('priority')}</span>
                        <span className={`priority-value priority-${selectedItem.priority.toLowerCase()}`}>
                          {t(selectedItem.priority)}
                        </span>
                      </div>
                    )}
                    {selectedItem.recurrence && (
                      <div className="recurrence-item">
                        <span className="recurrence-label">{t('recurrence')}</span>
                        <span className="recurrence-value">
                          {t(selectedItem.recurrence)}
                        </span>
                      </div>
                    )}

                    {/* Display categories for tasks */}
                    {selectedItem.categories && selectedItem.categories.length > 0 && (
                      <div className="categories-section">
                        <h3>{t('categories')}</h3>
                        <div className="categories-list">
                          {selectedItem.categories.map(categoryId => (
                            <CategoryDisplay key={categoryId} categoryId={categoryId} categories={categories} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Display assigned people with avatars */}
                    {selectedItem.people && selectedItem.people.length > 0 && (
                      <div className="people-section">
                        <h3>{t('involvedPeople')}</h3>
                        <div className="people-avatars">
                          {selectedItem.people.map(personId => (
                            <PersonDisplay key={personId} personId={personId} people={people} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </ReactModal>
        </>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default CalendarView;
