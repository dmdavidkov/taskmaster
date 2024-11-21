const OpenAI = require('openai');
const { ipcMain } = require('electron');
const log = require('electron-log');
const isDev = process.env.NODE_ENV === 'development';
const Store = require('electron-store');
const store = new Store();
require('dotenv').config();

class AIService {
    constructor() {
        this.client = null;
        this.modelName = null;
        this.currentApiKey = null;
        this.isInitialized = false;
        this.initializationError = null;
        this.initializationPromise = null;
    }

    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = (async () => {
            try {
                const config = this.getCurrentConfig();
                await this.initializeClient(config);
                this.isInitialized = true;
                log.info('AI Service initialized with model:', this.modelName);
            } catch (error) {
                this.isInitialized = false;
                this.initializationError = error;
                log.error('Failed to initialize AI Service:', error);
                throw error;
            }
        })();

        return this.initializationPromise;
    }

    async initializeClient(config = {}) {
        const currentConfig = this.getCurrentConfig();
        const apiKey = config.apiKey || currentConfig.apiKey;
        const baseURL = config.baseURL || currentConfig.baseURL;
        const modelName = config.modelName || currentConfig.modelName;
        
        if (!apiKey) {
            throw new Error('API key is required. Please configure the AI service.');
        }

        log.info('Initializing AI Service with base URL:', baseURL);
        log.info('Using model:', modelName);

        try {
            this.client = new OpenAI({
                baseURL: baseURL,
                apiKey: apiKey,
            });

            this.modelName = modelName;
            this.currentApiKey = apiKey;
            this.isInitialized = true;
            this.initializationError = null;
        } catch (error) {
            this.isInitialized = false;
            this.initializationError = error;
            throw error;
        }
    }

    getCurrentConfig() {
        // Always get fresh values from electron-store
        const config = {
            baseURL: store.get('aiService.baseURL', 'https://api.studio.nebius.ai/v1/'),
            apiKey: store.get('aiService.apiKey', ''),
            modelName: store.get('aiService.modelName', 'Qwen/Qwen2.5-72B-Instruct-fast')
        };

        // Only use .env as fallback if apiKey is empty
        if (!config.apiKey && isDev) {
            config.apiKey = process.env.REACT_APP_NEBIUS_API_KEY || '';
        }

        return config;
    }

    ensureInitialized() {
        if (!this.isInitialized) {
            const error = this.initializationError || new Error('AI service not initialized. Please configure the service first.');
            throw error;
        }

        const currentConfig = this.getCurrentConfig();
        
        // Re-initialize if config has changed
        if (!this.client || currentConfig.apiKey !== this.currentApiKey) {
            this.initializeClient(currentConfig);
        }
    }

    cleanJsonResponse(text) {
        log.info('Raw API response:', text);
        
        // Try to find JSON in the response that matches our task format
        const jsonMatches = text.match(/\{[\s\S]*"title"[\s\S]*"description"[\s\S]*"priority"[\s\S]*\}/);
        if (!jsonMatches) {
            // Try to find error JSON format
            const errorMatch = text.match(/\{[\s\S]*"error"[\s\S]*"reason"[\s\S]*\}/);
            if (errorMatch) {
                const errorJson = JSON.parse(errorMatch[0]);
                throw new Error(errorJson.reason || errorJson.error);
            }
            
            log.info('No valid task JSON found in response');
            throw new Error('Unable to create task from the voice input. Please try again with a clearer task description.');
        }

        const jsonText = jsonMatches[0];
        log.info('Extracted task JSON:', jsonText);
        
        try {
            const parsed = JSON.parse(jsonText);
            
            // Validate required task fields
            if (!parsed.title || typeof parsed.title !== 'string') {
                throw new Error('Invalid task: missing or invalid title');
            }
            if (!parsed.description || typeof parsed.description !== 'string') {
                throw new Error('Invalid task: missing or invalid description');
            }
            if (!parsed.priority || !['low', 'medium', 'high'].includes(parsed.priority.toLowerCase())) {
                throw new Error('Invalid task: invalid priority level');
            }
            
            return parsed;
        } catch (error) {
            log.error('Error parsing task JSON:', error);
            throw new Error('Unable to create task from the voice input. Please try again with a clearer task description.');
        }
    }

    async processText({ text, language = 'en' }) {
        if (!this.isInitialized) {
            throw new Error('AI service not initialized');
        }

        try {
            // Get user's timezone
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const now = new Date();
            const tzOffset = -now.getTimezoneOffset(); // Note: getTimezoneOffset() returns the opposite of what we want

            log.info('Processing text input: ', text);
            log.info('Language:', language);
            log.info('Timezone info:', {
                localTime: now.toLocaleString(),
                localISOTime: now.toISOString(),
                tzOffset,
                userTimezone
            });

            // Prepare the system message
            const systemMessage = this.getSystemMessage(language);
            log.info('System message:', systemMessage);
            const completion = await this.client.chat.completions.create({
                model: this.modelName,
                messages: [
                    { role: "system", content: systemMessage },
                    { role: "user", content: text }
                ],
                temperature: 0.7,
            });

            const result = completion.choices[0]?.message?.content;
            if (!result) {
                throw new Error('No response from AI service');
            }

            log.info('Raw API response:', result);

            // Parse the result
            let parsedResult;
            try {
                parsedResult = JSON.parse(result);
            } catch (error) {
                log.error('Error parsing AI response:', error);
                throw new Error('Invalid response format from AI service');
            }

            log.info('Extracted task JSON:', parsedResult);

            if (!parsedResult.title) {
                throw new Error(parsedResult.reason || parsedResult.error);
            }

            // Process the due date to ensure correct timezone
            if (parsedResult.dueDate) {
                // Parse the local time string into components
                const [datePart, timePart] = parsedResult.dueDate.split('T');
                const [year, month, day] = datePart.split('-').map(Number);
                const [hours, minutes] = timePart.split(':').map(Number);
                
                // Create date in local time
                const localDate = new Date(year, month - 1, day, hours, minutes);
                
                // Log timezone debugging information
                log.info('Date processing:', {
                    original: parsedResult.dueDate,
                    localDate: localDate.toLocaleString(),
                    utcDate: localDate.toISOString(),
                    tzOffset,
                    userTimezone
                });
                
                // Store the UTC time
                parsedResult.dueDate = localDate.toISOString();
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
                    language: language,
                    ...parsedResult.metadata
                }
            };
            log.info('Final processed result:', JSON.stringify(finalResult, null, 2));
            return finalResult;

        } catch (error) {
            log.error('Error in processText:', error);
            if (error.response?.status === 401) {
                throw new Error('AI service authentication failed. Please check your API key in Settings.');
            }
            throw error;
        }
    }

    getSystemMessage(language) {
        return `You are a multilingual task extraction assistant. Extract task information from user input and return it in JSON format.
        Current local time: ${new Date().toLocaleString()}
        
        Return ONLY JSON in this format, with no additional text:
        {
            "title": "Task title",
            "description": "Task description",
            "dueDate": "ISO date string in local time",
            "priority": "low|medium|high",
            "metadata": {
                "confidence": 0.0-1.0,
                "language": "detected language code"
            }
        }
        
        If the input is unclear or cannot be converted to a task, return this JSON:
        {
            "error": "Unable to create task from input",
            "reason": "Brief explanation why in user-friendly language"
        }
        
        Follow these rules:
        - Title should be actionable and natural in the target language
        - Description should include context and details not in the title
        - When processing dates and times, use the current local time shown above
        - Set dueDate based on the local time, not UTC
        - Infer priority from urgency words and context in the given language`;
    }

    async testConnection(config) {
        try {
            // Immediately update store with test config
            if (config) {
                store.set('aiService.baseURL', config.baseURL);
                store.set('aiService.apiKey', config.apiKey);
                store.set('aiService.modelName', config.modelName);
            }

            // Get the config we're testing
            const testConfig = config || this.getCurrentConfig();
            
            // Create a temporary client for testing
            const testClient = new OpenAI({
                baseURL: testConfig.baseURL,
                apiKey: testConfig.apiKey,
            });

            // Try a simple completion to test the connection
            const completion = await testClient.chat.completions.create({
                temperature: 0,
                max_tokens: 10,
                model: testConfig.modelName,
                messages: [
                    {
                        role: "user",
                        content: "Say 'ok' if you can hear me"
                    }
                ]
            });

            if (completion.choices[0]?.message?.content) {
                // Only update the main client if the test was successful
                await this.initializeClient(testConfig);
                return { success: true };
            } else {
                throw new Error('Invalid response from AI service');
            }
        } catch (error) {
            log.error('Error in testConnection:', error);
            if (error.response?.status === 401) {
                throw new Error('Authentication failed. Please check your API key.');
            }
            throw error;
        }
    }
}

// Create a single instance
const aiService = new AIService();

// Handle IPC calls
ipcMain.handle('ai:processText', async (event, { text, language }) => {
    try {
        return await aiService.processText({ text, language });
    } catch (error) {
        log.error('Error in ai:processText:', error);
        throw error;
    }
});

ipcMain.handle('ai:testConnection', async (event, config) => {
    try {
        // Test the connection with new config
        const result = await aiService.testConnection(config);
        
        // If successful, save the config
        if (result.success) {
            store.set('aiService.baseURL', config.baseURL);
            store.set('aiService.apiKey', config.apiKey);
            store.set('aiService.modelName', config.modelName);
        }
        
        return result;
    } catch (error) {
        log.error('Error in ai:testConnection:', error);
        throw error;
    }
});

module.exports = aiService;
