import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
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
import { bg } from 'date-fns/locale';

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
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('darkMode');
    return stored ? JSON.parse(stored) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sortBy, setSortBy] = useState('');
  const { tasks, loading, createTask, updateTask, deleteTask, toggleTaskCompletion } = useTaskStore();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      setDarkMode(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#2196f3',
      },
      secondary: {
        main: '#f50057',
      },
      background: {
        default: darkMode ? '#121212' : '#f5f5f5',
        paper: darkMode ? '#1e1e1e' : '#ffffff',
      },
    },
    typography: {
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      h1: { fontWeight: 700 },
      h2: { fontWeight: 600 },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: 0,
          },
        },
      },
    },
  });

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

  const handleAddTask = () => {
    setSelectedTask(null);
    setDrawerOpen(true);
  };

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
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
              darkMode={darkMode} 
              onThemeToggle={() => setDarkMode(!darkMode)} 
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
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  p: 2,
                }}
              >
                <Box 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end',
                    mb: 2 
                  }}
                >
                  <FormControl size="small">
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
                      <MenuItem value="">Default Order</MenuItem>
                      <MenuItem value="priority">Priority (High → Low)</MenuItem>
                      <MenuItem value="dueDate">Due Date (Earliest First)</MenuItem>
                      <MenuItem value="name">Name (A to Z)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <TaskList
                  tasks={tasks}
                  loading={loading}
                  selectedTab={selectedTab}
                  searchQuery={searchQuery}
                  sortBy={sortBy}
                  onTaskClick={handleTaskClick}
                  onTaskToggle={toggleTaskCompletion}
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
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 3,
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
