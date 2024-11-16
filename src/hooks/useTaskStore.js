import { useState, useEffect } from 'react';

export const useTaskStore = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const loadedTasks = await window.electron.tasks.getTasks();
      setTasks(loadedTasks || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const saveTasks = async (updatedTasks) => {
    try {
      await window.electron.tasks.saveTasks(updatedTasks);
    } catch (error) {
      console.error('Error saving tasks:', error);
      throw error;
    }
  };

  const createTask = async (taskData) => {
    try {
      const task = {
        ...taskData,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completed: false
      };
      
      const newTasks = [...tasks, task];
      await saveTasks(newTasks);
      setTasks(newTasks);
      return task;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  };

  const updateTask = async (task) => {
    try {
      const updatedTask = {
        ...task,
        updatedAt: new Date().toISOString()
      };
      
      const updatedTasks = tasks.map(t => t.id === task.id ? updatedTask : t);
      await saveTasks(updatedTasks);
      setTasks(updatedTasks);
      return updatedTask;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const deleteTask = async (taskId) => {
    try {
      const filteredTasks = tasks.filter(t => t.id !== taskId);
      await saveTasks(filteredTasks);
      setTasks(filteredTasks);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  const toggleTaskCompletion = async (taskId) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) throw new Error('Task not found');
      
      const updatedTask = {
        ...task,
        completed: !task.completed,
        completedAt: !task.completed ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString()
      };
      
      const updatedTasks = tasks.map(t => t.id === taskId ? updatedTask : t);
      await saveTasks(updatedTasks);
      setTasks(updatedTasks);
      return updatedTask;
    } catch (error) {
      console.error('Error toggling task completion:', error);
      throw error;
    }
  };

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    loadTasks
  };
};
