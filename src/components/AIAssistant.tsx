import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const AIAssistant: React.FC = () => {
  const { aiEngine, cadEngine, appState } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your AI CAD assistant. I can help you create 3D models, generate designs from descriptions, optimize your models, and provide design suggestions. What would you like to create today?',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isGenerating) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsGenerating(true);

    try {
      // Process the user's request with AI
      const response = await processAIRequest(inputText);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI processing failed:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again or rephrase your question.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const processAIRequest = async (input: string): Promise<string> => {
    const lowerInput = input.toLowerCase();

    // Model generation requests
    if (lowerInput.includes('create') || lowerInput.includes('generate') || lowerInput.includes('make')) {
      if (lowerInput.includes('cube') || lowerInput.includes('box')) {
        const objectId = cadEngine.createPrimitive('cube', { width: 10, height: 10, depth: 10 });
        return `I've created a cube for you! The object ID is ${objectId}. You can modify its dimensions in the properties panel.`;
      }
      
      if (lowerInput.includes('sphere') || lowerInput.includes('ball')) {
        const objectId = cadEngine.createPrimitive('sphere', { radius: 5 });
        return `I've created a sphere for you! The object ID is ${objectId}. You can adjust its radius in the properties panel.`;
      }
      
      if (lowerInput.includes('cylinder')) {
        const objectId = cadEngine.createPrimitive('cylinder', { radius: 5, height: 10 });
        return `I've created a cylinder for you! The object ID is ${objectId}. You can modify its radius and height in the properties panel.`;
      }

      // Complex model generation
      if (lowerInput.includes('gear') || lowerInput.includes('cog')) {
        try {
          const gearId = await aiEngine.generateModel('gear', {
            teeth: 20,
            module: 2,
            thickness: 5,
            boreRadius: 3
          });
          return `I've generated a gear with 20 teeth for you! The gear has been added to your scene. You can modify its parameters in the properties panel.`;
        } catch (error) {
          return 'I encountered an issue generating the gear. Let me create a basic cylinder that you can modify into a gear shape.';
        }
      }

      if (lowerInput.includes('bracket') || lowerInput.includes('mount')) {
        try {
          const bracketId = await aiEngine.generateModel('bracket', {
            width: 50,
            height: 30,
            thickness: 5,
            holes: 4
          });
          return `I've generated a mounting bracket for you! It includes mounting holes and can be customized in the properties panel.`;
        } catch (error) {
          return 'I encountered an issue generating the bracket. Let me help you create one step by step using basic shapes.';
        }
      }

      // Use AI model generation for complex descriptions
      try {
        const modelId = await aiEngine.generateFromDescription(input);
        return `I've generated a 3D model based on your description! The model has been added to your scene. You can further modify it using the CAD tools.`;
      } catch (error) {
        return `I understand you want to create something, but I need more specific details. Could you describe the shape, dimensions, or purpose of what you'd like to create?`;
      }
    }

    // Optimization requests
    if (lowerInput.includes('optimize') || lowerInput.includes('improve')) {
      const selectedObjects = cadEngine.getSelectedObjects();
      if (selectedObjects.length === 0) {
        return 'Please select an object first, then I can help optimize it for strength, weight, or manufacturing.';
      }

      try {
        const suggestions = await aiEngine.optimizeDesign(selectedObjects[0].id, 'strength');
        return `I've analyzed your design and here are my optimization suggestions:\n\n${suggestions.join('\n')}`;
      } catch (error) {
        return 'I can help optimize your design! Please specify what you\'d like to optimize for: strength, weight reduction, manufacturing cost, or material usage.';
      }
    }

    // Analysis requests
    if (lowerInput.includes('analyze') || lowerInput.includes('check')) {
      const selectedObjects = cadEngine.getSelectedObjects();
      if (selectedObjects.length === 0) {
        return 'Please select an object first, then I can analyze it for various properties like stress concentration, manufacturability, or design issues.';
      }

      return 'I can analyze your design for:\n• Structural integrity\n• Manufacturing feasibility\n• Material efficiency\n• Assembly constraints\n\nWhich type of analysis would you like me to perform?';
    }

    // Help and guidance
    if (lowerInput.includes('help') || lowerInput.includes('how')) {
      return `I can help you with:

🔧 **Model Creation**: "Create a gear with 20 teeth" or "Generate a mounting bracket"
🎯 **Design Optimization**: "Optimize this part for strength" or "Reduce weight"
📊 **Analysis**: "Analyze stress points" or "Check manufacturability"
🔄 **Modifications**: "Add a hole here" or "Fillet these edges"
💡 **Suggestions**: "Improve this design" or "Alternative approaches"

Just describe what you want to do in natural language, and I'll help you achieve it!`;
    }

    // Default response for unclear requests
    return `I'd be happy to help! I can assist with:

• Creating 3D models from descriptions
• Optimizing designs for various criteria
• Analyzing structural properties
• Suggesting design improvements
• Automating repetitive tasks

Could you be more specific about what you'd like to do? For example:
- "Create a gear with 24 teeth"
- "Optimize this bracket for weight"
- "Add mounting holes to this part"`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* AI Assistant Toggle Button */}
      <button
        className="ai-assistant-toggle"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#007acc',
          color: 'white',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 122, 204, 0.3)',
          zIndex: 1000,
          transition: 'all 0.3s ease'
        }}
      >
        🤖
      </button>

      {/* AI Assistant Panel */}
      {isOpen && (
        <div
          className="ai-assistant-panel"
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            width: '400px',
            height: '500px',
            backgroundColor: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid #444',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#333',
              borderRadius: '12px 12px 0 0'
            }}
          >
            <h3 style={{ margin: 0, color: 'white', fontSize: '16px' }}>
              🤖 AI Assistant
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#999',
                fontSize: '18px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%'
                }}
              >
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '12px',
                    backgroundColor: message.type === 'user' ? '#007acc' : '#444',
                    color: 'white',
                    fontSize: '14px',
                    lineHeight: '1.4',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {message.content}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#999',
                    marginTop: '4px',
                    textAlign: message.type === 'user' ? 'right' : 'left'
                  }}
                >
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>
            ))}
            
            {isGenerating && (
              <div style={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '12px',
                    backgroundColor: '#444',
                    color: 'white',
                    fontSize: '14px'
                  }}
                >
                  <span>AI is thinking</span>
                  <span className="typing-dots">...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: '16px',
              borderTop: '1px solid #444',
              display: 'flex',
              gap: '8px'
            }}
          >
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me to create, optimize, or analyze..."
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #555',
                backgroundColor: '#1a1a1a',
                color: 'white',
                fontSize: '14px',
                resize: 'none',
                minHeight: '36px',
                maxHeight: '100px'
              }}
              rows={1}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isGenerating}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: inputText.trim() && !isGenerating ? '#007acc' : '#555',
                color: 'white',
                cursor: inputText.trim() && !isGenerating ? 'pointer' : 'not-allowed',
                fontSize: '14px'
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}

      <style>{`
        .typing-dots {
          animation: typing 1.5s infinite;
        }
        
        @keyframes typing {
          0%, 20% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </>
  );
};

export default AIAssistant;

