/**
 * AudioRecorder - Records microphone input and outputs PCM16 base64 chunks
 * Based on Google's official Gemini Live API implementation
 */

// Create worklet source from string
function createWorkletFromSrc(name: string, src: string): string {
  const blob = new Blob([src], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

// Audio recording worklet processor code
const AudioRecordingWorkletCode = `
class AudioRecordingProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.bufferSize = 2048;
  }

  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      const float32Data = input[0];
      
      // Convert Float32 to Int16
      const int16Data = new Int16Array(float32Data.length);
      for (let i = 0; i < float32Data.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Data[i]));
        int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      // Add to buffer
      for (let i = 0; i < int16Data.length; i++) {
        this.buffer.push(int16Data[i]);
      }
      
      // Send when buffer is full
      while (this.buffer.length >= this.bufferSize) {
        const chunk = this.buffer.splice(0, this.bufferSize);
        const int16Array = new Int16Array(chunk);
        this.port.postMessage({
          data: { int16arrayBuffer: int16Array.buffer }
        }, [int16Array.buffer]);
      }
    }
    return true;
  }
}

registerProcessor('audio-recorder-worklet', AudioRecordingProcessor);
`;

// Volume meter worklet processor code
const VolMeterWorkletCode = `
class VolMeterProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      const samples = input[0];
      let sum = 0;
      for (let i = 0; i < samples.length; i++) {
        sum += samples[i] * samples[i];
      }
      const rms = Math.sqrt(sum / samples.length);
      this.port.postMessage({ volume: Math.min(1, rms * 5) });
    }
    return true;
  }
}

registerProcessor('vu-meter', VolMeterProcessor);
`;

type AudioRecorderEvents = {
  data: (base64: string) => void;
  volume: (volume: number) => void;
};

export class AudioRecorder {
  private stream: MediaStream | undefined;
  private audioContext: AudioContext | undefined;
  private source: MediaStreamAudioSourceNode | undefined;
  private recordingWorklet: AudioWorkletNode | undefined;
  private vuWorklet: AudioWorkletNode | undefined;
  private recording: boolean = false;
  private starting: Promise<void> | null = null;
  private sampleRate: number;
  
  // Event handlers
  private onDataCallback: ((base64: string) => void) | null = null;
  private onVolumeCallback: ((volume: number) => void) | null = null;

  constructor(sampleRate = 16000) {
    this.sampleRate = sampleRate;
  }

  on(event: 'data', callback: (base64: string) => void): void;
  on(event: 'volume', callback: (volume: number) => void): void;
  on(event: string, callback: (...args: any[]) => void): void {
    if (event === 'data') {
      this.onDataCallback = callback;
    } else if (event === 'volume') {
      this.onVolumeCallback = callback;
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Could not request user media');
    }

    console.log('[AudioRecorder] Starting...');

    this.starting = new Promise(async (resolve, reject) => {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });
        console.log('[AudioRecorder] Got media stream');

        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: this.sampleRate
        });
        console.log('[AudioRecorder] AudioContext created, sampleRate:', this.audioContext.sampleRate);

        this.source = this.audioContext.createMediaStreamSource(this.stream);

        // Recording worklet
        const recordingWorkletSrc = createWorkletFromSrc('audio-recorder-worklet', AudioRecordingWorkletCode);
        await this.audioContext.audioWorklet.addModule(recordingWorkletSrc);
        this.recordingWorklet = new AudioWorkletNode(this.audioContext, 'audio-recorder-worklet');

        this.recordingWorklet.port.onmessage = (ev: MessageEvent) => {
          const arrayBuffer = ev.data.data?.int16arrayBuffer;
          if (arrayBuffer && this.onDataCallback) {
            const base64 = this.arrayBufferToBase64(arrayBuffer);
            this.onDataCallback(base64);
          }
        };
        this.source.connect(this.recordingWorklet);
        console.log('[AudioRecorder] Recording worklet connected');

        // VU meter worklet
        const vuWorkletSrc = createWorkletFromSrc('vu-meter', VolMeterWorkletCode);
        await this.audioContext.audioWorklet.addModule(vuWorkletSrc);
        this.vuWorklet = new AudioWorkletNode(this.audioContext, 'vu-meter');

        this.vuWorklet.port.onmessage = (ev: MessageEvent) => {
          if (this.onVolumeCallback) {
            this.onVolumeCallback(ev.data.volume);
          }
        };
        this.source.connect(this.vuWorklet);
        console.log('[AudioRecorder] VU meter worklet connected');

        this.recording = true;
        resolve();
        this.starting = null;
      } catch (error) {
        console.error('[AudioRecorder] Start error:', error);
        reject(error);
      }
    });

    return this.starting;
  }

  stop() {
    console.log('[AudioRecorder] Stopping...');
    const handleStop = () => {
      this.source?.disconnect();
      this.stream?.getTracks().forEach((track) => track.stop());
      this.stream = undefined;
      this.recordingWorklet = undefined;
      this.vuWorklet = undefined;
      this.recording = false;
      console.log('[AudioRecorder] Stopped');
    };

    if (this.starting) {
      this.starting.then(handleStop);
      return;
    }
    handleStop();
  }

  isRecording(): boolean {
    return this.recording;
  }
}

