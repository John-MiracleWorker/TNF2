import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { JournalEntry as JournalEntryType } from '@/lib/types';
import { 
  Sheet,
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Tag, X, ChevronDown, ChevronUp } from 'lucide-react';

interface JournalEntryDetailProps {
  entry: JournalEntryType | null;
  onClose: () => void;
}

export function JournalEntryDetail({ entry, onClose }: JournalEntryDetailProps) {
  const [isOpen, setIsOpen] = useState(!!entry);
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  // Update isOpen when entry changes
  useEffect(() => {
    setIsOpen(!!entry);
    // Reset content expanded state when a new entry is opened
    setIsContentExpanded(false);
  }, [entry]);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300); // Wait for animation to complete
  };

  const toggleContentExpanded = () => {
    setIsContentExpanded(!isContentExpanded);
  };

  if (!entry) return null;

  const formattedDate = entry.created_at 
    ? format(new Date(entry.created_at), 'MMMM d, yyyy')
    : 'Today';

  // Format the content to properly display conversation formatting
  const formattedContent = entry.content?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  return (
    <Sheet open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) setTimeout(onClose, 300);
    }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-background">
        <SheetHeader className="mb-6">
          <div className="flex justify-between items-center">
            <SheetTitle className="text-2xl text-foreground">{entry.title}</SheetTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center text-muted-foreground text-sm mt-1">
            <Calendar className="h-4 w-4 mr-1" />
            {formattedDate}
          </div>
          <SheetDescription className="text-muted-foreground mt-3">
            {entry.summary}
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-4">
          <div className="prose dark:prose-invert text-foreground max-w-none">
            <div className={isContentExpanded ? "" : "relative max-h-[150px] overflow-hidden"}>
              {/* Use dangerouslySetInnerHTML to render formatted content */}
              <div 
                className="whitespace-pre-line" 
                dangerouslySetInnerHTML={{ __html: formattedContent }}
              />
              
              {/* Add gradient fade effect when content is not expanded */}
              {!isContentExpanded && (
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none"></div>
              )}
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4 text-foreground hover:bg-muted border-border w-full flex items-center justify-center"
              onClick={toggleContentExpanded}
            >
              {isContentExpanded ? (
                <>
                  Show Less <ChevronUp className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Show Full Journal Entry <ChevronDown className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          
          {entry.tags && entry.tags.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {entry.tags.map((tag, i) => (
                  <Badge key={i} variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {entry.related_scripture && (
            <div className="mt-6 bg-secondary/10 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Related Scripture</h4>
              <p className="text-foreground/80 italic">{entry.related_scripture}</p>
            </div>
          )}
        </div>
        
        <SheetFooter className="mt-6">
          <Button 
            variant="outline" 
            className="w-full border-primary text-foreground hover:bg-muted"
            onClick={handleClose}
          >
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}