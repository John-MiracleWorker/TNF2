import { useState, useRef } from 'react';
import { Upload, FileType, File, Loader2, Calendar, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { saveSermonSummary, processSermon, getSermonProcessingStatus } from '@/lib/sermons';
import { SermonSummary } from '@/lib/types';

interface SermonUploadFormProps {
  onUploadComplete?: (sermon: SermonSummary) => void;
}

export function SermonUploadForm({ onUploadComplete }: SermonUploadFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sermonDate, setSermonDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentSermonId, setCurrentSermonId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    if (files && files.length > 0) {
      const file = files[0];
      
      // Check file type - only accept audio/video
      if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
        toast({
          title: 'Invalid File Type',
          description: 'Please select an audio or video file',
          variant: 'destructive',
        });
        return;
      }
      
      // Check file size (limit to 100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'File size must be less than 100MB',
          variant: 'destructive',
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };
  
  const handleUpload = async () => {
    if (!title.trim()) {
      toast({
        title: 'Title Required',
        description: 'Please enter a title for the sermon',
        variant: 'destructive',
      });
      return;
    }
    
    if (!selectedFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select an audio or video file to upload',
        variant: 'destructive',
      });
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    
    try {
      // Step 1: Create an entry in the sermon_summaries table
      // This sermon object will be updated later with file URLs and analysis results
      const sermon: SermonSummary = {
        title,
        description,
        sermon_date: sermonDate || undefined,
        ai_context: {
          status: 'processing_started',
          step: 'uploading_file',
        }
      };
      
      const savedSermon = await saveSermonSummary(sermon);
      
      if (!savedSermon || !savedSermon.id) {
        throw new Error('Failed to create sermon record');
      }
      
      setCurrentSermonId(savedSermon.id);
      
      // Step 2: Upload the file to Supabase storage
      const fileName = `${savedSermon.id}-${selectedFile.name.replace(/\s+/g, '_')}`;
      const filePath = `${savedSermon.id}/${fileName}`;
      
      // Upload with progress tracking
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('sermons')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setUploadProgress(percent);
          }
        });
      
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('sermons')
        .getPublicUrl(filePath);
      
      const fileUrl = urlData.publicUrl;
      
      // Update the sermon record with the file URL and storage path
      const fileType = selectedFile.type.startsWith('audio/') ? 'audio' : 'video';
      
      const updateData: Partial<SermonSummary> = {
        storage_file_path: filePath, // Save the internal storage path
        ai_context: {
          status: 'processing_started',
          step: 'file_uploaded',
        }
      };
      
      if (fileType === 'audio') {
        updateData.audio_url = fileUrl;
      } else {
        updateData.video_url = fileUrl;
      }
      
      // Update the sermon record
      await supabase
        .from('sermon_summaries')
        .update(updateData)
        .eq('id', savedSermon.id);
      
      // Step 3: Call the process-sermon edge function
      setProcessingStatus('Starting analysis...');
      
      const processResult = await processSermon(savedSermon.id, filePath);
      
      if (!processResult.success) {
        throw new Error(processResult.error || 'Processing failed');
      }
      
      // Start polling for status updates
      pollProcessingStatus(savedSermon.id);
      
      toast({
        title: 'Upload Complete',
        description: 'Sermon uploaded successfully and is being processed',
      });
      
      if (onUploadComplete) {
        // Re-fetch the sermon to get the latest updated data, including potential AI analysis if polling is quick
        const updatedSermon = await supabase.from('sermon_summaries').select('*').eq('id', savedSermon.id).single();
        if (updatedSermon.data) {
            onUploadComplete(updatedSermon.data as SermonSummary);
        } else {
            onUploadComplete(savedSermon);
        }
      }
      
      // Reset form
      setTitle('');
      setDescription('');
      setSermonDate('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      console.error('Error uploading sermon:', error);
      setError(error.message || 'Failed to upload sermon');
      
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload sermon',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const pollProcessingStatus = async (sermonId: string) => {
    try {
      const { data: statusData, error: statusError } = await getSermonProcessingStatus(sermonId);
      
      if (statusError) {
        throw statusError;
      }

      const status = statusData; // ai_context is returned directly now
      
      if (status?.status === 'completed') {
        setProcessingStatus('Processing complete!');
        
        // Stop polling
        setTimeout(() => {
          setProcessingStatus(null);
          setCurrentSermonId(null);
          loadSermons(); // Reload sermons to reflect updated status in the list
        }, 3000);
        
        return;
      } else if (status?.status === 'error') {
        setProcessingStatus(`Error: ${status.error || 'Unknown error'}`);
        setError(status.error || 'Processing failed');
        
        // Stop polling on error
        setTimeout(() => {
          setProcessingStatus(null);
          setCurrentSermonId(null);
          loadSermons(); // Reload sermons to reflect updated status in the list
        }, 5000);
        
        return;
      } else if (status?.step) {
        // Update processing status based on the current step
        let statusMessage = 'Processing...';
        
        switch (status.step) {
          case 'started':
            statusMessage = 'Starting processing...';
            break;
          case 'file_downloaded':
            statusMessage = 'Preparing audio for transcription...';
            break;
          case 'transcription_completed':
            statusMessage = 'Transcription complete. Generating AI analysis...';
            break;
          default:
            statusMessage = `Processing: ${status.step}`;
        }
        
        setProcessingStatus(statusMessage);
      } else {
        setProcessingStatus('Processing sermon...');
      }
      
      // Continue polling
      setTimeout(() => pollProcessingStatus(sermonId), 5000);
    } catch (error) {
      console.error('Error polling status:', error);
      setProcessingStatus('Error checking status');
      setError('Failed to check processing status');
    }
  };

  // This function is for SermonList to trigger re-analysis
  const handleReanalyze = async (sermon: SermonSummary) => {
    if (!sermon.id || !sermon.storage_file_path) {
      toast({
        title: 'Cannot Re-analyze',
        description: 'Sermon ID or file path is missing.',
        variant: 'destructive',
      });
      return;
    }

    // Set processing status for the specific sermon being re-analyzed
    setSermons(prevSermons => 
        prevSermons.map(s => 
            s.id === sermon.id 
                ? { ...s, ai_context: { status: 'processing_started', step: 'reanalyzing' } } 
                : s
        )
    );

    try {
      toast({
        title: 'Re-analysis Started',
        description: `Re-processing sermon: ${sermon.title}`,
      });
      await processSermon(sermon.id, sermon.storage_file_path);
      // Start polling for this specific sermon
      pollProcessingStatus(sermon.id);
    } catch (error) {
      console.error('Error re-analyzing sermon:', error);
      toast({
        title: 'Re-analysis Failed',
        description: error.message || 'Failed to re-analyze sermon',
        variant: 'destructive',
      });
       // Revert status on error
      setSermons(prevSermons => 
        prevSermons.map(s => 
            s.id === sermon.id 
                ? { ...s, ai_context: { status: 'error', error: error.message || 'Re-analysis failed' } } 
                : s
        )
      );
    }
  };

  // Expose handleReanalyze to SermonList component
  // This would typically be passed down via props or context
  // For now, it's just here to demonstrate the function.
  // A more robust solution would involve a shared state or context.

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Sermon Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter sermon title"
            disabled={isUploading}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the sermon"
            disabled={isUploading}
            rows={3}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="sermon-date">Sermon Date</Label>
          <Input
            id="sermon-date"
            type="date"
            value={sermonDate}
            onChange={(e) => setSermonDate(e.target.value)}
            disabled={isUploading}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="sermon-file">Audio/Video File</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="sermon-file"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="audio/*,video/*"
              disabled={isUploading}
              className="flex-grow"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Supported formats: MP3, MP4, WAV, M4A (Max 100MB)
          </p>
        </div>
        
        {selectedFile && (
          <div className="bg-muted/30 p-3 rounded-md flex items-center justify-between">
            <div className="flex items-center">
              <FileType className="h-5 w-5 text-muted-foreground mr-2" />
              <div>
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
      
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}
      
      {processingStatus && (
        <Alert className={
          processingStatus.includes('Error') 
            ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900'
            : processingStatus.includes('complete') 
              ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900'
              : 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900'
        }>
          <div className="flex items-center">
            {processingStatus.includes('Error') 
              ? <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
              : processingStatus.includes('complete')
                ? <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                : <Loader2 className="h-4 w-4 text-blue-500 animate-spin mr-2" />
            }
            <AlertDescription>
              {processingStatus}
            </AlertDescription>
          </div>
        </Alert>
      )}
      
      <div className="flex justify-end">
        <Button
          onClick={handleUpload}
          disabled={isUploading || !selectedFile || !title.trim()}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload and Process Sermon
            </>
          )}
        </Button>
      </div>
    </div>
  );
}