import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, Loader2, Volume2, Pause, Play, RotateCcw, X, Volume, VolumeX, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChatMessage } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useVoiceActivityDetector } from '@/hooks/use-voice-activity-detector';
import { normalizeAudio, trimSilence } from '@/lib/audio-processor';

// Add voice options for OpenAI TTS
const VOICE_OPTIONS = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral & Versatile' },
  { id: 'echo', name: 'Echo', description: 'Soft & Conversational' },
  { id: 'fable', name: 'Fable', description: 'Warm & Relatable' },
  { id: 'onyx', name: 'Onyx', description: 'Deep & Authoritative' },
  { id: 'nova', name: 'Nova', description: 'Bright & Professional' },
  { id: 'shimmer', name: 'Shimmer', description: 'Clear & Gentle' }
];

// Sound effects for better UX
const SOUNDS = {
  START: new Audio('/sounds/start-recording.mp3'),
  STOP: new Audio('/sounds/stop-recording.mp3'),
  SEND: new Audio('/sounds/message-sent.mp3'),
  ERROR: new Audio('/sounds/error.mp3'),
  PROCESSING: new Audio('/sounds/processing.mp3'),
};

// Set initial volumes
Object.values(SOUNDS).forEach(sound => {
  sound.volume = 0.5;
});

interface VoiceChatProps {
  onSendMessage: (message: string) => void;
  isProcessing: boolean;
  lastMessage: ChatMessage | null;
}

export function VoiceChat({ onSendMessage, isProcessing, lastMessage }: VoiceChatProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [errorState, setErrorState] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioLevel, setAudioLevel] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('alloy'); // Default to 'alloy' OpenAI voice
  const [autoStopEnabled, setAutoStopEnabled] = useState(true); // Auto stop on silence
  const { toast } = useToast();
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const processingChunksRef = useRef<boolean>(false);
  
  // Use the voice activity detector
  const vad = useVoiceActivityDetector({
    minDecibels: -45,
    timeThreshold: 1500, // 1.5 seconds of silence before considering speech ended
    onSpeechStart: () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      setFeedbackMessage("I'm listening...");
    },
    onSpeechEnd: () => {
      if (autoStopEnabled && isRecording) {
        setFeedbackMessage("Speech ended, processing...");
        silenceTimeoutRef.current = window.setTimeout(() => {
          // Auto stop after silence detected
          if (isRecording) {
            stopRecording();
          }
        }, 1000); // Wait 1 second after speech ends before stopping
      }
    },
    onNoiseLevel: (level) => {
      // Update visualization with noise level
      if (isRecording) {
        updateVisualization(level);
      }
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Update volume when changed
  useEffect(() => {
    Object.values(SOUNDS).forEach(sound => {
      sound.volume = volume / 100 * (isMuted ? 0 : 1);
    });
    
    if (audioElementRef.current) {
      audioElementRef.current.volume = volume / 100 * (isMuted ? 0 : 1);
    }
  }, [volume, isMuted]);

  // Clean up all resources
  const cleanup = () => {
    // Stop recording if active
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    
    // Stop microphone stream
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      microphoneStreamRef.current = null;
    }
    
    // Clear timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    
    // Reset state
    setIsRecording(false);
    setRecordingTime(0);
    
    // Stop VAD
    vad.stop();
    
    // Clean up audio playback
    stopAudioPlayback();
  };
  
  // Stop any active audio playback
  const stopAudioPlayback = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setIsPaused(false);
  };

  // Update visualization based on audio level
  const updateVisualization = (level: number) => {
    // Create a smoother visualization by adding some randomness
    const newLevels = audioLevel.map((currentLevel, index) => {
      // More weight to the current levels for smoothness
      const targetLevel = Math.min(100, level + (Math.random() * 20) - 10);
      return currentLevel * 0.7 + targetLevel * 0.3; // Smooth transition
    });
    
    setAudioLevel(newLevels);
  };

  // Start recording
  const startRecording = async () => {
    try {
      setErrorState(null);
      setTranscript('');
      setPartialTranscript('');
      setFeedbackMessage("Listening...");
      
      // Play start sound
      if (!isMuted) {
        SOUNDS.START.play();
      }

      // Get microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      microphoneStreamRef.current = stream;
      
      // Set up audio context and analyser for visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      // Setup MediaRecorder with optimized settings
      const recorder = new MediaRecorder(stream, { 
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000 // Lower bitrate for faster processing
      });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      // Start the Voice Activity Detector
      vad.start();

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // If we have enough data, start processing while still recording
          // But only if we're not already processing chunks
          if (audioChunksRef.current.length >= 3 && !processingChunksRef.current && isRecording) {
            processingChunksRef.current = true;
            processPartialTranscription().catch(console.error);
          }
        }
      });

      recorder.addEventListener('stop', () => {
        // Process the complete audio for final transcription
        processCompleteAudio();
      });

      // Start recording with smaller chunks for more frequent updates
      recorder.start(1000); // Collect data every second
      setIsRecording(true);
      
      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error starting voice recording:', err);
      setErrorState('Could not access microphone. Please check permissions and try again.');
      if (!isMuted) {
        SOUNDS.ERROR.play();
      }
    }
  };

  // Process partial audio chunks for faster feedback
  const processPartialTranscription = async () => {
    if (audioChunksRef.current.length === 0) {
      processingChunksRef.current = false;
      return;
    }
    
    try {
      // Create a copy of the current chunks for processing
      const chunksToProcess = [...audioChunksRef.current];
      
      // Only process if we have enough audio
      if (chunksToProcess.length < 2) {
        processingChunksRef.current = false;
        return;
      }
      
      // Create a blob from the chunks
      const audioBlob = new Blob(chunksToProcess, { type: 'audio/webm' });
      
      // Skip very short audio
      if (audioBlob.size < 1000) {
        processingChunksRef.current = false;
        return;
      }
      
      // Convert to file for upload
      const audioFile = new File([audioBlob], 'partial_recording.webm', { type: 'audio/webm' });
      
      // Get user session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        processingChunksRef.current = false;
        return;
      }
      
      // Create form data for API request
      const formData = new FormData();
      formData.append('audio', audioFile);
      
      // Get Supabase URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      // Call the Whisper API for partial transcription
      const response = await fetch(`${supabaseUrl}/functions/v1/whisper-transcription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.text && data.text.trim()) {
          setPartialTranscript(data.text);
        }
      }
    } catch (error) {
      console.warn('Error during partial transcription:', error);
      // Continue recording even if partial transcription fails
    } finally {
      processingChunksRef.current = false;
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Stop VAD
      vad.stop();
      
      // Play stop sound
      if (!isMuted) {
        SOUNDS.STOP.play();
      }
      
      // Stop recording
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setFeedbackMessage("Processing audio...");
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Clear silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      
      // Reset visualization
      setAudioLevel([0, 0, 0, 0, 0, 0, 0, 0]);
      
      // Stop microphone stream
      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach(track => track.stop());
        microphoneStreamRef.current = null;
      }
    }
  };

  // Process complete audio for final transcription
  const processCompleteAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      setErrorState('No audio recorded');
      return;
    }

    setIsTranscribing(true);
    setPartialTranscript('');
    setFeedbackMessage("Transcribing your message...");
    
    try {
      if (!isMuted) {
        SOUNDS.PROCESSING.play();
      }
      
      // Create audio file from chunks with optimizations
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Skip very short recordings
      if (audioBlob.size < 1000) {
        setErrorState('Recording too short. Please try again.');
        setIsTranscribing(false);
        return;
      }

      // Get current user session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Not authenticated');
      }
      
      // Create form data for API request with optimized audio
      const formData = new FormData();
      formData.append('audio', new File([audioBlob], 'recording.webm', { type: 'audio/webm' }));

      // Get Supabase URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      // Call the Whisper API with priority flag for faster processing
      const response = await fetch(`${supabaseUrl}/functions/v1/whisper-transcription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-Priority': 'high'
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.text) {
        setTranscript(data.text);
        
        // Automatically send the transcribed message
        if (!isMuted) {
          SOUNDS.SEND.play();
        }
        onSendMessage(data.text);
      } else {
        throw new Error('No transcription returned');
      }
    } catch (error) {
      console.error('Error processing audio for transcription:', error);
      setErrorState('Failed to transcribe audio. Please try again or type your message.');
      if (!isMuted) {
        SOUNDS.ERROR.play();
      }
    } finally {
      setIsTranscribing(false);
      setFeedbackMessage(null);
    }
  };

  // Reset recording state
  const handleReset = () => {
    setTranscript('');
    setPartialTranscript('');
    setErrorState(null);
    setRecordingTime(0);
    setFeedbackMessage(null);
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Play assistant's response using OpenAI TTS
  const handlePlayResponse = async () => {
    if (!lastMessage || !lastMessage.content) return;
    
    try {
      if (isPlaying) {
        if (isPaused) {
          // Resume playback
          if (audioElementRef.current) {
            audioElementRef.current.play();
          }
          setIsPaused(false);
        } else {
          // Pause playback
          if (audioElementRef.current) {
            audioElementRef.current.pause();
          }
          setIsPaused(true);
        }
      } else {
        // Stop any existing playback
        stopAudioPlayback();
        
        // Start new playback with OpenAI TTS
        await playWithOpenAI(lastMessage.content);
      }
    } catch (error) {
      console.error('Error playing response:', error);
      toast({
        title: 'Playback Error',
        description: 'There was an error playing the response. Using browser voices instead.',
        variant: 'destructive',
      });
      
      // Fall back to browser TTS
      playWithBrowserTTS(lastMessage.content);
    }
  };

  // Play with OpenAI TTS
  const playWithOpenAI = async (text: string) => {
    setIsPlaying(true);
    setIsPaused(false);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      // Use the OpenAI TTS endpoint
      const response = await fetch(`${supabaseUrl}/functions/v1/openai-tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          text,
          voice: selectedVoice,
        }),
      });
      
      // Handle subscription requirements
      if (response.status === 402) {
        toast({
          title: 'Premium Feature',
          description: 'Premium voices require a TrueNorth Pro subscription.',
          variant: 'default',
        });
        
        // Fall back to browser voices
        playWithBrowserTTS(text);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }
      
      // Create audio URL from response
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Set up audio element
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio();
      }
      
      // Clean up previous audio URL
      if (audioElementRef.current.src) {
        URL.revokeObjectURL(audioElementRef.current.src);
      }
      
      // Set up event handlers
      audioElementRef.current.src = audioUrl;
      audioElementRef.current.volume = volume / 100 * (isMuted ? 0 : 1);
      
      audioElementRef.current.onended = () => {
        setIsPlaying(false);
        setIsPaused(false);
      };
      
      audioElementRef.current.onpause = () => {
        setIsPaused(true);
      };
      
      audioElementRef.current.onplay = () => {
        setIsPlaying(true);
        setIsPaused(false);
      };
      
      // Play the audio
      await audioElementRef.current.play();
      
    } catch (error) {
      console.error('Error using OpenAI TTS:', error);
      // Fall back to browser voices
      playWithBrowserTTS(text);
    }
  };
  
  // Fallback to browser TTS
  const playWithBrowserTTS = (text: string) => {
    if (!('speechSynthesis' in window)) {
      toast({
        title: 'Not Supported',
        description: 'Speech synthesis is not supported in your browser.',
        variant: 'destructive',
      });
      return;
    }
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = volume / 100 * (isMuted ? 0 : 1);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // Find a good voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(voice => voice.lang?.includes('en') && voice.localService);
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    
    // Event handlers
    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };
    
    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsPlaying(false);
      setIsPaused(false);
    };
    
    // Speak
    window.speechSynthesis.speak(utterance);
  };
  
  // Toggle mute/unmute
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div className="space-y-3">
      <Card className="bg-card shadow-md border border-border">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center">
          <div className="space-y-6 w-full max-w-sm mx-auto">
            {errorState && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full p-3 mb-2 text-center bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-md"
              >
                <div className="flex items-center">
                  <X className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>{errorState}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 bg-red-50 text-red-800 border-red-200 hover:bg-red-100"
                  onClick={handleReset}
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Try Again
                </Button>
              </motion.div>
            )}
            
            {!errorState && (transcript || partialTranscript) && !isProcessing && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full mb-3"
              >
                <p className="font-medium text-sm mb-1 flex items-center">
                  <Waves className="h-4 w-4 mr-1 text-primary" />
                  {isTranscribing ? "Transcribing..." : "Heard:"}
                </p>
                <div className="p-3 bg-muted/50 rounded-lg text-foreground">
                  {partialTranscript && isRecording ? (
                    <span className="opacity-70">{partialTranscript}</span>
                  ) : transcript ? (
                    transcript
                  ) : (
                    <span className="animate-pulse">Processing your speech...</span>
                  )}
                </div>
              </motion.div>
            )}
            
            {feedbackMessage && !errorState && !transcript && !isProcessing && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full mb-2"
              >
                <div className="p-2 bg-primary/10 rounded-lg text-primary-foreground text-sm">
                  {feedbackMessage}
                </div>
              </motion.div>
            )}
            
            <div className="flex flex-col items-center justify-center w-full">
              {/* Audio level visualization */}
              {isRecording && (
                <motion.div 
                  className="flex justify-center items-end h-16 mb-4 space-x-1 w-48"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {audioLevel.map((level, i) => (
                    <motion.div
                      key={i}
                      className="w-2 bg-primary rounded-t"
                      initial={{ height: 4 }}
                      animate={{ height: Math.max(4, level) }}
                      transition={{ type: "spring", stiffness: 300, damping: 10 }}
                    />
                  ))}
                </motion.div>
              )}
              
              {isRecording ? (
                <motion.div 
                  className="flex flex-col items-center"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Button
                    onClick={stopRecording}
                    size="lg"
                    disabled={isTranscribing}
                    variant="destructive"
                    className="rounded-full w-20 h-20 flex items-center justify-center"
                  >
                    <svg viewBox="0 0 24 24" className="h-10 w-10 fill-current">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  </Button>
                  <Badge className="mt-2 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                    {formatTime(recordingTime)}
                  </Badge>
                </motion.div>
              ) : isTranscribing ? (
                <div className="flex flex-col items-center">
                  <Button
                    disabled
                    size="lg"
                    className="rounded-full w-20 h-20 flex items-center justify-center"
                  >
                    <Loader2 className="h-10 w-10 animate-spin" />
                  </Button>
                  <p className="text-sm mt-2 text-muted-foreground">Transcribing...</p>
                </div>
              ) : isProcessing ? (
                <div className="flex flex-col items-center">
                  <Button
                    disabled
                    size="lg"
                    className="rounded-full w-20 h-20 flex items-center justify-center"
                  >
                    <Loader2 className="h-10 w-10 animate-spin" />
                  </Button>
                  <p className="text-sm mt-2 text-muted-foreground">Processing...</p>
                </div>
              ) : (
                <Button
                  onClick={startRecording}
                  size="lg"
                  className="rounded-full w-20 h-20 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Mic className="h-10 w-10" />
                </Button>
              )}
              
              <p className="text-sm text-muted-foreground mt-3">
                {isRecording ? "Tap to stop recording" : "Tap to start speaking"}
              </p>
            </div>
            
            {/* Voice controls */}
            <div className="flex flex-col mt-4 pt-4 border-t border-border space-y-4">
              {/* Settings */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center space-x-2">
                  <span>Auto-stop on silence</span>
                </label>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={autoStopEnabled ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setAutoStopEnabled(true)}
                  >
                    On
                  </Button>
                  <Button
                    variant={!autoStopEnabled ? "default" : "outline"}
                    size="sm" 
                    className="h-8 text-xs"
                    onClick={() => setAutoStopEnabled(false)}
                  >
                    Off
                  </Button>
                </div>
              </div>
              
              {/* Voice selection */}
              <div className="flex items-center justify-between">
                <label htmlFor="voice-select" className="text-sm font-medium">
                  Assistant Voice
                </label>
                <select 
                  id="voice-select" 
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="text-sm rounded-md border border-border bg-background px-3 py-1.5"
                >
                  {VOICE_OPTIONS.map(voice => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} - {voice.description}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Volume control */}
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleMute}
                        className="h-9 w-9"
                      >
                        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isMuted ? 'Unmute sounds' : 'Mute sounds'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <div className="flex-1 mx-3">
                  <Slider
                    value={[volume]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(value) => setVolume(value[0])}
                    disabled={isMuted}
                    aria-label="Volume"
                  />
                </div>
                
                {lastMessage && lastMessage.role === 'assistant' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center justify-center gap-2"
                    onClick={handlePlayResponse}
                  >
                    {isPlaying ? (
                      isPaused ? (
                        <>
                          <Play className="h-4 w-4" />
                          <span className="sr-only md:not-sr-only md:inline-block">Resume</span>
                        </>
                      ) : (
                        <>
                          <Pause className="h-4 w-4" />
                          <span className="sr-only md:not-sr-only md:inline-block">Pause</span>
                        </>
                      )
                    ) : (
                      <>
                        <Volume2 className="h-4 w-4" />
                        <span className="sr-only md:not-sr-only md:inline-block">Listen</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}