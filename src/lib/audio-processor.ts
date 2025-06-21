/**
 * Audio processing utility functions for voice interactions
 */

/**
 * Normalizes audio levels to improve voice quality
 * @param audioBuffer The raw audio buffer
 * @returns Normalized audio buffer
 */
export async function normalizeAudio(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
  // Find the maximum amplitude in the buffer
  const channels = Array(audioBuffer.numberOfChannels)
    .fill(null)
    .map((_, i) => audioBuffer.getChannelData(i));
  
  let maxAmp = 0;
  for (const channel of channels) {
    for (const sample of channel) {
      const abs = Math.abs(sample);
      if (abs > maxAmp) {
        maxAmp = abs;
      }
    }
  }
  
  // Skip normalization if already at a good level
  if (maxAmp > 0.1 && maxAmp < 0.8) {
    return audioBuffer;
  }
  
  // Create a new audio buffer with the same specifications
  const context = new AudioContext();
  const normalizedBuffer = context.createBuffer(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );
  
  // Normalize each channel
  const targetPeak = 0.7; // Target peak amplitude
  const scaleFactor = maxAmp > 0 ? targetPeak / maxAmp : 1;
  
  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    const channelData = audioBuffer.getChannelData(i);
    const normalizedData = normalizedBuffer.getChannelData(i);
    
    for (let j = 0; j < channelData.length; j++) {
      normalizedData[j] = channelData[j] * scaleFactor;
    }
  }
  
  return normalizedBuffer;
}

/**
 * Splits audio into chunks for progressive processing
 * @param audioBlob The complete audio recording
 * @returns Array of audio chunks
 */
export async function chunkAudioForStreaming(audioBlob: Blob): Promise<Blob[]> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  const chunkDuration = 2; // seconds
  const chunks: Blob[] = [];
  const sampleRate = audioBuffer.sampleRate;
  const channelCount = audioBuffer.numberOfChannels;
  
  // If the audio is very short, don't bother chunking
  if (audioBuffer.duration <= chunkDuration) {
    return [audioBlob];
  }
  
  for (let i = 0; i < audioBuffer.duration; i += chunkDuration) {
    const chunkFrames = Math.min(sampleRate * chunkDuration, audioBuffer.length - i * sampleRate);
    
    // Create new buffer for the chunk
    const chunkBuffer = audioContext.createBuffer(channelCount, chunkFrames, sampleRate);
    
    // Copy data to the chunk buffer
    for (let channel = 0; channel < channelCount; channel++) {
      const originalData = audioBuffer.getChannelData(channel);
      const chunkData = chunkBuffer.getChannelData(channel);
      
      for (let frame = 0; frame < chunkFrames; frame++) {
        chunkData[frame] = originalData[i * sampleRate + frame];
      }
    }
    
    // Convert chunk to blob
    const offlineContext = new OfflineAudioContext(
      channelCount,
      chunkFrames,
      sampleRate
    );
    
    const source = offlineContext.createBufferSource();
    source.buffer = chunkBuffer;
    source.connect(offlineContext.destination);
    source.start(0);
    
    const renderedBuffer = await offlineContext.startRendering();
    const wavBlob = await bufferToWav(renderedBuffer);
    
    chunks.push(wavBlob);
  }
  
  return chunks;
}

/**
 * Converts AudioBuffer to WAV format Blob
 */
function bufferToWav(buffer: AudioBuffer): Promise<Blob> {
  return new Promise((resolve) => {
    const length = buffer.length * buffer.numberOfChannels * 2;
    const view = new DataView(new ArrayBuffer(44 + length));
    
    // RIFF identifier
    writeString(view, 0, 'RIFF');
    // File length
    view.setUint32(4, 36 + length, true);
    // RIFF type
    writeString(view, 8, 'WAVE');
    // Format chunk identifier
    writeString(view, 12, 'fmt ');
    // Format chunk length
    view.setUint32(16, 16, true);
    // Sample format (raw)
    view.setUint16(20, 1, true);
    // Channel count
    view.setUint16(22, buffer.numberOfChannels, true);
    // Sample rate
    view.setUint32(24, buffer.sampleRate, true);
    // Byte rate (sample rate * block align)
    view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true);
    // Block align (channel count * bytes per sample)
    view.setUint16(32, buffer.numberOfChannels * 2, true);
    // Bits per sample
    view.setUint16(34, 16, true);
    // Data chunk identifier
    writeString(view, 36, 'data');
    // Data chunk length
    view.setUint32(40, length, true);
    
    // Write the PCM samples
    const data = new Float32Array(buffer.length * buffer.numberOfChannels);
    let offset = 0;
    
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      const channel = buffer.getChannelData(i);
      for (let j = 0; j < buffer.length; j++) {
        data[offset++] = channel[j];
      }
    }
    
    // Floats to 16-bit PCM
    floatTo16BitPCM(view, 44, data);
    
    resolve(new Blob([view], { type: 'audio/wav' }));
  });
}

/**
 * Helper function to write strings to DataView
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Helper function to convert Float32Array to 16-bit PCM
 */
function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array): void {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

/**
 * Removes silence from the beginning and end of audio
 * @param audioBuffer The input audio buffer
 * @param threshold Silence threshold (0-1)
 * @returns Trimmed audio buffer
 */
export async function trimSilence(audioBuffer: AudioBuffer, threshold = 0.01): Promise<AudioBuffer> {
  const channels = [];
  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }
  
  let start = 0;
  let end = audioBuffer.length - 1;
  let foundStart = false;
  
  // Find start (first non-silent sample)
  for (let i = 0; i < audioBuffer.length; i++) {
    let isSilent = true;
    for (const channel of channels) {
      if (Math.abs(channel[i]) > threshold) {
        isSilent = false;
        break;
      }
    }
    
    if (!isSilent) {
      start = Math.max(0, i - 1000); // Include a small buffer before speech
      foundStart = true;
      break;
    }
  }
  
  // If we didn't find any non-silence, return the original buffer
  if (!foundStart) {
    return audioBuffer;
  }
  
  // Find end (last non-silent sample)
  for (let i = audioBuffer.length - 1; i >= 0; i--) {
    let isSilent = true;
    for (const channel of channels) {
      if (Math.abs(channel[i]) > threshold) {
        isSilent = false;
        break;
      }
    }
    
    if (!isSilent) {
      end = Math.min(audioBuffer.length - 1, i + 1000); // Include a small buffer after speech
      break;
    }
  }
  
  // Create a new buffer with the trimmed audio
  const context = new AudioContext();
  const trimmedLength = end - start + 1;
  const trimmedBuffer = context.createBuffer(
    audioBuffer.numberOfChannels,
    trimmedLength,
    audioBuffer.sampleRate
  );
  
  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    const newChannel = trimmedBuffer.getChannelData(i);
    const oldChannel = channels[i];
    
    for (let j = 0; j < trimmedLength; j++) {
      newChannel[j] = oldChannel[start + j];
    }
  }
  
  return trimmedBuffer;
}