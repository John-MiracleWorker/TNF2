import { useState, useEffect, useRef } from 'react';

interface VoiceActivityDetectorOptions {
  minDecibels?: number;
  timeThreshold?: number;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onNoiseLevel?: (level: number) => void;
}

export function useVoiceActivityDetector(options: VoiceActivityDetectorOptions = {}) {
  const {
    minDecibels = -45,
    timeThreshold = 300,
    onSpeechStart,
    onSpeechEnd,
    onNoiseLevel,
  } = options;
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [noiseLevel, setNoiseLevel] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isSpeakingRef = useRef(false);
  const lastSpeakTimeRef = useRef(0);
  const checkIntervalRef = useRef<number | null>(null);
  
  // Start voice activity detection
  const start = async (): Promise<boolean> => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      mediaStreamRef.current = stream;
      
      // Set up audio context and analyser
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 1024;
      analyserRef.current.minDecibels = minDecibels;
      analyserRef.current.maxDecibels = -10;
      analyserRef.current.smoothingTimeConstant = 0.5;
      
      // Connect microphone to analyser
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      // Start checking for voice activity
      checkIntervalRef.current = window.setInterval(checkAudioLevel, 100);
      
      return true;
    } catch (error) {
      console.error('Error starting voice activity detection:', error);
      return false;
    }
  };
  
  // Stop voice activity detection
  const stop = () => {
    // Clear interval
    if (checkIntervalRef.current !== null) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    
    // Stop microphone stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    // Reset state
    setIsSpeaking(false);
    setNoiseLevel(0);
    isSpeakingRef.current = false;
    lastSpeakTimeRef.current = 0;
  };
  
  // Check audio level to detect voice activity
  const checkAudioLevel = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculate average volume level
    let sum = 0;
    const length = dataArray.length;
    
    for (let i = 0; i < length; i++) {
      sum += dataArray[i];
    }
    
    const average = sum / length;
    const normalizedLevel = Math.min(100, Math.max(0, average * 1.5));
    
    // Update noise level
    setNoiseLevel(normalizedLevel);
    if (onNoiseLevel) onNoiseLevel(normalizedLevel);
    
    const now = Date.now();
    // Detect speech start (with threshold to avoid background noise)
    if (average > 30) {
      lastSpeakTimeRef.current = now;
      
      if (!isSpeakingRef.current) {
        isSpeakingRef.current = true;
        setIsSpeaking(true);
        onSpeechStart?.();
      }
    } 
    // Detect speech end (after brief silence to avoid choppy detection)
    else if (isSpeakingRef.current && now - lastSpeakTimeRef.current > timeThreshold) {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      onSpeechEnd?.();
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, []);
  
  return {
    start,
    stop,
    isSpeaking,
    noiseLevel,
  };
}