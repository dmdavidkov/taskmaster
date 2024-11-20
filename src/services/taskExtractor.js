import { config } from '../config';
import { parseISO } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

class TaskExtractor {
  constructor() {
    if (!config.NEBIUS_API_KEY) {
      throw new Error('Nebius API key not found in environment variables. Please check your .env file.');
    }
    // Get user's timezone
    this.userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  // Keep UTC date as is, since we want to store dates in UTC format
  processDate(date) {
    if (!date) return null;
    try {
      // Ensure the date is in ISO format but preserve UTC
      return new Date(date).toISOString();
    } catch (error) {
      console.error('Error processing date:', error);
      return null;
    }
  }

  async processTranscription(text, speechText = null, language = 'en') {
    try {
      // Use the IPC channel to process the text in the main process, passing the language
      const result = await window.electron.ai.processTaskText(text, language);
      
      // Format the task data
      return {
        title: result.title || text.split(/[.!?]/)[0].trim(),
        description: result.description || text,
        dueDate: this.processDate(result.dueDate),
        priority: result.priority || 'medium',
        metadata: {
          confidence: result.metadata?.confidence || 1.0,
          originalText: text,
          speechText: speechText || text,
          language: language,
          ...result.metadata
        }
      };
    } catch (error) {
      console.error('Error processing task with LLM:', error);
      // Return a basic fallback task
      return {
        title: text.split(/[.!?]/)[0].trim(),
        description: text,
        dueDate: null,
        priority: 'medium',
        metadata: {
          confidence: 0.3,
          originalText: text,
          speechText: speechText || text,
          language: language,
          error: error.message
        }
      };
    }
  }
}

// Create and export a single instance
const taskExtractor = new TaskExtractor();

// Export the processTranscription method bound to the taskExtractor instance
export const processTranscription = taskExtractor.processTranscription.bind(taskExtractor);
export default taskExtractor;
