import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Modal from 'react-modal';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './Navbar/Navbar';
import { useTheme } from './common/Theme/ThemeContext';
import { useTranslation } from './common/i18n/i18n';
import logo from '../assets/favicon.ico';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/Button.css';
import './common/Picker/DatePicker.css';
import './common/Modal/Modal.css';
import './common/Picker/ColorPicker.css';
import './common/Picker/TimePicker.css';
import PlannerView from './plannerManager/plannerCalendar/CalendarView';
import TasksView from './plannerManager/plannerTask/TaskView';
import EventsView from './plannerManager/plannerEvent/EventView';
import PeopleView from './plannerManager/plannerPeople/PeopleView';
import CategoriesView from './plannerManager/plannerCategory/CategoriesView';
import ContactsView from './contactManager/contactList/ContactView';
import NotesView from './noteManager/noteList/NoteView';

Modal.setAppElement('#root');

// Hook pour changer le titre selon la route avec traductions
function usePageTitle() {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    let title = t('pageTitleDefault');
    switch (location.pathname) {
      case '/planner':
        title = t('managePlanning');
        break;
      case '/tasks':
        title = t('manageTasks');
        break;
      case '/events':
        title = t('manageEvents');
        break;
      case '/people':
        title = t('managePeople');
        break;
      case '/categories':
        title = t('manageCategories');
        break;
      case '/contacts':
        title = t('manageContact');
        break;
      case '/notes':
        title = t('manageNotes');
        break;
      default:
        title = t('pageTitleDefault');
    }
    document.title = title;
  }, [location, t]);
}

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  usePageTitle();

  return (
    <div className={`app ${theme}`}>
      <Helmet>
        <title>{t('pageTitleDefault')}</title>
        <meta name="description" content={t('pageDescription')} />
      </Helmet>
      <div className="bg-blur"></div>
      <div className="main-container">
        <Navbar toggleTheme={toggleTheme} theme={theme} logo={logo} />
        <div className="content">
          <Routes>
            <Route path="/" element={<PlannerView />} />
            <Route path="/planner" element={<PlannerView />} />
            <Route path="/tasks" element={<TasksView />} />
            <Route path="/events" element={<EventsView />} />
            <Route path="/people" element={<PeopleView />} />
            <Route path="/categories" element={<CategoriesView />} />
            <Route path="/contacts" element={<ContactsView />} />
            <Route path="/notes" element={<NotesView />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default AppContent;
