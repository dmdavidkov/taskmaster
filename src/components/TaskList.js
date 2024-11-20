import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isFuture, parseISO, startOfDay, endOfDay, isWithinInterval, addDays } from 'date-fns';
import { formatInTimeZone, utcToZonedTime } from 'date-fns-tz';
import CircularProgress from '@mui/material/CircularProgress';
import { styled } from '@mui/material/styles';
import Chip from '@mui/material/Chip';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import TranslateIcon from '@mui/icons-material/Translate';
import Tooltip from '@mui/material/Tooltip';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(2),
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateX(5px)',
    boxShadow: theme.shadows[4],
  },
  '& .content': {
    flexGrow: 1,
    minWidth: 0,
  },
  '& .actions': {
    display: 'flex',
    flexShrink: 0,
    gap: theme.spacing(1),
  },
}));

const TaskList = ({ 
  tasks = [], 
  loading = false, 
  selectedTab = 'all',
  searchQuery = '',
  sortBy = 'dueDate',
  onTaskClick,
  onTaskToggle,
  onTaskDelete 
}) => {
  // Get user's timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const getPriorityColor = (priority) => {
    // Handle both string and object priority formats
    const priorityLevel = typeof priority === 'object' ? priority.level : priority;
    
    switch (priorityLevel?.toLowerCase()) {
      case 'critical':
        return 'error';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    try {
      // Convert UTC to local time zone for display
      return formatInTimeZone(new Date(date), userTimezone, 'MMM d, yyyy h:mm a');
    } catch (error) {
      console.error('Error formatting date:', error);
      return format(new Date(date), 'MMM d, yyyy');
    }
  };

  const isTaskToday = (date) => {
    if (!date) return false;
    try {
      // Convert UTC to local time for comparison
      const localDate = utcToZonedTime(new Date(date), userTimezone);
      const today = new Date();
      return startOfDay(localDate) <= today && endOfDay(localDate) >= today;
    } catch (error) {
      console.error('Error checking if task is today:', error);
      return false;
    }
  };

  const isTaskUpcoming = (date) => {
    if (!date) return false;
    try {
      // Convert UTC to local time for comparison
      const localDate = utcToZonedTime(new Date(date), userTimezone);
      const today = new Date();
      return localDate > today;
    } catch (error) {
      console.error('Error checking if task is upcoming:', error);
      return false;
    }
  };

  const filteredAndSortedTasks = useMemo(() => {
    // First filter tasks
    let filtered = tasks.filter(task => {
      const taskTitle = task?.title || '';
      const taskDescription = task?.description || '';
      const matchesSearch = taskTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        taskDescription.toLowerCase().includes(searchQuery.toLowerCase());
      
      switch (selectedTab) {
        case 'all':
          return !task.completed && matchesSearch;
        case 'active':
          return !task.completed && matchesSearch;
        case 'completed':
          return task.completed && matchesSearch;
        case 'today':
          return task.dueDate && isTaskToday(task.dueDate) && !task.completed && matchesSearch;
        case 'upcoming':
          return task.dueDate && isTaskUpcoming(task.dueDate) && !task.completed && matchesSearch;
        case 'priority':
          return task.priority === 'high' && !task.completed && matchesSearch;
        default:
          return matchesSearch;
      }
    });

    // Then sort tasks
    switch (sortBy) {
      case 'priority':
        return [...filtered].sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          const aPriority = a?.priority || 'low';
          const bPriority = b?.priority || 'low';
          return priorityOrder[aPriority] - priorityOrder[bPriority];
        });
      case 'dueDate':
        return [...filtered].sort((a, b) => {
          if (!a?.dueDate) return 1;
          if (!b?.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        });
      case 'name':
        return [...filtered].sort((a, b) => {
          const aTitle = (a?.title || '').toLowerCase();
          const bTitle = (b?.title || '').toLowerCase();
          return aTitle.localeCompare(bTitle);
        });
      default:
        return filtered;
    }
  }, [tasks, selectedTab, searchQuery, sortBy]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (filteredAndSortedTasks.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', p: 3, color: 'text.secondary' }}>
        <Typography variant="body1">
          {searchQuery
            ? 'No tasks match your search'
            : selectedTab === 'completed'
            ? 'No completed tasks'
            : selectedTab === 'active'
            ? 'No active tasks'
            : selectedTab === 'today'
            ? 'No tasks due today'
            : selectedTab === 'upcoming'
            ? 'No upcoming tasks'
            : selectedTab === 'priority'
            ? 'No high priority tasks'
            : 'No open tasks'}
        </Typography>
      </Box>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <Box
        component={motion.div}
        layout
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          p: 2,
        }}
      >
        {filteredAndSortedTasks.map((task) => (
          <motion.div
            key={task.id}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <StyledPaper>
              <IconButton
                size="small"
                onClick={() => onTaskToggle(task.id)}
                color={task.completed ? 'primary' : 'default'}
              >
                {task.completed ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
              </IconButton>

              <div className="content" onClick={() => onTaskClick(task)}>
                <Typography
                  variant="h6"
                  component="h3"
                  sx={{
                    textDecoration: task.completed ? 'line-through' : 'none',
                    color: task.completed ? 'text.secondary' : 'text.primary',
                  }}
                >
                  {task?.title || 'Untitled Task'}
                </Typography>

                {task?.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      textDecoration: task.completed ? 'line-through' : 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {task.description}
                  </Typography>
                )}

                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  {task.priority && (
                    <Chip
                      label={typeof task.priority === 'object' ? task.priority.level : task.priority}
                      size="small"
                      color={getPriorityColor(task.priority)}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  )}
                  {task.dueDate && (
                    <Chip
                      label={formatDate(task.dueDate)}
                      size="small"
                      color={isTaskToday(task.dueDate) ? 'warning' : 'default'}
                    />
                  )}
                  {task.metadata?.speechText && (
                    <Tooltip
                      title={
                        <Box>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            mb: 1 
                          }}>
                            <TranslateIcon fontSize="small" />
                            <Typography variant="caption" sx={{ 
                              backgroundColor: 'primary.main',
                              color: 'primary.contrastText',
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              fontWeight: 'bold'
                            }}>
                              {task.metadata.language.toUpperCase()}
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ 
                            whiteSpace: 'pre-wrap',
                            fontStyle: 'italic',
                            color: 'text.secondary'
                          }}>
                            "{task.metadata.speechText}"
                          </Typography>
                        </Box>
                      }
                      placement="top"
                      arrow
                    >
                      <IconButton 
                        size="small" 
                        sx={{ 
                          p: 0.5,
                          color: 'primary.main',
                          '&:hover': {
                            backgroundColor: 'primary.main',
                            color: 'primary.contrastText'
                          }
                        }}
                      >
                        <RecordVoiceOverIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </div>

              <div className="actions">
                <IconButton
                  size="small"
                  onClick={() => onTaskClick(task)}
                  color="primary"
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => onTaskDelete(task.id)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </div>
            </StyledPaper>
          </motion.div>
        ))}
      </Box>
    </AnimatePresence>
  );
};

export default TaskList;
