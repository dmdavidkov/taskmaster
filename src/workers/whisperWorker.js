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

    static async getInstance(progress_callback = null) {
        this.tokenizer ??= AutoTokenizer.from_pretrained(this.model_id, {
            progress_callback,
        });
        this.processor ??= AutoProcessor.from_pretrained(this.model_id, {
            progress_callback,
            chunk_length_s: this.chunk_length_s,
            stride_length_s: this.stride_length_s,
            sampling_rate: SAMPLING_RATE,
        });

        this.model ??= WhisperForConditionalGeneration.from_pretrained(this.model_id, {
            dtype: {
                encoder_model: 'q4',
                decoder_model_merged: 'q4',
            },
            device: 'webgpu',
            progress_callback,
        });

        return Promise.all([this.tokenizer, this.processor, this.model]);
    }
}

let processing = false;

async function transcribe(audio, language) {
    if (processing) return;
    processing = true;

    try {
        const [tokenizer, processor, model] = await AutomaticSpeechRecognitionPipeline.getInstance();

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

async function load() {
    try {
        let loadProgress = 0;
        const updateProgress = () => {
            loadProgress += 25;
            self.postMessage({
                status: 'progress',
                progress: Math.min(loadProgress, 100)
            });
        };

        const [tokenizer, processor, model] = await AutomaticSpeechRecognitionPipeline.getInstance(updateProgress);
        
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

self.addEventListener('message', async (e) => {
    const { type, audio, language } = e.data;

    switch (type) {
        case 'load':
            await load();
            break;
        case 'transcribe':
            await transcribe(audio, language);
            break;
    }
});
