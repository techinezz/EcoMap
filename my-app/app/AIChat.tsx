'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Phone, PhoneOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useConversation } from '@elevenlabs/react';
import CircularAudioVisualizer from './CircularAudioVisualizer';

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
  const [inputAudioData, setInputAudioData] = useState<Uint8Array>(new Uint8Array(128));
  const [outputAudioData, setOutputAudioData] = useState<Uint8Array>(new Uint8Array(128));
  const animationFrameRef = useRef<number>();
  const [geminiAnalysis, setGeminiAnalysis] = useState<string>('');

  // Prepare coordinate context whenever coordinates change
  const getCoordinateContext = () => {
    if (selectedCoordinates && selectedCoordinates.length > 0) {
      // Calculate approximate center of the selected area
      const coords = selectedCoordinates[0]; // First polygon
      if (Array.isArray(coords) && Array.isArray(coords[0])) {
        let sumLat = 0, sumLon = 0, count = 0;

        coords[0].forEach((point: number[]) => {
          sumLon += point[0];
          sumLat += point[1];
          count++;
        });

        const centerLon = (sumLon / count).toFixed(6);
        const centerLat = (sumLat / count).toFixed(6);

        // Format the polygon points clearly
        const polygonPoints = coords[0].map((point: number[]) =>
          `(Longitude: ${point[0].toFixed(6)}, Latitude: ${point[1].toFixed(6)})`
        ).join(', ');

        return `The user has selected a specific area on the map for environmental analysis.

LOCATION DETAILS:
- Center Point: Longitude ${centerLon}, Latitude ${centerLat}
- This location is approximately at coordinates ${centerLat}°N, ${Math.abs(parseFloat(centerLon))}°W

SELECTED AREA BOUNDARY:
The user drew a polygon with the following corner points:
${polygonPoints}

Please provide a detailed environmental and sustainability analysis for this specific geographic location. Include information about:
- Environmental challenges in this area
- Air quality concerns
- Water quality issues
- Green space availability
- Climate risks
- Sustainability recommendations`;
      }
    }
    return 'No area has been selected on the map yet. The user needs to draw an area on the map before you can provide location-specific analysis.';
  };

  // Store if we've sent the initial context
  const contextSentRef = useRef(false);

  // Initialize ElevenLabs conversation
  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs');

      // Reset the context sent flag when connecting
      contextSentRef.current = false;

      // Wait a moment for the connection to stabilize, then send context
      setTimeout(() => {
        if (!contextSentRef.current && conversation.status === 'connected') {
          // Use Gemini analysis if available, otherwise use basic coordinates
          let contextToSend = '';

          if (geminiAnalysis) {
            contextToSend = `Here is detailed information about the location the user has selected on the map:\n\n${geminiAnalysis}\n\nPlease use this information to answer the user's questions about this specific location.`;
            console.log('Sending Gemini analysis as context');
          } else {
            contextToSend = getCoordinateContext();
            console.log('Sending coordinate context via text:', contextToSend.substring(0, 100) + '...');
          }

          try {
            // Send context as initial message
            conversation.sendTextMessage?.(contextToSend);
            contextSentRef.current = true;
          } catch (error) {
            console.error('Error sending context:', error);
          }
        }
      }, 1000);
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs');
      setIsVoiceAgentOpen(false);
    },
    onError: (error) => {
      console.error('ElevenLabs error:', error);
    },
    onMessage: (message) => {
      console.log('Message:', message);
    },
    onModeChange: (mode) => {
      console.log('Mode changed:', mode);
    },
  });

  // Update audio visualizer data
  useEffect(() => {
    if (!isVoiceAgentOpen || conversation.status !== 'connected') {
      // Reset audio data when not connected
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      return;
    }

    let isActive = true;

    const updateAudioData = () => {
      if (!isActive || conversation.status !== 'connected') {
        return;
      }

      try {
        const inputData = conversation.getInputByteFrequencyData?.();
        const outputData = conversation.getOutputByteFrequencyData?.();

        if (inputData && inputData.length > 0) {
          setInputAudioData(inputData);
        }
        if (outputData && outputData.length > 0) {
          setOutputAudioData(outputData);
        }
      } catch (error) {
        // Silently ignore errors during audio data retrieval
      }

      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(updateAudioData);
      }
    };

    // Small delay to let audio streams initialize
    const timeoutId = setTimeout(() => {
      if (isActive) {
        updateAudioData();
      }
    }, 100);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    };
  }, [isVoiceAgentOpen, conversation.status]);

  const handleVoiceAgent = async () => {
    if (conversation.status === 'connected' || conversation.status === 'connecting') {
      console.log('Already connected or connecting, skipping...');
      return;
    }

    setIsVoiceAgentOpen(true);

    try {
      const coordinateContext = getCoordinateContext();

      console.log('Getting signed URL from server...');

      // Get signed URL from our API route
      const tokenResponse = await fetch('/api/elevenlabs-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: 'agent_6201k7tp1f7pf9k9pabat6w6036w',
          context: coordinateContext,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        console.error('Token response error:', error);
        throw new Error(error.error || 'Failed to get conversation token');
      }

      const { signedUrl } = await tokenResponse.json();

      console.log('Starting session with signed URL...');

      // Start conversation with signed URL
      await conversation.startSession({
        signedUrl,
      });

      console.log('Session started successfully');
    } catch (error) {
      console.error('Failed to start session:', error);
      setIsVoiceAgentOpen(false);
    }
  };

  const handleEndVoiceAgent = async () => {
    await conversation.endSession();
    setIsVoiceAgentOpen(false);
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

      // Store Gemini analysis for voice agent context
      setGeminiAnalysis(data.text);

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

      // If voice agent is connected, send contextual update
      if (conversation.status === 'connected') {
        const coordinateContext = getCoordinateContext();
        try {
          conversation.setCustomLlmExtraBody?.({
            context: coordinateContext,
          });
        } catch (error) {
          console.error('Error updating context:', error);
        }
      }
    }
  }, [selectedCoordinates, conversation.status]);

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

      {/* ElevenLabs Voice Agent Modal */}
      {isVoiceAgentOpen && (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center" onClick={handleEndVoiceAgent}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Voice Assistant</h3>
              <p className="text-xs text-gray-600 mt-2">{getCoordinateContext()}</p>
            </div>

            {/* Status indicator */}
            <div className="mb-4 text-center">
              <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                conversation.status === 'connected' ? 'bg-green-100 text-green-800' :
                conversation.status === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {conversation.status === 'connected' ? 'Connected' :
                 conversation.status === 'connecting' ? 'Connecting...' :
                 'Disconnected'}
              </span>
            </div>

            {/* Audio Visualizers */}
            <div className="flex justify-center items-center gap-8 mb-6">
              <div className="text-center">
                <CircularAudioVisualizer
                  audioData={inputAudioData}
                  size={120}
                  barCount={64}
                  barColor="#ABD2A9"
                />
                <p className="text-xs text-gray-600 mt-2">Your Voice</p>
              </div>
              <div className="text-center">
                <CircularAudioVisualizer
                  audioData={outputAudioData}
                  size={120}
                  barCount={64}
                  barColor="#9BC299"
                />
                <p className="text-xs text-gray-600 mt-2">AI Voice</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              {conversation.status === 'connected' ? (
                <button
                  onClick={handleEndVoiceAgent}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  <PhoneOff size={20} />
                  End Call
                </button>
              ) : (
                <button
                  onClick={handleVoiceAgent}
                  className="flex-1 px-4 py-3 bg-[#ABD2A9] text-white rounded-lg hover:bg-[#9BC299] transition-colors flex items-center justify-center gap-2"
                  disabled={conversation.status === 'connecting'}
                >
                  <Phone size={20} />
                  {conversation.status === 'connecting' ? 'Connecting...' : 'Start Call'}
                </button>
              )}
              <button
                onClick={handleEndVoiceAgent}
                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}