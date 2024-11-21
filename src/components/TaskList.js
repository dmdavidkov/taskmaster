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
import { styled, alpha } from '@mui/material/styles';
import Chip from '@mui/material/Chip';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import TranslateIcon from '@mui/icons-material/Translate';
import Tooltip from '@mui/material/Tooltip';

const StyledPaper = styled(Paper)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  transition: 'all 0.2s ease-in-out',
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    transform: 'translateX(5px)',
    boxShadow: theme.shadows[4],
  },
  '& .content': {
    flexGrow: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  '& .actions': {
    display: 'flex',
    flexShrink: 0,
  },
  '& .metadata': {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing(1),
  }
}));

const TaskList = ({ 
  tasks = [], 
  loading = false, 
  selectedTab = 'all',
  searchQuery = '',
  sortBy = 'dueDate',
  compact = false,
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
      return isToday(localDate);
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
      const today = startOfDay(new Date());
      return localDate > today && isFuture(localDate);
    } catch (error) {
      console.error('Error checking if task is upcoming:', error);
      return false;
    }
  };

  const isTaskExpired = (date) => {
    if (!date) return false;
    try {
      const localDate = utcToZonedTime(new Date(date), userTimezone);
      return localDate < new Date() && !isToday(localDate);
    } catch (error) {
      console.error('Error checking if task is expired:', error);
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
          return !task.completed && isTaskToday(task.dueDate) && matchesSearch;
        case 'upcoming':
          return !task.completed && isTaskUpcoming(task.dueDate) && matchesSearch;
        case 'priority':
          const priority = typeof task.priority === 'object' ? task.priority.level : task.priority;
          return !task.completed && (priority?.toLowerCase() === 'high' || priority?.toLowerCase() === 'critical') && matchesSearch;
        default:
          return matchesSearch;
      }
    });

    // Then sort tasks
    switch (sortBy) {
      case 'priority':
        return [...filtered].sort((a, b) => {
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          // Handle both string and object priority formats
          const aPriority = (typeof a?.priority === 'object' ? a?.priority?.level : a?.priority)?.toLowerCase() || 'low';
          const bPriority = (typeof b?.priority === 'object' ? b?.priority?.level : b?.priority)?.toLowerCase() || 'low';
          return priorityOrder[aPriority] - priorityOrder[bPriority];
        });
      case 'dueDate':
        return [...filtered].sort((a, b) => {
          if (!a?.dueDate) return 1;
          if (!b?.dueDate) return -1;
          // Convert dates to local timezone for comparison
          const aDate = utcToZonedTime(new Date(a.dueDate), userTimezone);
          const bDate = utcToZonedTime(new Date(b.dueDate), userTimezone);
          return aDate - bDate;
        });
      case 'name':
        return [...filtered].sort((a, b) => {
          const aTitle = (a?.title || '').toLowerCase().trim();
          const bTitle = (b?.title || '').toLowerCase().trim();
          return aTitle.localeCompare(bTitle);
        });
      default:
        // Sort by createdAt timestamp (newest first)
        return [...filtered].sort((a, b) => {
          const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime; // Descending order (newest first)
        });
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
          gap: compact ? 0.5 : 2,
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
            <StyledPaper 
              sx={(theme) => ({
                cursor: 'pointer',
                padding: compact ? theme.spacing(1.5) : theme.spacing(2),
                marginBottom: 0,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing(2),
                position: 'relative',
                transition: 'all 0.2s ease-in-out',
                backgroundColor: theme.palette.background.paper,
                borderLeft: (theme) => {
                  const priorityLevel = typeof task.priority === 'object' ? task.priority.level : task.priority;
                  let color;
                  switch (priorityLevel?.toLowerCase()) {
                    case 'critical':
                      color = theme.palette.error.main;
                      break;
                    case 'high':
                      color = '#ff6b6b';  // Vibrant coral red
                      break;
                    case 'medium':
                      color = '#ffd43b';  // Bright yellow
                      break;
                    case 'low':
                      color = '#69db7c';  // Fresh green
                      break;
                    default:
                      color = 'transparent';
                  }
                  return `4px solid ${alpha(color, 0.8)}`;
                },
                borderBottom: compact ? `1px solid ${alpha(theme.palette.divider, 0.5)}` : 'none',
                '&:last-child': {
                  marginBottom: 0,
                  borderBottom: 'none',
                },
                '&:hover': {
                  transform: 'translateX(5px)',
                  boxShadow: theme.shadows[4],
                  zIndex: 1,
                  '& .complete-button': {
                    opacity: 1,
                    transform: 'scale(1)',
                  }
                },
                '& .complete-button': {
                  padding: 0,
                  opacity: task.completed ? 1 : 0.7,
                  transform: task.completed ? 'scale(1)' : 'scale(0.9)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '& svg': {
                    fontSize: compact ? '1.25rem' : '1.5rem',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  },
                  '&:hover': {
                    opacity: 1,
                    transform: 'scale(1.1)',
                    backgroundColor: 'transparent',
                  }
                },
                '& .content': {
                  flexGrow: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: compact ? theme.spacing(0.5) : theme.spacing(1),
                },
                '& .MuiTypography-root.title': {
                  fontSize: compact ? '0.95rem' : '1.125rem',
                  fontWeight: compact ? 500 : 600,
                  lineHeight: compact ? 1.3 : 1.4,
                  color: task.completed ? theme.palette.text.secondary : theme.palette.text.primary,
                  textDecoration: task.completed ? 'line-through' : 'none',
                  transition: 'all 0.2s ease-in-out',
                },
                '& .MuiTypography-root.description': {
                  fontSize: '0.875rem',
                  color: theme.palette.text.secondary,
                  lineHeight: 1.4,
                },
                '& .metadata': {
                  marginTop: compact ? theme.spacing(0.5) : theme.spacing(1),
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: theme.spacing(1),
                },
                '& .MuiChip-root': {
                  height: compact ? 16 : 20,
                  '& .MuiChip-label': {
                    fontSize: compact ? '0.65rem' : '0.75rem',
                    padding: compact ? '0 3px' : '0 4px',
                    lineHeight: 1.2,
                  },
                  '& .MuiChip-icon': {
                    fontSize: compact ? '0.7rem' : '0.75rem',
                    width: compact ? 12 : 14,
                    height: compact ? 12 : 14,
                    marginLeft: compact ? '2px' : '3px',
                    marginRight: compact ? '-3px' : '-2px',
                  }
                },
                '& .actions': {
                  position: 'absolute',
                  right: theme.spacing(1),
                  top: '50%',
                  transform: 'translateY(-50%)',
                  opacity: 0,
                  transition: 'opacity 0.2s ease-in-out',
                  backgroundColor: theme.palette.background.paper,
                  boxShadow: theme.shadows[1],
                  borderRadius: theme.shape.borderRadius,
                  padding: theme.spacing(0.5),
                  gap: theme.spacing(0.5),
                  zIndex: 1,
                },
                '&:hover .actions': {
                  opacity: 1,
                },
              })}
            >
              <IconButton
                className="complete-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTaskToggle(task.id);
                }}
                color={task.completed ? 'success' : 'default'}
              >
                {task.completed ? (
                  <CheckCircleIcon sx={{ 
                    color: theme => theme.palette.success.main,
                  }} />
                ) : (
                  <RadioButtonUncheckedIcon sx={{
                    color: theme => theme.palette.action.active,
                  }} />
                )}
              </IconButton>

              <Box 
                className="content"
                onClick={() => onTaskClick?.(task)}
              >
                <Typography className="title">
                  {task.title}
                </Typography>
                
                {!compact && task.description && (
                  <Typography className="description">
                    {task.description}
                  </Typography>
                )}
                
                <Box className="metadata">
                  {task.dueDate && (
                    <Chip
                      label={formatDate(task.dueDate)}
                      size="small"
                      color={isTaskExpired(task.dueDate) ? 'error' : isTaskToday(task.dueDate) ? 'warning' : 'default'}
                      variant={isTaskExpired(task.dueDate) || isTaskToday(task.dueDate) ? 'filled' : 'outlined'}
                    />
                  )}
                  {task.completed && task.completedAt && (
                    <Chip
                      label={`Completed: ${formatDate(task.completedAt)}`}
                      size="small"
                      color="success"
                      variant="filled"
                    />
                  )}
                  {task.metadata?.speechText && (
                    <Tooltip title={task.metadata.speechText}>
                      <Chip
                        icon={<RecordVoiceOverIcon />}
                        label={task.metadata.language.toUpperCase()}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    </Tooltip>
                  )}
                </Box>
              </Box>

              <Box className="actions">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTaskClick(task);
                  }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTaskDelete(task.id);
                  }}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </StyledPaper>
          </motion.div>
        ))}
      </Box>
    </AnimatePresence>
  );
};

export default TaskList;
