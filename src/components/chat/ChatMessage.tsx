import { motion } from 'framer-motion';
import { ChatMessage as ChatMessageType } from '@/lib/types';
import { MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { TrueNorthLogo } from '@/components/ui/TrueNorthLogo';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  return (
    <motion.div
      className={cn(
        "flex w-full gap-3 my-4",
        isUser ? "justify-end" : "justify-start"
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 border border-gold">
          <AvatarFallback className="bg-navy text-cream">
            <TrueNorthLogo size={16} />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div
        className={cn(
          "max-w-[80%] rounded-lg p-4",
          isUser 
            ? "bg-gold/90 text-navy" 
            : "bg-navy text-cream"
        )}
      >
        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium">
            {isUser ? 'You' : 'TrueNorth'}
          </div>
          <div className="mt-1 whitespace-pre-wrap">{message.content}</div>
        </div>
      </div>
      
      {isUser && (
        <Avatar className="h-8 w-8 border border-navy">
          <AvatarFallback className="bg-cream text-navy">
            <MessageCircle className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </motion.div>
  );
}