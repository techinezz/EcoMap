'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIChat({ selectedCoordinates }: { selectedCoordinates?: any[] }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your map assistant. I can help you analyze locations, understand geographic data, and provide insights about specific areas. What would you like to know about the map?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceAgentOpen, setIsVoiceAgentOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load ElevenLabs script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.async = true;
    script.type = 'text/javascript';
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleVoiceAgent = () => {
    setIsVoiceAgentOpen(true);
    // Trigger the ElevenLabs widget
    const widget = document.querySelector('elevenlabs-convai') as any;
    if (widget) {
      widget.style.display = 'block';
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAutoAnalysis = async (message: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: 'Coordinates have been sent!',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: message,
          coordinates: selectedCoordinates,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.text,
        timestamp: new Date(),
      };

      // Add suggested questions after initial analysis
      const suggestionMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `**You might also want to ask:**\n\n1. Can you go in-depth with one of the key issues?\n2. How much would these solutions cost?\n3. What can local residents do to help?\n4. Compare this area to nearby neighborhoods`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage, suggestionMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call your Gemini API route
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userMessage.content,
          coordinates: selectedCoordinates,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.text,
        timestamp: new Date(),
      };

      // Don't add suggestions for user questions, only for initial analysis
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // When coordinates are received, automatically send them to AI
  const prevCoordinatesRef = useRef<any[]>([]);

  useEffect(() => {
    // Only trigger if coordinates actually changed (not empty and different from previous)
    if (selectedCoordinates &&
        selectedCoordinates.length > 0 &&
        JSON.stringify(selectedCoordinates) !== JSON.stringify(prevCoordinatesRef.current)) {

      prevCoordinatesRef.current = selectedCoordinates;
      const autoMessage = 'Analyze the area I just selected on the map.';
      handleAutoAnalysis(autoMessage);
    }
  }, [selectedCoordinates]);

  return (
    <div className="flex flex-col h-full p-4 bg-white">
      {/* Header */}
      <div className="flex items-center justify-end mb-4 pb-3  ">
        <button
          onClick={() => setMessages([messages[0]])}
          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-[#ABD2A9] text-gray-900'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="text-sm prose prose-sm max-w-none
                prose-headings:font-bold prose-headings:text-gray-900 prose-headings:mb-2 prose-headings:mt-3 first:prose-headings:mt-0
                prose-p:text-gray-900 prose-p:my-2 prose-p:leading-relaxed
                prose-strong:text-gray-900 prose-strong:font-semibold
                prose-ul:my-2 prose-ul:space-y-1
                prose-li:text-gray-900 prose-li:my-1
                prose-h1:text-base prose-h2:text-base prose-h3:text-sm
                [&>*:first-child]:mt-0 [&>*:last-child]:mb-0
              ">
                <ReactMarkdown
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-base font-bold mt-3 mb-2 first:mt-0" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-base font-bold mt-3 mb-2 first:mt-0" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-sm font-bold mt-3 mb-2 first:mt-0" {...props} />,
                    p: ({node, ...props}) => <p className="my-2 leading-relaxed" {...props} />,
                    ul: ({node, ...props}) => <ul className="my-2 ml-4 space-y-1 list-disc" {...props} />,
                    ol: ({node, ...props}) => <ol className="my-2 ml-4 space-y-1 list-decimal" {...props} />,
                    li: ({node, ...props}) => <li className="my-1 leading-relaxed" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
              <span className="text-xs opacity-70 mt-2 block">
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ABD2A9] bg-white text-gray-900 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleVoiceAgent}
          className="p-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          title="Voice Chat"
        >
          <Mic size={20} />
        </button>
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-6 py-3 bg-[#ABD2A9] text-white rounded-lg hover:bg-[#9BC299] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Send
        </button>
      </form>

      {/* ElevenLabs Voice Agent */}
      <elevenlabs-convai agent-id="agent_6201k7tp1f7pf9k9pabat6w6036w"></elevenlabs-convai>
    </div>
  );
}