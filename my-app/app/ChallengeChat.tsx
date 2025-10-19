'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { SimulationData } from './map';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

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

type ChallengeState = 'simulating' | 'scored' | 'learning';

export default function ChallengeChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Challenge mode activated! Analyzing your selected area...',
      timestamp: new Date(),
    },
  ]);
  const [challengeState, setChallengeState] = useState<ChallengeState>('simulating');
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [ecoScoreData, setEcoScoreData] = useState<EcoScoreData | null>(null);
  const [isCalculatingScore, setIsCalculatingScore] = useState(false);
  const [geminiAnalysis, setGeminiAnalysis] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedCoordinates, setSelectedCoordinates] = useState<any[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for challenge events
  useEffect(() => {
    const handleCoordinates = async (event: any) => {
      const coords = event.detail?.coordinates;
      console.log('🎯 ChallengeChat received coordinates:', coords);

      if (coords) {
        setSelectedCoordinates(coords);

        // Auto-analyze with challenge-specific prompt
        const autoMessage = 'Analyze the area I just selected on the map. Focus ONLY on environmental issues that can be addressed with trees, solar panels, permeable pavements, and parks. Do NOT provide solutions - just describe the key issues.';

        try {
          const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prompt: autoMessage,
              coordinates: coords,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            setGeminiAnalysis(data.text);

            const aiMessage: Message = {
              id: Date.now().toString(),
              role: 'assistant',
              content: data.text,
              timestamp: new Date(),
            };

            setMessages((prev) => [...prev, aiMessage]);
          }
        } catch (error) {
          console.error('Error getting analysis:', error);
        }
      }
    };

    const handleSimulationData = (event: any) => {
      const simData = event.detail?.simulationData;
      console.log('🎯 ChallengeChat received simulation data:', simData);
      if (simData) {
        setSimulationData(simData);
      }
    };

    window.addEventListener('challengeCoordinates', handleCoordinates);
    window.addEventListener('challengeSimulationData', handleSimulationData);
    console.log('✅ ChallengeChat event listeners added');

    return () => {
      window.removeEventListener('challengeCoordinates', handleCoordinates);
      window.removeEventListener('challengeSimulationData', handleSimulationData);
    };
  }, []);

  const handleSubmitSimulation = async () => {
    if (!simulationData || !geminiAnalysis) {
      alert('Please wait for the area analysis to complete first, then place some simulations on the map.');
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
      setChallengeState('scored');

      const scoreMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `## 🎯 Your EcoScore: ${data.ecoscore}/1000\n\n**Score Breakdown:**\n- 📊 Relevance: ${data.breakdown.relevance}/500\n- 📈 Quantity: ${data.breakdown.quantity}/250\n- 🌈 Diversity: ${data.breakdown.diversity}/150\n- 📍 Distribution: ${data.breakdown.distribution}/100`,
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

    setChallengeState('learning');

    const feedbackMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `## 📚 Detailed Feedback\n\n**What Improved Your Score:**\n${ecoScoreData.feedback.whatWorked}\n\n**What Decreased Your Score:**\n${ecoScoreData.feedback.whatDidntWork}\n\n**Optimal Solution:**\n${ecoScoreData.feedback.optimalSolution}`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, feedbackMessage]);
  };

  const handleRetry = () => {
    console.log('🔄 Retry clicked - clearing simulations');
    setSimulationData(null);
    setChallengeState('simulating');
    setEcoScoreData(null);

    // Tell map to clear simulations
    if (typeof window !== 'undefined' && (window as any).mapChallengeRetry) {
      (window as any).mapChallengeRetry();
    }

    const retryMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Simulations cleared! Place new interventions and try again.',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, retryMessage]);
  };

  const handlePlayAgain = () => {
    console.log('🎮 Play Again clicked - generating new challenge');
    window.dispatchEvent(new CustomEvent('challengePlayAgain'));
  };

  const handleEndChallenge = () => {
    console.log('🛑 End Challenge clicked');
    window.dispatchEvent(new CustomEvent('challengeEnd'));
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold text-gray-900">Challenge Mode</h2>
        <div className="text-sm text-gray-500">Place simulations on the map</div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4">
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
              <div className="text-sm prose prose-sm max-w-none">
                <ReactMarkdown>{message.content}</ReactMarkdown>
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
        <div ref={messagesEndRef} />
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t">
        {challengeState === 'simulating' ? (
          <div className="flex flex-col gap-2">
            <button
              onClick={handleSubmitSimulation}
              disabled={isCalculatingScore || !simulationData}
              className="w-full px-6 py-4 bg-[#25491B] text-white rounded-lg hover:bg-[#1a3513] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg"
            >
              {isCalculatingScore ? 'Calculating Score...' : 'Submit Simulation'}
            </button>
            <p className="text-xs text-gray-500 text-center">
              Place trees, solar panels, permeable pavement, or parks on the map, then submit for scoring
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {challengeState === 'scored' && (
              <button
                onClick={handleLearnWhy}
                className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Learn Why
              </button>
            )}
            <button
              onClick={handleRetry}
              className="w-full px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
            >
              Retry
            </button>
            <p className="text-xs text-gray-500 text-center mt-1">
              Use the Eraser tool on the map to end challenge mode
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
