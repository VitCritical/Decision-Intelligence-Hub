import React, { useState, useEffect, useRef } from 'react';
import { useGetChatHistory, getGetChatHistoryQueryKey, useSendChatMessage, useClearChatHistory } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Send, Trash2, Bot, User, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Chat() {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useGetChatHistory({
    query: { queryKey: getGetChatHistoryQueryKey() }
  });

  const sendMutation = useSendChatMessage({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetChatHistoryQueryKey() });
      }
    }
  });

  const clearMutation = useClearChatHistory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetChatHistoryQueryKey() });
      }
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sendMutation.isPending]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sendMutation.isPending) return;
    
    sendMutation.mutate({ data: { message: input } });
    setInput('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] bg-card border border-border rounded-xl overflow-hidden relative">
      {/* Chat Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-background/50 backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-2 text-white font-medium">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          Nexa AI Assistant
        </div>
        <button 
          onClick={() => clearMutation.mutate()}
          className="text-xs flex items-center gap-1.5 text-muted-foreground hover:text-destructive transition-colors px-3 py-1.5 rounded-md hover:bg-white/5"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear History
        </button>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-6">
          
          {!messages?.length && !isLoading && (
            <div className="text-center text-muted-foreground mt-20">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Hello! I'm Nexa, your business intelligence assistant.</p>
              <p className="text-sm mt-2">Ask me about your inventory, sales anomalies, or forecasts.</p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages?.map((msg) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-secondary border border-border text-white' : 'bg-primary border border-primary/50 text-white'}`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                
                <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-primary text-white rounded-tr-sm shadow-[0_4px_15px_rgba(99,102,241,0.2)]' 
                    : 'bg-background border border-border text-foreground rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {sendMutation.isPending && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
              <div className="w-8 h-8 shrink-0 rounded-full bg-primary border border-primary/50 text-white flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-background border border-border rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background/50 border-t border-border shrink-0">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your business health..."
            className="w-full bg-background border border-border text-white rounded-full pl-6 pr-14 py-3.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm transition-all"
            disabled={sendMutation.isPending}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || sendMutation.isPending}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary transition-colors"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
        <div className="text-center mt-2 text-[10px] text-muted-foreground">
          AI generated responses may contain inaccuracies.
        </div>
      </div>
    </div>
  );
}
