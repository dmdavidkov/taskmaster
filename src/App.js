import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { motion, AnimatePresence } from 'framer-motion';
import Box from '@mui/material/Box';
import Sidebar from './components/Sidebar';
import TaskList from './components/TaskList';
import TaskForm from './components/TaskForm';
import TitleBar from './components/TitleBar';
import UpdateNotification from './components/UpdateNotification';
import { useTaskStore } from './hooks/useTaskStore';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import SortIcon from '@mui/icons-material/Sort';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import ViewCompactIcon from '@mui/icons-material/ViewCompact';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import { bg } from 'date-fns/locale';
import { initializeApp } from './init';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import useThemeStore from './stores/themeStore';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('Error caught by boundary:', error, errorInfo);
    // You could also log to an error reporting service here
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            bgcolor: 'error.main',
            color: 'error.contrastText',
          }}
        >
          <h1>Something went wrong</h1>
          <pre style={{ whiteSpace: 'pre-wrap', maxWidth: '800px', overflow: 'auto' }}>
            {this.state.error?.toString()}
          </pre>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="inherit"
              onClick={() => window.location.reload()}
            >
              Reload Application
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

function App() {
  const { isDarkMode, muiTheme, initializeTheme } = useThemeStore();
  
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedTab, setSelectedTab] = useState(() => {
    const stored = localStorage.getItem('selectedTab');
    return stored ? JSON.parse(stored) : 'all';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sortBy, setSortBy] = useState(() => {
    const stored = localStorage.getItem('sortBy');
    return stored ? JSON.parse(stored) : '';
  });
  const [compactView, setCompactView] = useState(() => {
    const stored = localStorage.getItem('compactView');
    return stored ? JSON.parse(stored) : false;
  });
  const { tasks, loading, createTask, updateTask, deleteTask, toggleTaskCompletion } = useTaskStore();

  useEffect(() => {
    // Initialize app and theme when component mounts
    initializeApp();
    initializeTheme();

    // Listen for show-task events from notifications
    window.electron?.onShowTask((taskId) => {
      const taskToShow = tasks.find(t => t.id === taskId);
      if (taskToShow) {
        setSelectedTask(taskToShow);
        setDrawerOpen(true);
      }
    });
  }, [tasks, initializeTheme]); // Re-run when tasks or initializeTheme changes

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      // Removed this effect as it's now handled by the theme store
    };
    // Removed the event listener as it's now handled by the theme store
  }, []);

  useEffect(() => {
    localStorage.setItem('selectedTab', JSON.stringify(selectedTab));
  }, [selectedTab]);

  useEffect(() => {
    localStorage.setItem('sortBy', JSON.stringify(sortBy));
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('compactView', JSON.stringify(compactView));
  }, [compactView]);

  const handleTaskAction = async (actionFn, ...args) => {
    try {
      await actionFn(...args);
    } catch (error) {
      console.error('Task action failed:', error);
      // You could show a snackbar/toast here
    }
  };

  const handleSaveTask = (taskData) => {
    if (selectedTask) {
      handleTaskAction(updateTask, { ...selectedTask, ...taskData });
    } else {
      handleTaskAction(createTask, taskData);
    }
    setDrawerOpen(false);
    setSelectedTask(null);
  };

  const handleDeleteTask = (taskId) => {
    handleTaskAction(deleteTask, taskId);
    setDrawerOpen(false);
    setSelectedTask(null);
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedTask(null);
  };

  const handleAddTask = (taskData) => {
    if (taskData) {
      // If taskData is provided (from speech), create task directly
      handleTaskAction(createTask, taskData);
    } else {
      // Otherwise, open the form
      setSelectedTask(null);
      setDrawerOpen(true);
    }
  };

  const handleTaskToggle = async (taskId, updatedTask) => {
    if (updatedTask) {
      // If we have the updated task data, use it directly
      handleTaskAction(updateTask, updatedTask);
    } else {
      // Fallback to just toggling the task
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const action = task.completed ? window.electron.tasks.reopenTask : window.electron.tasks.completeTask;
        try {
          const updated = await action(taskId);
          handleTaskAction(updateTask, updated);
        } catch (error) {
          console.error('Error toggling task:', error);
        }
      }
    }
  };

  return (
    <ErrorBoundary>
      <ThemeProvider theme={muiTheme}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={bg}>
          <CssBaseline />
          
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100vh',
            bgcolor: 'background.default',
            overflow: 'hidden',
          }}>
            <TitleBar 
              darkMode={isDarkMode} 
              onThemeToggle={() => { /* Removed this prop as it's now handled by the theme store */ }}
            />
            
            <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              <Sidebar
                selectedTab={selectedTab}
                onTabChange={setSelectedTab}
                onSearchChange={setSearchQuery}
                searchQuery={searchQuery}
                onAddTask={handleAddTask}
              />
              
              <Box
                component={motion.main}
                layout
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  p: 2,
                  // Modern scrollbar styling
                  '&::-webkit-scrollbar': {
                    width: '8px',
                    background: 'transparent',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    borderRadius: '4px',
                    '&:hover': {
                      background: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                    },
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'transparent',
                  },
                  // Firefox scrollbar styling
                  scrollbarWidth: 'thin',
                  scrollbarColor: theme => 
                    `${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'} transparent`,
                }}
              >
                <Box 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end',
                    mb: 2 
                  }}
                >
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      displayEmpty
                      startAdornment={
                        <InputAdornment position="start">
                          <SortIcon />
                        </InputAdornment>
                      }
                    >
                      <MenuItem value="">Created On</MenuItem>
                      <MenuItem value="dueDate">Due Date</MenuItem>
                      <MenuItem value="priority">Priority</MenuItem>
                      <MenuItem value="name">A - Z</MenuItem>
                    </Select>
                  </FormControl>
                  <Tooltip title={compactView ? "Switch to normal view" : "Switch to compact view"}>
                    <IconButton
                      onClick={() => setCompactView(!compactView)}
                      color={compactView ? "primary" : "default"}
                      size="small"
                    >
                      {compactView ? <ViewAgendaIcon /> : <ViewCompactIcon />}
                    </IconButton>
                  </Tooltip>
                </Box>

                <TaskList
                  tasks={tasks}
                  loading={loading}
                  selectedTab={selectedTab}
                  searchQuery={searchQuery}
                  sortBy={sortBy}
                  compact={compactView}
                  onTaskClick={handleTaskClick}
                  onTaskToggle={handleTaskToggle}
                  onTaskDelete={handleDeleteTask}
                />
              </Box>

              <AnimatePresence mode="wait">
                {drawerOpen && (
                  <Box
                    component={motion.div}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    sx={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      bgcolor: 'rgba(0, 0, 0, 0.5)',
                      zIndex: 1200,
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'center',
                      overflowY: 'auto',
                      py: 3,
                    }}
                  >
                    <TaskForm
                      key="task-form"
                      task={selectedTask}
                      onSubmit={handleSaveTask}
                      onClose={handleDrawerClose}
                      onDelete={handleDeleteTask}
                    />
                  </Box>
                )}
              </AnimatePresence>
            </Box>
            
            <UpdateNotification />
          </Box>
        </LocalizationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
