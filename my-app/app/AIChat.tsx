'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Phone, PhoneOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useConversation } from '@elevenlabs/react';
import CircularAudioVisualizer from './CircularAudioVisualizer';
import { SimulationData } from './map';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

type ChallengeMode = 'inactive' | 'simulating' | 'scored' | 'learning';

interface EcoScoreData {
  ecoscore: number;
  breakdown: {
    relevance: number;
    quantity: number;
    diversity: number;
    distribution: number;
  };
  feedback: {
    whatWorked: string;
    whatDidntWork: string;
    optimalSolution: string;
  };
}

export default function AIChat({
  selectedCoordinates,
  simulationData,
  challengeMode = 'inactive',
  onChallengeRetry,
  onChallengePlayAgain,
  onChallengeEnd,
}: {
  selectedCoordinates?: any[];
  simulationData?: SimulationData | null;
  challengeMode?: ChallengeMode;
  onChallengeRetry?: () => void;
  onChallengePlayAgain?: () => void;
  onChallengeEnd?: () => void;
}) {
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
  const animationFrameRef = useRef<number | undefined>(undefined);
  const [geminiAnalysis, setGeminiAnalysis] = useState<string>('');
  const [ecoScoreData, setEcoScoreData] = useState<EcoScoreData | null>(null);
  const [isCalculatingScore, setIsCalculatingScore] = useState(false);
  const [internalChallengeMode, setInternalChallengeMode] = useState<ChallengeMode>('inactive');
  const [voiceTranscript, setVoiceTranscript] = useState<Array<{role: 'user' | 'assistant', text: string}>>([]);

  // State for location name
  const [locationName, setLocationName] = useState<string>('');

  // Reverse geocode to get location name with more specificity
  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=18`
      );
      if (response.ok) {
        const data = await response.json();
        const address = data.address || {};

        // Build a more specific location string prioritizing specific landmarks/buildings
        const locationParts = [];

        // Highest priority: specific landmarks, universities, buildings
        if (address.university) locationParts.push(address.university);
        if (address.school) locationParts.push(address.school);
        if (address.building) locationParts.push(address.building);
        if (address.amenity) locationParts.push(address.amenity);
        if (address.leisure) locationParts.push(address.leisure);

        // Medium priority: specific neighborhood/suburb
        if (address.suburb) locationParts.push(address.suburb);
        if (address.neighbourhood) locationParts.push(address.neighbourhood);

        // Lower priority: general area info
        if (address.city_district) locationParts.push(address.city_district);
        if (address.city || address.town || address.village) {
          locationParts.push(address.city || address.town || address.village);
        }
        if (address.county) locationParts.push(address.county);
        if (address.state) locationParts.push(address.state);

        // If we have specific parts, use them; otherwise fall back to full display_name
        const locationName = locationParts.length > 0
          ? locationParts.join(', ')
          : data.display_name || '';

        console.log('🗺️ Reverse geocode details:', { address, locationParts, final: locationName });
        return locationName;
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
    return '';
  };

  // Prepare coordinate context whenever coordinates change
  const getCoordinateContext = () => {
    let contextString = '';

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
        const polygonPoints = coords[0]
          .filter((point: number[]) => Array.isArray(point) && point.length >= 2 && typeof point[0] === 'number' && typeof point[1] === 'number')
          .map((point: number[]) =>
            `(Longitude: ${point[0].toFixed(6)}, Latitude: ${point[1].toFixed(6)})`
          ).join(', ');

        contextString = `The user has selected a specific area on the map for environmental analysis.

LOCATION DETAILS:
- Center Point: Longitude ${centerLon}, Latitude ${centerLat}
- This location is approximately at coordinates ${centerLat}°N, ${Math.abs(parseFloat(centerLon))}°W${locationName ? `\n- Place: ${locationName}` : ''}

SELECTED AREA BOUNDARY:
The user drew a polygon with the following corner points:
${polygonPoints}

IMPORTANT: Use the exact place name "${locationName}" when referring to this location. Do not assume or guess a different neighborhood or area name.

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
      console.log('Message:', message);
      // Add message to transcript
      if (message.source === 'user' && message.message) {
        setVoiceTranscript(prev => [...prev, { role: 'user', text: message.message }]);
      } else if (message.source === 'ai' && message.message) {
        setVoiceTranscript(prev => [...prev, { role: 'assistant', text: message.message }]);
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
    // Clear transcript when closing voice agent
    setVoiceTranscript([]);
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
      // Get full context including simulation data
      const context = getCoordinateContext();

      // Build the full prompt with context
      const fullPrompt = context
        ? `${context}\n\nUser Question: ${userMessage.content}`
        : userMessage.content;

      // Call your Gemini API route
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: fullPrompt,
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

  const handleSubmitSimulation = async () => {
    if (!simulationData || !geminiAnalysis) {
      alert('Please wait for the area analysis to complete first.');
      return;
    }

    setIsCalculatingScore(true);

    try {
      const response = await fetch('/api/calculate-ecoscore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationAnalysis: geminiAnalysis,
          simulationData: simulationData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to calculate EcoScore');
      }

      const data = await response.json();
      setEcoScoreData(data);
      setInternalChallengeMode('scored');

      // Add ecoscore message to chat
      const scoreMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `## 🎯 Your EcoScore: ${data.ecoscore}/1000\n\n**Score Breakdown:**\n- 📊 Relevance: ${data.breakdown.relevance}/500\n- 📈 Quantity: ${data.breakdown.quantity}/250\n- 🌈 Diversity: ${data.breakdown.diversity}/150\n- 📍 Distribution: ${data.breakdown.distribution}/100\n\n**What would you like to do next?**\n- See detailed feedback\n- Retry this challenge\n- Play again with a new location\n- End challenge`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, scoreMessage]);
    } catch (error) {
      console.error('Error calculating EcoScore:', error);
      alert('Failed to calculate EcoScore. Please try again.');
    } finally {
      setIsCalculatingScore(false);
    }
  };

  const handleLearnWhy = () => {
    if (!ecoScoreData) return;

    setInternalChallengeMode('learning');

    const feedbackMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `## 📚 Detailed Feedback\n\n**What Improved Your Score:**\n${ecoScoreData.feedback.whatWorked}\n\n**What Decreased Your Score:**\n${ecoScoreData.feedback.whatDidntWork}\n\n**Optimal Solution:**\n${ecoScoreData.feedback.optimalSolution}\n\n**What would you like to do next?**\n- Retry this challenge\n- Play again with a new location\n- End challenge`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, feedbackMessage]);
  };

  // Sync challenge mode
  useEffect(() => {
    console.log('🎮 Challenge mode prop changed:', challengeMode, '(internal:', internalChallengeMode, ')');

    if (challengeMode !== internalChallengeMode) {
      setInternalChallengeMode(challengeMode);

      // Clear messages when challenge starts
      if (challengeMode === 'simulating') {
        console.log('🧹 Clearing messages for challenge start');
        setMessages([{
          id: '1',
          role: 'assistant',
          content: 'Challenge mode activated! Analyzing your selected area...',
          timestamp: new Date(),
        }]);
        setEcoScoreData(null);
      }
    }
  }, [challengeMode]);

  // Reverse geocode when coordinates change
  useEffect(() => {
    if (selectedCoordinates && selectedCoordinates.length > 0) {
      const coords = selectedCoordinates[0];
      if (Array.isArray(coords) && Array.isArray(coords[0])) {
        // Calculate center point
        let sumLat = 0, sumLon = 0, count = 0;
        coords[0].forEach((point: number[]) => {
          sumLon += point[0];
          sumLat += point[1];
          count++;
        });
        const centerLat = sumLat / count;
        const centerLon = sumLon / count;

        // Perform reverse geocoding
        reverseGeocode(centerLat, centerLon).then((name) => {
          console.log('📍 Reverse geocoded location:', name);
          setLocationName(name);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCoordinates]);

  // When coordinates are received, automatically send them to AI
  const prevCoordinatesRef = useRef<any[]>([]);

  useEffect(() => {
    // Only trigger if coordinates actually changed (not empty and different from previous)
    if (selectedCoordinates &&
        selectedCoordinates.length > 0 &&
        JSON.stringify(selectedCoordinates) !== JSON.stringify(prevCoordinatesRef.current)) {

      prevCoordinatesRef.current = selectedCoordinates;

      // In challenge mode, use special prompt (check BOTH challengeMode prop and internal state)
      const autoMessage = (challengeMode === 'simulating' || internalChallengeMode === 'simulating')
        ? 'Analyze the area I just selected on the map. Focus ONLY on environmental issues that can be addressed with trees, solar panels, permeable pavements, and parks. Do NOT provide solutions - just describe the key issues.'
        : 'Analyze the area I just selected on the map.';

      console.log('🔍 Challenge mode check:', { challengeMode, internalChallengeMode, autoMessage });

      // Wait a bit for reverse geocoding to complete before analyzing
      setTimeout(() => {
        handleAutoAnalysis(autoMessage);
      }, 500);

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
  }, [selectedCoordinates, challengeMode]);

  // Cleanup: Disconnect voice session when component unmounts
  useEffect(() => {
    return () => {
      // End voice session if connected when chat closes
      if (conversation.status === 'connected') {
        conversation.endSession();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run on mount/unmount

  // Listen for simulation completion and auto-analyze
  useEffect(() => {
    const handleSimulationComplete = async (event: any) => {
      const simData = event.detail?.simulationData;
      console.log('🎯 AIChat received simulation complete event:', simData);

      if (!simData) return;

      // Check if there are any simulations
      const hasSimulations =
        simData.totalTreesPlaced > 0 ||
        simData.totalSolarPlaced > 0 ||
        simData.placedPavementPoints.length > 0 ||
        simData.placedParks.length > 0;

      if (!hasSimulations) {
        console.log('⚠️ No simulations to analyze');
        return;
      }

      // Create auto-analysis message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: 'Analyze my simulation',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // Get full context including simulation data
        const context = getCoordinateContext();

        // Build analysis prompt
        const analysisPrompt = `${context}\n\nUser Request: Please analyze my sustainability simulation and provide:\n1. Environmental impact assessment of these interventions\n2. How these placements could improve air quality, reduce temperature, and manage stormwater\n3. Specific suggestions for optimizing placement or adding additional interventions\n4. Estimated costs and implementation timeline for these changes\n5. Any potential issues or conflicts with the current placement`;

        const response = await fetch('/api/gemini', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: analysisPrompt,
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

        setMessages((prev) => [...prev, aiMessage]);
      } catch (error) {
        console.error('Error analyzing simulation:', error);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error analyzing your simulation. Please try again.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    };

    window.addEventListener('simulationComplete', handleSimulationComplete);
    console.log('✅ AIChat listening for simulation completion events');

    return () => {
      window.removeEventListener('simulationComplete', handleSimulationComplete);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCoordinates, simulationData]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Voice Agent Mode - Full Screen */}
      {isVoiceAgentOpen ? (
        <div className="flex flex-col h-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Voice Assistant</h2>
            <button
              onClick={handleBackToChat}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back to Chat
            </button>
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

          {/* Transcript Display */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-3 p-4 bg-gray-50 rounded-lg">
            {voiceTranscript.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Start speaking to see the conversation transcript...
              </div>
            ) : (
              voiceTranscript.map((entry, index) => (
                <div
                  key={index}
                  className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      entry.role === 'user'
                        ? 'bg-[#ABD2A9] text-gray-900'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <div className="text-xs font-semibold mb-1 opacity-70">
                      {entry.role === 'user' ? 'You' : 'AI Assistant'}
                    </div>
                    <p className="text-sm">{entry.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Controls */}
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
        </div>
      ) : (
        /* Text Chat Mode - Full Screen */
        <div className="flex flex-col h-full p-4">
          {/* Header */}
          <div className="flex items-center justify-end mb-4 pb-3">
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

      {/* Input Form / Challenge Controls */}
      {(() => {
        console.log('🎨 Rendering UI - prop:', challengeMode, 'internal:', internalChallengeMode, 'simData:', !!simulationData);
        return null;
      })()}
      {(challengeMode === 'simulating' || internalChallengeMode === 'simulating') ? (
        <div className="flex flex-col gap-2">
          <button
            onClick={handleSubmitSimulation}
            disabled={isCalculatingScore || !simulationData}
            className="w-full px-6 py-4 bg-[#25491B] text-white rounded-lg hover:bg-[#1a3513] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isCalculatingScore ? 'Calculating Score...' : 'Submit Simulation'}
          </button>
          <p className="text-xs text-gray-500 text-center">
            Place your sustainability interventions on the map, then submit for scoring
          </p>
        </div>
      ) : (challengeMode === 'scored' || challengeMode === 'learning' || internalChallengeMode === 'scored' || internalChallengeMode === 'learning') ? (
        <div className="grid grid-cols-2 gap-2">
          {internalChallengeMode === 'scored' && (
            <button
              onClick={handleLearnWhy}
              className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Learn Why
            </button>
          )}
          <button
            onClick={onChallengeRetry}
            className="px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
          >
            Retry
          </button>
          <button
            onClick={onChallengePlayAgain}
            className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
          >
            Play Again
          </button>
          <button
            onClick={onChallengeEnd}
            className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
          >
            End Challenge
          </button>
        </div>
      ) : (
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
      )}
        </div>
      )}
    </div>
  );
}