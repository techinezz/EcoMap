'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Phone, PhoneOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useConversation } from '@elevenlabs/react';
import CircularAudioVisualizer from './CircularAudioVisualizer';
import { SimulationData } from './map';
import { calculateEcoScore, EcoScoreResult } from '@/lib/ecoScoreCalculator';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIChat({
  selectedCoordinates,
  simulationData,
  isChallengeMode = false,
  onChallengeEnd,
}: {
  selectedCoordinates?: any[];
  simulationData?: SimulationData | null;
  isChallengeMode?: boolean;
  onChallengeEnd?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: isChallengeMode
        ? '🎯 Challenge Mode Activated! I\'ve identified environmental issues in this area. Ask me about the location to understand what sustainability interventions might help. Use trees, solar panels, permeable pavement, and parks to improve the EcoScore!'
        : 'Hello! I\'m your map assistant. I can help you analyze locations, understand geographic data, and provide insights about specific areas. What would you like to know about the map?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceAgentOpen, setIsVoiceAgentOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputAudioData, setInputAudioData] = useState<Uint8Array>(new Uint8Array(128));
  const [outputAudioData, setOutputAudioData] = useState<Uint8Array>(new Uint8Array(128));
  const animationFrameRef = useRef<number | undefined>(undefined);
  const [geminiAnalysis, setGeminiAnalysis] = useState<string>('');
  const [ecoScoreResult, setEcoScoreResult] = useState<EcoScoreResult | null>(null);
  const [showEcoScoreResult, setShowEcoScoreResult] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<Message[]>([]);

  // Auto-start voice agent in challenge mode
  useEffect(() => {
    if (isChallengeMode && !isVoiceAgentOpen && conversation.status === 'disconnected') {
      console.log('Challenge mode: Auto-starting voice agent');
      // Small delay to ensure component is mounted
      const timer = setTimeout(() => {
        handleVoiceAgent();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isChallengeMode]);

  // Calculate EcoScore when simulation data changes in challenge mode
  useEffect(() => {
    if (isChallengeMode && simulationData) {
      const hasAnySimulation =
        simulationData.totalTreesPlaced > 0 ||
        simulationData.totalSolarPlaced > 0 ||
        simulationData.placedPavementPoints.length > 0 ||
        simulationData.placedParks.length > 0;

      if (hasAnySimulation) {
        const result = calculateEcoScore(simulationData);
        setEcoScoreResult(result);
        setShowEcoScoreResult(true);

        // Add EcoScore message to chat
        const scoreMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `## 🎯 EcoScore Results\n\n**Total Score: ${result.totalScore}/1000**\n\n### Breakdown:\n- 🌳 Trees: ${result.breakdown.treesScore}/300\n- ☀️ Solar Panels: ${result.breakdown.solarScore}/250\n- 🌊 Permeable Pavement: ${result.breakdown.pavementScore}/250\n- 🏞️ Parks: ${result.breakdown.parkScore}/200\n\n${result.feedback}`,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, scoreMessage]);
      }
    }
  }, [simulationData, isChallengeMode]);

  // Prepare coordinate context whenever coordinates change
  const getCoordinateContext = () => {
    let contextString = '';

    // Add challenge mode context
    if (isChallengeMode) {
      contextString += 'CHALLENGE MODE ACTIVE:\n';
      contextString += 'You are helping the user solve an environmental challenge puzzle.\n';
      contextString += 'The user has selected a specific area with environmental issues.\n';
      contextString += 'Your role:\n';
      contextString += '- Describe environmental problems in this area (air quality, lack of green space, heat island effect, water runoff issues, etc.)\n';
      contextString += '- Give hints about what sustainability solutions might help (trees, solar panels, permeable pavement, parks)\n';
      contextString += '- Answer questions about the location and environmental issues\n';
      contextString += '- DO NOT give exact solutions or tell them exactly where to place items\n';
      contextString += '- Encourage them to think critically about the environmental challenges\n\n';
    }

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

        contextString = `The user has selected a specific area on the map for environmental analysis.

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
    } else {
      contextString = 'No area has been selected on the map yet. The user needs to draw an area on the map before you can provide location-specific analysis.';
    }

    // Add simulation data if available
    if (simulationData) {
      const hasSimulations =
        simulationData.totalTreesPlaced > 0 ||
        simulationData.totalSolarPlaced > 0 ||
        simulationData.placedPavementPoints.length > 0 ||
        simulationData.placedParks.length > 0;

      if (hasSimulations) {
        contextString += '\n\nUSER SIMULATION DATA:';
        contextString += '\nThe user has placed the following sustainability interventions on the map:';

        if (simulationData.totalTreesPlaced > 0) {
          contextString += `\n\n🌳 TREES:`;
          contextString += `\n- Total trees placed: ${simulationData.totalTreesPlaced}`;
          contextString += `\n- Number of tree clusters: ${simulationData.treeClusters.length}`;
          simulationData.treeClusters.forEach((cluster, idx) => {
            contextString += `\n  • Cluster ${idx + 1}: ${cluster.count} trees at [${cluster.center[0].toFixed(6)}, ${cluster.center[1].toFixed(6)}]`;
          });
        }

        if (simulationData.totalSolarPlaced > 0) {
          contextString += `\n\n☀️ SOLAR PANELS:`;
          contextString += `\n- Total solar panels placed: ${simulationData.totalSolarPlaced}`;
          contextString += `\n- Number of solar clusters: ${simulationData.solarClusters.length}`;
          simulationData.solarClusters.forEach((cluster, idx) => {
            contextString += `\n  • Cluster ${idx + 1}: ${cluster.count} panels at [${cluster.center[0].toFixed(6)}, ${cluster.center[1].toFixed(6)}]`;
          });
        }

        if (simulationData.placedPavementPoints.length > 0) {
          contextString += `\n\n🛣️ PERMEABLE PAVEMENT:`;
          contextString += `\n- Total pavement points: ${simulationData.placedPavementPoints.length}`;
          simulationData.placedPavementPoints.forEach((point, idx) => {
            contextString += `\n  • Point ${idx + 1}: [${point.center[0].toFixed(6)}, ${point.center[1].toFixed(6)}]`;
          });
        }

        if (simulationData.placedParks.length > 0) {
          contextString += `\n\n🏞️ PARKS:`;
          contextString += `\n- Total parks placed: ${simulationData.placedParks.length}`;
          simulationData.placedParks.forEach((park, idx) => {
            contextString += `\n  • Park ${idx + 1}: [${park.center[0].toFixed(6)}, ${park.center[1].toFixed(6)}]`;
          });
        }

        contextString += '\n\nPlease use this simulation data to provide insights about:';
        contextString += '\n- The environmental impact of these interventions';
        contextString += '\n- How these placements could affect air quality, temperature, stormwater management';
        contextString += '\n- Suggestions for optimizing placement or adding additional interventions';
        contextString += '\n- Cost estimates and timeline for implementing these changes';
      }
    }

    return contextString;
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
            console.log('Attempting to send context to agent...');
            console.log('sendUserMessage exists?', 'sendUserMessage' in conversation);
            console.log('sendUserMessage is function?', typeof conversation.sendUserMessage);

            if ('sendUserMessage' in conversation && typeof conversation.sendUserMessage === 'function') {
              conversation.sendUserMessage(contextToSend);
              console.log('✅ Context message sent via sendUserMessage');
            } else {
              console.error('❌ sendUserMessage not available on conversation object');
              console.log('Available methods:', Object.keys(conversation));
            }
            contextSentRef.current = true;
          } catch (error) {
            console.error('Error sending context:', error);
          }
        }
      }, 1000);
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs');
      // Don't automatically close the voice agent view on disconnect
      // User can use "Back to Chat" button to return
    },
    onError: (error) => {
      console.error('ElevenLabs error:', error);
    },
    onMessage: (message) => {
      console.log('Voice Message:', message);

      // Add message to voice transcript in challenge mode
      if (isChallengeMode && message) {
        const transcriptMessage: Message = {
          id: Date.now().toString() + Math.random(),
          role: message.source === 'user' || message.source === 'client' ? 'user' : 'assistant',
          content: message.message || message.text || '',
          timestamp: new Date(),
        };

        setVoiceTranscript((prev) => [...prev, transcriptMessage]);
      }
    },
    onModeChange: (mode) => {
      console.log('Mode changed:', mode);
    },
  });

  // Update audio visualizer data
  useEffect(() => {
    if (!isVoiceAgentOpen || conversation.status !== 'connected') {
      // Reset audio data when voice agent is closed or not connected
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      // Only reset if they're not already reset to avoid infinite loop
      setInputAudioData(prev => prev.some(v => v !== 0) ? new Uint8Array(128) : prev);
      setOutputAudioData(prev => prev.some(v => v !== 0) ? new Uint8Array(128) : prev);
      return;
    }

    // Only run animation loop when voice agent is connected
    let isActive = true;

    const updateAudioData = () => {
      if (!isActive || conversation.status !== 'connected') {
        return;
      }

      try {
        // Try to get audio data
        const inputData = conversation.getInputByteFrequencyData?.();
        const outputData = conversation.getOutputByteFrequencyData?.();

        // Update state with new audio data
        if (inputData && inputData.length > 0) {
          setInputAudioData(inputData);
        }
        if (outputData && outputData.length > 0) {
          setOutputAudioData(outputData);
        }
      } catch (error) {
        console.error('Error getting audio data:', error);
      }

      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(updateAudioData);
      }
    };

    // Start the animation loop immediately
    updateAudioData();

    return () => {
      isActive = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVoiceAgentOpen, conversation.status]);

  const handleVoiceAgent = async () => {
    if (conversation.status === 'connected' || conversation.status === 'connecting') {
      console.log('Already connected or connecting, skipping...');
      return;
    }

    setIsVoiceAgentOpen(true);

    try {
      const coordinateContext = getCoordinateContext();

      console.log('=== VOICE AGENT STARTING ===');
      console.log('Simulation Data available:', simulationData);
      if (simulationData) {
        console.log('- Total trees:', simulationData.totalTreesPlaced);
        console.log('- Total solar:', simulationData.totalSolarPlaced);
        console.log('- Pavement points:', simulationData.placedPavementPoints.length);
        console.log('- Parks:', simulationData.placedParks.length);
        console.log('- Tree clusters:', simulationData.treeClusters.length);
        console.log('- Solar clusters:', simulationData.solarClusters.length);
      }
      console.log('Full context length:', coordinateContext.length);
      console.log('Full context:', coordinateContext);
      console.log('=== END DEBUG ===');
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
    // Don't close the voice agent view, just disconnect
  };

  const handleBackToChat = () => {
    // If still connected, disconnect first
    if (conversation.status === 'connected') {
      conversation.endSession();
    }
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
          // Check if the method exists before calling
          if ('setCustomLlmExtraBody' in conversation && typeof (conversation as any).setCustomLlmExtraBody === 'function') {
            (conversation as any).setCustomLlmExtraBody({
              context: coordinateContext,
            });
          }
        } catch (error) {
          console.error('Error updating context:', error);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCoordinates]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Voice Agent Mode - Full Screen */}
      {isVoiceAgentOpen ? (
        <div className="flex flex-col h-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-gray-900">
                {isChallengeMode ? 'Challenge Mode' : 'Voice Assistant'}
              </h2>
              {isChallengeMode && (
                <span className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-full font-medium">
                  🎯 Active
                </span>
              )}
            </div>
            {isChallengeMode && onChallengeEnd ? (
              <button
                onClick={onChallengeEnd}
                className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
              >
                End Challenge
              </button>
            ) : (
              <button
                onClick={handleBackToChat}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Back to Chat
              </button>
            )}
          </div>

          {/* Location Context */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700 line-clamp-3">
              {selectedCoordinates && selectedCoordinates.length > 0
                ? 'Voice assistant has context about your selected map area'
                : 'Draw an area on the map to provide location context'}
            </p>
          </div>

          {/* Status Indicator */}
          <div className="mb-6 text-center">
            <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
              conversation.status === 'connected' ? 'bg-green-100 text-green-800' :
              conversation.status === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {conversation.status === 'connected' ? '● Connected' :
               conversation.status === 'connecting' ? '● Connecting...' :
               '○ Disconnected'}
            </span>
          </div>

          {/* Challenge Mode: Transcript View */}
          {isChallengeMode ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Voice Conversation Transcript</h3>

              {/* Transcript Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 bg-gray-50 rounded-lg p-4">
                {voiceTranscript.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    <p>Start speaking to see the conversation transcript...</p>
                    <p className="text-sm mt-2">Your voice and AI responses will appear here as text</p>
                  </div>
                ) : (
                  voiceTranscript.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-[#ABD2A9] text-gray-900'
                            : 'bg-white text-gray-900 border border-gray-200'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <span className="text-xs opacity-70 mt-1 block">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* EcoScore Display */}
              {ecoScoreResult && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                  <div className="text-center">
                    <h4 className="text-lg font-bold text-gray-800 mb-2">🎯 EcoScore</h4>
                    <div className="text-4xl font-bold text-green-700 mb-2">
                      {ecoScoreResult.totalScore}/1000
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white rounded p-2">
                        <span className="font-medium">🌳 Trees:</span> {ecoScoreResult.breakdown.treesScore}/300
                      </div>
                      <div className="bg-white rounded p-2">
                        <span className="font-medium">☀️ Solar:</span> {ecoScoreResult.breakdown.solarScore}/250
                      </div>
                      <div className="bg-white rounded p-2">
                        <span className="font-medium">🌊 Pavement:</span> {ecoScoreResult.breakdown.pavementScore}/250
                      </div>
                      <div className="bg-white rounded p-2">
                        <span className="font-medium">🏞️ Parks:</span> {ecoScoreResult.breakdown.parkScore}/200
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Normal Mode: Audio Visualizers */
            <div className="flex-1 flex items-center justify-center">
              <div className="flex gap-12">
                <div className="text-center">
                  <CircularAudioVisualizer
                    audioData={inputAudioData}
                    size={180}
                    barCount={64}
                    barColor="#ABD2A9"
                  />
                  <p className="text-sm text-gray-600 mt-4 font-medium">Your Voice</p>
                </div>
                <div className="text-center">
                  <CircularAudioVisualizer
                    audioData={outputAudioData}
                    size={180}
                    barCount={64}
                    barColor="#9BC299"
                  />
                  <p className="text-sm text-gray-600 mt-4 font-medium">AI Voice</p>
                </div>
              </div>
            </div>
          )}

          {/* Controls - Hidden in challenge mode */}
          {!isChallengeMode && (
            <div className="mt-6 flex gap-3">
              {conversation.status === 'connected' ? (
                <button
                  onClick={handleEndVoiceAgent}
                  className="flex-1 px-6 py-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <PhoneOff size={24} />
                  End Call
                </button>
              ) : (
                <button
                  onClick={handleVoiceAgent}
                  className="flex-1 px-6 py-4 bg-[#25491B] text-white rounded-lg hover:bg-[#1a3513] transition-colors flex items-center justify-center gap-2 font-medium"
                  disabled={conversation.status === 'connecting'}
                >
                  <Phone size={24} />
                  {conversation.status === 'connecting' ? 'Connecting...' : 'Start Call'}
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Text Chat Mode - Full Screen */
        <div className="flex flex-col h-full p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-3">
            {isChallengeMode && (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded font-medium">
                  🎯 Challenge Mode
                </span>
                {ecoScoreResult && (
                  <span className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded font-medium">
                    Score: {ecoScoreResult.totalScore}/1000
                  </span>
                )}
              </div>
            )}
            <div className="flex gap-2 ml-auto">
              {isChallengeMode && onChallengeEnd && (
                <button
                  onClick={onChallengeEnd}
                  className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors font-medium"
                >
                  End Challenge
                </button>
              )}
              <button
                onClick={() => setMessages([messages[0]])}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Clear
              </button>
            </div>
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
          placeholder={isChallengeMode ? "Ask about the location..." : "Type your message..."}
          disabled={isLoading}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ABD2A9] bg-white text-gray-900 disabled:opacity-50"
        />
        {!isChallengeMode && (
          <button
            type="button"
            onClick={handleVoiceAgent}
            className="p-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            title="Voice Chat"
          >
            <Mic size={20} />
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-6 py-3 bg-[#ABD2A9] text-white rounded-lg hover:bg-[#9BC299] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Send
        </button>
        </form>
        </div>
      )}
    </div>
  );
}