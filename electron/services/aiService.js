const OpenAI = require('openai');
const { ipcMain } = require('electron');
const log = require('electron-log');
require('dotenv').config();

class AIService {
    constructor() {
        const apiKey = process.env.REACT_APP_NEBIUS_API_KEY;
        if (!apiKey) {
            throw new Error('REACT_APP_NEBIUS_API_KEY environment variable is missing. Please check your .env file.');
        }

        log.info('Initializing AI Service with API key:', apiKey.substring(0, 10) + '...');

        this.client = new OpenAI({
            baseURL: 'https://api.studio.nebius.ai/v1/',
            apiKey: apiKey,
        });
    }

    cleanJsonResponse(text) {
        log.info('Raw API response:', text);
        
        // Remove markdown code block markers if present
        text = text.replace(/```(json)?/g, '').trim();
        log.info('Cleaned text:', text);
        
        try {
            const parsed = JSON.parse(text);
            log.info('Parsed JSON:', parsed);
            return parsed;
        } catch (error) {
            log.error('Failed to parse JSON response. Text:', text);
            log.error('Parse error:', error);
            throw new Error('Invalid JSON response from AI service');
        }
    }

    async processText(text, language = 'en') {
        try {
            log.info('Processing text input:', text);
            log.info('Language:', language);
            
            // Get current time in UTC
            const now = new Date();
            const utcDateTime = now.toISOString();
            // Get user's timezone offset in minutes
            const tzOffset = now.getTimezoneOffset();
            
            const completion = await this.client.chat.completions.create({
                temperature: 0,
                max_tokens: 2048,
                model: "Qwen/Qwen2.5-72B-Instruct-fast",
                messages: [
                    {
                        role: "system",
                        content: `You are a multilingual task extraction assistant. Extract task information from user input and return it in JSON format.
                        The current UTC date and time is: ${utcDateTime}
                        The user's timezone offset is: ${-tzOffset} minutes from UTC
                        
                        Return JSON in this format:
                        {
                            "title": "Task title",
                            "description": "Task description",
                            "dueDate": "ISO date string",
                            "priority": "low|medium|high",
                            "metadata": {
                                "confidence": 0.0-1.0,
                                "language": "detected language code"
                            }
                        }
                        
                        Follow these rules:
                        - Title should be actionable and natural in the target language
                        - Description should include context and details not in the title
                        - Convert relative dates (tomorrow, next week) to actual dates using ${utcDateTime} as reference
                        - Return dates in ISO format adjusted for the user's timezone (${-tzOffset} minutes from UTC)
                        - Infer priority from urgency words and context in the given language
                        - Preserve any language-specific formatting or special characters
                        - Focus on delivering gramatically and punctually correct responses`
                    },
                    {
                        role: "user",
                        content: text
                    }
                ]
            });

            log.info('API Response:', JSON.stringify(completion.choices[0], null, 2));
            
            const result = completion.choices[0].message.content;
            log.info('AI Response:', result);

            try {
                const parsedResult = JSON.parse(result);
                
                // Convert dates back to local time if they exist
                if (parsedResult.dueDate) {
                    const dueDate = new Date(parsedResult.dueDate);
                    parsedResult.dueDate = dueDate.toISOString();
                }
                
                const finalResult = {
                    title: parsedResult.title || 'Untitled Task',
                    description: parsedResult.description || '',
                    dueDate: parsedResult.dueDate,
                    priority: ['high', 'medium', 'low'].includes(parsedResult.priority?.toLowerCase()) 
                        ? parsedResult.priority.toLowerCase() 
                        : 'medium',
                    metadata: {
                        confidence: completion.choices[0].finish_reason === 'stop' ? 0.9 : 0.6,
                        originalText: text,
                        language: language
                    }
                };
                log.info('Final processed result:', JSON.stringify(finalResult, null, 2));
                return finalResult;
            } catch (parseError) {
                log.error('Error parsing AI response:', parseError);
                throw new Error('Invalid response format from AI service');
            }
        } catch (error) {
            log.error('Error in AI service:', error);
            throw error;
        }
    }
}

// Create a single instance
const aiService = new AIService();

// Handle IPC calls
ipcMain.handle('extract-task', async (event, text, language = 'en') => {
    return await aiService.processText(text, language);
});

module.exports = aiService;
