import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const splitTextIntoChunks = (text: string, maxChunkSize: number = 1000): string[] => {
  const chunks: string[] = [];
  
  // If text is shorter than maxChunkSize, just return it as a single chunk
  if (text.length <= maxChunkSize) {
    return [text];
  }
  
  // Split on sentence boundaries to create more natural chunks
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    // If adding this sentence would exceed the maxChunkSize,
    // push the current chunk and start a new one
    if (currentChunk.length + sentence.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      
      // If a single sentence is longer than maxChunkSize, split it further
      if (sentence.length > maxChunkSize) {
        // Split on commas, semicolons, or other natural pauses
        const parts = sentence.match(/[^,;:]+[,;:]+/g) || [sentence];
        
        let tempChunk = '';
        for (const part of parts) {
          if (tempChunk.length + part.length > maxChunkSize) {
            if (tempChunk) {
              chunks.push(tempChunk);
              tempChunk = '';
            }
            
            // If a part is still too long, split it into maxChunkSize pieces
            if (part.length > maxChunkSize) {
              let i = 0;
              while (i < part.length) {
                chunks.push(part.slice(i, i + maxChunkSize));
                i += maxChunkSize;
              }
            } else {
              tempChunk = part;
            }
          } else {
            tempChunk += part;
          }
        }
        
        if (tempChunk) {
          chunks.push(tempChunk);
        }
      } else {
        currentChunk = sentence;
      }
    } else {
      currentChunk += sentence;
    }
  }
  
  // Add the last chunk if it's not empty
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
};