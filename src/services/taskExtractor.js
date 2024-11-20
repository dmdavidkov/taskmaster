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
      // Don't return a fallback task when AI service is not initialized
      if (error.message?.includes('AI service not initialized')) {
        throw error; // Re-throw the error to prevent task creation
      }
      // Return a basic fallback task for other errors
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
export const processTranscription = async (text, originalText, language = 'en') => {
  try {
    const response = await window.electron.ai.processText({
      text: text,
      language: language
    });

    if (!response || !response.title) {
      throw new Error('Failed to process text into task');
    }

    return {
      title: response.title,
      description: response.description || originalText,
      dueDate: response.dueDate || null,
      priority: response.priority || 'medium',
      status: 'open',
      metadata: {
        confidence: response.metadata?.confidence || 1.0,
        originalText: text,
        speechText: originalText || text,
        language: language,
        ...response.metadata
      }
    };
  } catch (error) {
    // Check for specific error types
    if (error.message?.includes('401')) {
      throw new Error('AI service authentication failed. Please check your API key in Settings.');
    } else if (error.message?.includes('AI service not initialized')) {
      throw new Error('AI service not initialized. Please configure the service first.');
    } else {
      console.error('Error in processTranscription:', error);
      throw error;
    }
  }
};

export default taskExtractor;
