import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { getAriaVoice } from '../lib/gemini';

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface ChatProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isTyping: boolean;
  minimal?: boolean;
}

export const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, isTyping, minimal }) => {
  const [input, setInput] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const toggleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    };

    recognition.start();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    onSendMessage(input);
    setInput('');
  };

  if (minimal) {
    return (
      <form onSubmit={handleSubmit} className="w-full flex items-center bg-white h-14 rounded-full px-6 chat-bubble-shadow border border-black/05">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isTyping}
          placeholder="Tell Aria what's on your mind..."
          className="flex-1 bg-transparent border-none text-sm text-aria-text focus:outline-none placeholder:text-aria-secondary/30"
        />
        <div className="flex items-center space-x-2">
           <button
             type="button"
             onClick={toggleVoiceInput}
             className={cn(
               "p-2 rounded-full transition-all",
               isListening ? "text-red-500 bg-red-100 animate-pulse" : "text-aria-secondary/40 hover:text-aria-accent"
             )}
           >
             {isListening ? <Mic size={18} /> : <Mic size={18} />}
           </button>
           {isTyping && (
             <motion.div 
               animate={{ scale: [1, 1.2, 1] }} 
               transition={{ repeat: Infinity, duration: 1 }}
               className="w-2 h-2 bg-aria-accent rounded-full" 
             />
           )}
           <button
             type="submit"
             disabled={isTyping || !input.trim()}
             className="text-aria-accent hover:opacity-70 transition-opacity disabled:opacity-20"
           >
             <Send size={18} />
           </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl overflow-hidden border border-black/05 chat-bubble-shadow">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
        <h3 className="font-serif italic text-lg opacity-80 aria-glow">Conversation with Aria</h3>
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "max-w-[85%] p-4 rounded-2xl relative",
              msg.role === 'user' 
                ? "bg-white/10 ml-auto rounded-tr-none text-white/90" 
                : "bg-aria-accent/20 mr-auto rounded-tl-none text-white/90 border border-aria-accent/30"
            )}
          >
            <p className="text-sm leading-relaxed">{msg.content}</p>
            <span className="text-[10px] opacity-30 mt-2 block uppercase tracking-tighter">
              {msg.role === 'user' ? 'You' : 'Aria'}
            </span>
          </motion.div>
        ))}
        {isTyping && (
          <div className="bg-aria-accent/10 mr-auto p-4 rounded-2xl animate-pulse flex space-x-2 w-16">
            <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]" />
            <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-black/20 border-t border-white/10">
        <div className="relative flex items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
            placeholder="Tell Aria something..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-aria-accent/50 transition-all placeholder:text-white/20"
          />
          <button
            type="submit"
            disabled={isTyping || !input.trim()}
            className="absolute right-2 p-2 text-aria-accent hover:bg-aria-accent/20 rounded-xl transition-all disabled:opacity-30"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="mt-2 flex items-center space-x-4 px-2 opacity-40">
           <button 
             type="button" 
             onClick={toggleVoiceInput}
             className={cn(
               "flex items-center space-x-1 hover:opacity-100 transition-opacity",
               isListening && "text-red-500 opacity-100"
             )}
           >
              <Mic size={14} />
              <span className="text-[10px] font-mono">{isListening ? 'LISTENING' : 'VOICE'}</span>
           </button>
           <span className="text-[10px] font-mono">ARIA IS LISTENING • V3.1</span>
        </div>
      </form>
    </div>
  );
};
