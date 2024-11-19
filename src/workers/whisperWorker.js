import {
    AutoTokenizer,
    AutoProcessor,
    WhisperForConditionalGeneration,
    full,
} from '@huggingface/transformers';

const MAX_NEW_TOKENS = 128;
const SAMPLING_RATE = 16000;

class AutomaticSpeechRecognitionPipeline {
    static model_id = 'onnx-community/whisper-large-v3-turbo';
    static tokenizer = null;
    static processor = null;
    static model = null;
    static chunk_length_s = 30;
    static stride_length_s = 5;

    static async getInstance(progress_callback = null, config = null) {
        // Reset all instances if config is provided
        if (config) {
            this.tokenizer = null;
            this.processor = null;
            this.model = null;
            this.model_id = config.model_id;
        }

        this.tokenizer ??= AutoTokenizer.from_pretrained(this.model_id, {
            progress_callback,
        });
        this.processor ??= AutoProcessor.from_pretrained(this.model_id, {
            progress_callback,
            chunk_length_s: this.chunk_length_s,
            stride_length_s: this.stride_length_s,
            sampling_rate: SAMPLING_RATE,
        });

        const modelConfig = config || {
            encoder_model: 'q4',
            decoder_model_merged: 'q4',
            model_id: this.model_id
        };

        this.model ??= WhisperForConditionalGeneration.from_pretrained(modelConfig.model_id, {
            dtype: {
                encoder_model: modelConfig.encoder_model,
                decoder_model_merged: modelConfig.decoder_model_merged,
            },
            device: 'webgpu',
            progress_callback,
        });

        return Promise.all([this.tokenizer, this.processor, this.model]);
    }

    static reset() {
        this.tokenizer = null;
        this.processor = null;
        this.model = null;
        this.model_id = 'onnx-community/whisper-large-v3-turbo';
    }
}

let processing = false;
let pipeline = null;

async function transcribe(audio, language, config) {
    if (processing) return;
    processing = true;

    try {
        const [tokenizer, processor, model] = await AutomaticSpeechRecognitionPipeline.getInstance(null, config);

        // Process audio through the processor
        const inputs = await processor(audio, {
            sampling_rate: SAMPLING_RATE,
            return_tensors: true
        });

        const outputs = await model.generate({
            ...inputs,
            max_new_tokens: MAX_NEW_TOKENS,
            language: language,
            task: 'transcribe',
            return_timestamps: false,
        });

        const text = tokenizer.batch_decode(outputs, { 
            skip_special_tokens: true,
        })[0];

        self.postMessage({
            status: 'complete',
            text
        });
    } catch (error) {
        console.error('Transcription error:', error);
        self.postMessage({
            status: 'error',
            error: error.message
        });
    } finally {
        processing = false;
    }
}

async function load(config) {
    try {
        let loadProgress = 0;
        const updateProgress = () => {
            loadProgress += 25;
            self.postMessage({
                status: 'progress',
                progress: Math.min(loadProgress, 100)
            });
        };

        const [tokenizer, processor, model] = await AutomaticSpeechRecognitionPipeline.getInstance(updateProgress, config);
        
        // Warm up the model with dummy input
        self.postMessage({
            status: 'progress',
            progress: 75,
            message: 'Warming up model...'
        });

        // Create dummy input with correct dimensions as Float32Array
        const dummyLength = 3000 * 128;
        const dummyInput = new Float32Array(dummyLength).fill(0);
        const dummyInputs = await processor(dummyInput, {
            sampling_rate: SAMPLING_RATE,
            return_tensors: true
        });

        await model.generate({
            ...dummyInputs,
            max_new_tokens: 1,
            language: 'en',
            task: 'transcribe',
        });

        self.postMessage({ 
            status: 'ready',
            message: 'Model ready'
        });
    } catch (error) {
        console.error('Loading error:', error);
        console.error('Inputs given to model:', error.inputs);
        self.postMessage({
            status: 'error',
            error: error.message
        });
    }
}

self.onmessage = async (e) => {
    const { type, audio, language, config } = e.data;

    switch (type) {
        case 'load':
            await load(config);
            break;
        case 'transcribe':
            await transcribe(audio, language, config);
            break;
    }
};
