import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { JournalEntry as JournalEntryType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Book, Calendar, Tag } from 'lucide-react';

interface JournalEntryProps {
  entry: JournalEntryType;
  onView: (entry: JournalEntryType) => void;
}

export function JournalEntry({ entry, onView }: JournalEntryProps) {
  const formattedDate = entry.created_at 
    ? format(new Date(entry.created_at), 'MMM d, yyyy')
    : 'Today';
  
  const handleClick = () => {
    console.log("Entry clicked:", entry.title);
    onView(entry);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-secondary/20 hover:border-secondary/40 transition-colors cursor-pointer" onClick={handleClick}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-foreground text-xl">{entry.title}</CardTitle>
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-3 w-3 mr-1" />
              {formattedDate}
            </div>
          </div>
          <CardDescription className="text-muted-foreground">
            {entry.summary}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <p className="text-foreground/80 line-clamp-3">{entry.content}</p>
        </CardContent>
        {entry.tags && entry.tags.length > 0 && (
          <CardFooter className="pt-0 flex flex-wrap gap-1">
            {entry.tags.map((tag, i) => (
              <Badge key={i} variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
}