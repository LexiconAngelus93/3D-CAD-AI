import { AdvancedAIEngine, AIModelRequest, AIOptimizationRequest } from './AdvancedAIEngine';

export interface ConversationContext {
  sessionId: string;
  userId?: string;
  currentProject?: string;
  selectedObjects: string[];
  conversationHistory: ConversationMessage[];
  designIntent: {
    primaryGoal?: string;
    constraints?: string[];
    preferences?: Record<string, any>;
  };
  activeMode: 'cad' | 'pcb' | 'schematic' | 'simulation';
}

export interface ConversationMessage {
  id: string;
  timestamp: number;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'command' | 'suggestion' | 'result';
  metadata?: {
    confidence?: number;
    actionTaken?: string;
    objectsAffected?: string[];
    executionTime?: number;
  };
}

export interface AIResponse {
  message: string;
  actions?: AIAction[];
  suggestions?: string[];
  followUpQuestions?: string[];
  confidence: number;
  requiresConfirmation?: boolean;
}

export interface AIAction {
  type: 'create_model' | 'modify_object' | 'analyze_design' | 'optimize' | 'simulate' | 'export';
  parameters: Record<string, any>;
  description: string;
  estimatedTime?: number;
}

export class ConversationalAI {
  private aiEngine: AdvancedAIEngine;
  private context: ConversationContext;
  private intentClassifier: Map<string, RegExp[]> = new Map();
  private entityExtractor: Map<string, RegExp[]> = new Map();
  private responseTemplates: Map<string, string[]> = new Map();
  private commandHistory: string[] = [];

  constructor(aiEngine: AdvancedAIEngine, sessionId: string) {
    this.aiEngine = aiEngine;
    this.context = {
      sessionId,
      selectedObjects: [],
      conversationHistory: [],
      designIntent: {},
      activeMode: 'cad'
    };
    
    this.initializeNLP();
    this.initializeResponseTemplates();
  }

  private initializeNLP(): void {
    // Intent classification patterns
    this.intentClassifier.set('create_model', [
      /create|make|generate|build|design/i,
      /model|object|part|component/i,
      /gear|bracket|housing|mount|connector/i
    ]);

    this.intentClassifier.set('modify_object', [
      /modify|change|edit|update|adjust/i,
      /move|rotate|scale|resize/i,
      /add|remove|delete/i
    ]);

    this.intentClassifier.set('analyze_design', [
      /analyze|check|evaluate|assess/i,
      /strength|stress|performance|quality/i,
      /problems|issues|errors/i
    ]);

    this.intentClassifier.set('optimize', [
      /optimize|improve|enhance|better/i,
      /weight|strength|cost|performance/i,
      /lighter|stronger|cheaper|faster/i
    ]);

    this.intentClassifier.set('simulate', [
      /simulate|test|run|calculate/i,
      /analysis|simulation|fea|cfd/i,
      /thermal|structural|fluid|modal/i
    ]);

    this.intentClassifier.set('help', [
      /help|how|what|explain/i,
      /tutorial|guide|instructions/i,
      /can you|could you|please/i
    ]);

    // Entity extraction patterns
    this.entityExtractor.set('dimensions', [
      /(\d+(?:\.\d+)?)\s*(mm|cm|m|in|ft)/gi,
      /(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/gi
    ]);

    this.entityExtractor.set('materials', [
      /steel|aluminum|plastic|titanium|copper|brass/gi,
      /abs|nylon|peek|pla|petg/gi
    ]);

    this.entityExtractor.set('shapes', [
      /box|cube|sphere|cylinder|cone|torus/gi,
      /gear|bracket|housing|mount|connector/gi
    ]);

    this.entityExtractor.set('quantities', [
      /(\d+)\s*(pieces?|parts?|components?)/gi,
      /(one|two|three|four|five|six|seven|eight|nine|ten)/gi
    ]);
  }

  private initializeResponseTemplates(): void {
    this.responseTemplates.set('create_model', [
      "I'll create a {shape} for you with the specified dimensions.",
      "Creating a {material} {shape} with {dimensions}.",
      "Generating your {shape} model now. This will take a moment.",
      "I understand you want a {shape}. Let me design that for you."
    ]);

    this.responseTemplates.set('modify_object', [
      "I'll modify the selected object as requested.",
      "Updating the {object} with your changes.",
      "Making the requested modifications to your design.",
      "Applying changes to the selected component."
    ]);

    this.responseTemplates.set('analyze_design', [
      "Analyzing your design for {criteria}.",
      "Running design analysis to check for {issues}.",
      "Evaluating the {aspect} of your model.",
      "Performing comprehensive design assessment."
    ]);

    this.responseTemplates.set('optimize', [
      "Optimizing your design for {objective}.",
      "I'll suggest improvements to {aspect}.",
      "Analyzing optimization opportunities for {goal}.",
      "Finding ways to improve {criteria}."
    ]);

    this.responseTemplates.set('help', [
      "I'm here to help! What would you like to know about {topic}?",
      "I can assist you with {capability}. What specifically do you need?",
      "Let me explain how to {action}.",
      "Here's what you can do with {feature}."
    ]);

    this.responseTemplates.set('error', [
      "I'm not sure I understand. Could you rephrase that?",
      "I need more information to help you with that.",
      "Could you be more specific about what you'd like to do?",
      "I'm having trouble understanding your request. Can you clarify?"
    ]);
  }

  async processMessage(userMessage: string): Promise<AIResponse> {
    // Add user message to conversation history
    const userMsg: ConversationMessage = {
      id: `msg_${Date.now()}`,
      timestamp: Date.now(),
      role: 'user',
      content: userMessage,
      type: 'text'
    };
    this.context.conversationHistory.push(userMsg);

    try {
      // Classify intent
      const intent = this.classifyIntent(userMessage);
      
      // Extract entities
      const entities = this.extractEntities(userMessage);
      
      // Generate response based on intent and entities
      const response = await this.generateResponse(intent, entities, userMessage);
      
      // Add assistant response to conversation history
      const assistantMsg: ConversationMessage = {
        id: `msg_${Date.now() + 1}`,
        timestamp: Date.now(),
        role: 'assistant',
        content: response.message,
        type: response.actions && response.actions.length > 0 ? 'command' : 'text',
        metadata: {
          confidence: response.confidence,
          actionTaken: response.actions?.[0]?.type
        }
      };
      this.context.conversationHistory.push(assistantMsg);

      return response;
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        message: "I encountered an error processing your request. Please try again.",
        confidence: 0.1
      };
    }
  }

  private classifyIntent(message: string): string {
    const scores: Record<string, number> = {};
    
    for (const [intent, patterns] of this.intentClassifier.entries()) {
      let score = 0;
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          score += 1;
        }
      }
      scores[intent] = score / patterns.length;
    }
    
    // Find highest scoring intent
    let bestIntent = 'help';
    let bestScore = 0;
    
    for (const [intent, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }
    
    return bestScore > 0.3 ? bestIntent : 'help';
  }

  private extractEntities(message: string): Record<string, string[]> {
    const entities: Record<string, string[]> = {};
    
    for (const [entityType, patterns] of this.entityExtractor.entries()) {
      entities[entityType] = [];
      
      for (const pattern of patterns) {
        const matches = message.match(pattern);
        if (matches) {
          entities[entityType].push(...matches);
        }
      }
    }
    
    return entities;
  }

  private async generateResponse(
    intent: string,
    entities: Record<string, string[]>,
    originalMessage: string
  ): Promise<AIResponse> {
    switch (intent) {
      case 'create_model':
        return await this.handleCreateModel(entities, originalMessage);
      
      case 'modify_object':
        return await this.handleModifyObject(entities, originalMessage);
      
      case 'analyze_design':
        return await this.handleAnalyzeDesign(entities, originalMessage);
      
      case 'optimize':
        return await this.handleOptimize(entities, originalMessage);
      
      case 'simulate':
        return await this.handleSimulate(entities, originalMessage);
      
      case 'help':
        return this.handleHelp(entities, originalMessage);
      
      default:
        return this.handleUnknown(originalMessage);
    }
  }

  private async handleCreateModel(
    entities: Record<string, string[]>,
    message: string
  ): Promise<AIResponse> {
    try {
      // Extract model parameters from entities
      const shapes = entities.shapes || [];
      const materials = entities.materials || [];
      const dimensions = entities.dimensions || [];
      
      // Determine shape
      let shape = 'box'; // default
      if (shapes.length > 0) {
        shape = shapes[0].toLowerCase();
      }
      
      // Determine material
      let material = 'metal'; // default
      if (materials.length > 0) {
        material = materials[0].toLowerCase();
      }
      
      // Create AI model request
      const request: AIModelRequest = {
        prompt: message,
        style: this.determineStyle(message),
        complexity: this.determineComplexity(message),
        constraints: {
          materialType: material,
          manufacturingMethod: this.determineManufacturingMethod(message)
        }
      };
      
      // Add dimensions if specified
      if (dimensions.length > 0) {
        request.constraints!.maxDimensions = this.parseDimensions(dimensions[0]);
      }
      
      const action: AIAction = {
        type: 'create_model',
        parameters: request,
        description: `Create a ${material} ${shape} based on your specifications`,
        estimatedTime: 5000 // 5 seconds
      };
      
      const template = this.getRandomTemplate('create_model');
      const responseMessage = template
        .replace('{shape}', shape)
        .replace('{material}', material)
        .replace('{dimensions}', dimensions.join(', ') || 'default size');
      
      return {
        message: responseMessage,
        actions: [action],
        suggestions: [
          "Would you like me to add any specific features?",
          "Should I optimize this for a particular use case?",
          "Would you like to see different material options?"
        ],
        followUpQuestions: [
          "What will this part be used for?",
          "Are there any specific requirements I should know about?"
        ],
        confidence: 0.8
      };
    } catch (error) {
      return {
        message: "I had trouble understanding your model requirements. Could you provide more details?",
        confidence: 0.3
      };
    }
  }

  private async handleModifyObject(
    entities: Record<string, string[]>,
    message: string
  ): Promise<AIResponse> {
    if (this.context.selectedObjects.length === 0) {
      return {
        message: "Please select an object first, then tell me how you'd like to modify it.",
        suggestions: [
          "Click on an object to select it",
          "Use Ctrl+A to select all objects",
          "Tell me which object you want to modify"
        ],
        confidence: 0.9
      };
    }
    
    const action: AIAction = {
      type: 'modify_object',
      parameters: {
        objectIds: this.context.selectedObjects,
        modifications: this.parseModifications(message)
      },
      description: `Modify selected object(s) as requested`,
      estimatedTime: 2000
    };
    
    return {
      message: "I'll modify the selected object according to your instructions.",
      actions: [action],
      confidence: 0.7
    };
  }

  private async handleAnalyzeDesign(
    entities: Record<string, string[]>,
    message: string
  ): Promise<AIResponse> {
    if (this.context.selectedObjects.length === 0) {
      return {
        message: "Please select an object to analyze, or I can analyze the entire design.",
        suggestions: [
          "Select a specific component to analyze",
          "Say 'analyze everything' for full design analysis",
          "Tell me what aspect you want me to check"
        ],
        confidence: 0.8
      };
    }
    
    const action: AIAction = {
      type: 'analyze_design',
      parameters: {
        objectIds: this.context.selectedObjects,
        analysisType: this.determineAnalysisType(message)
      },
      description: `Analyze design for ${this.determineAnalysisType(message)}`,
      estimatedTime: 3000
    };
    
    return {
      message: `Analyzing your design for ${this.determineAnalysisType(message)}. This may take a moment.`,
      actions: [action],
      confidence: 0.8
    };
  }

  private async handleOptimize(
    entities: Record<string, string[]>,
    message: string
  ): Promise<AIResponse> {
    const objectives = this.parseOptimizationObjectives(message);
    
    const request: AIOptimizationRequest = {
      objectId: this.context.selectedObjects[0] || 'all',
      objectives,
      constraints: {
        preserveVolume: message.includes('preserve') || message.includes('maintain'),
        maintainConnections: true
      }
    };
    
    const action: AIAction = {
      type: 'optimize',
      parameters: request,
      description: `Optimize design for ${Object.keys(objectives).join(', ')}`,
      estimatedTime: 8000
    };
    
    return {
      message: `I'll analyze your design and suggest optimizations for ${Object.keys(objectives).join(', ')}.`,
      actions: [action],
      confidence: 0.7
    };
  }

  private async handleSimulate(
    entities: Record<string, string[]>,
    message: string
  ): Promise<AIResponse> {
    const simulationType = this.determineSimulationType(message);
    
    const action: AIAction = {
      type: 'simulate',
      parameters: {
        type: simulationType,
        objectIds: this.context.selectedObjects
      },
      description: `Run ${simulationType} simulation`,
      estimatedTime: 10000
    };
    
    return {
      message: `Setting up ${simulationType} simulation. This will take a few moments to complete.`,
      actions: [action],
      suggestions: [
        "Make sure boundary conditions are properly defined",
        "Check that materials are assigned correctly",
        "Verify mesh quality before running"
      ],
      confidence: 0.8
    };
  }

  private handleHelp(entities: Record<string, string[]>, message: string): AIResponse {
    const helpTopics = {
      'create': 'I can help you create 3D models using natural language. Just describe what you want!',
      'modify': 'To modify objects, select them first, then tell me what changes you want to make.',
      'analyze': 'I can analyze your designs for strength, quality, and potential issues.',
      'optimize': 'I can suggest improvements to make your designs lighter, stronger, or more cost-effective.',
      'simulate': 'I can run various simulations including structural, thermal, and fluid analysis.',
      'materials': 'I know about various materials and can suggest the best one for your application.',
      'export': 'I can help you export your designs in various formats for manufacturing.'
    };
    
    // Find relevant help topic
    let helpContent = "I'm your AI design assistant! I can help you with:";
    for (const [topic, content] of Object.entries(helpTopics)) {
      if (message.toLowerCase().includes(topic)) {
        helpContent = content;
        break;
      }
    }
    
    if (helpContent === "I'm your AI design assistant! I can help you with:") {
      helpContent += "\n" + Object.values(helpTopics).join("\n");
    }
    
    return {
      message: helpContent,
      suggestions: [
        "Try saying 'create a gear with 20 teeth'",
        "Ask me to 'analyze this design for strength'",
        "Say 'optimize this for weight reduction'"
      ],
      confidence: 0.9
    };
  }

  private handleUnknown(message: string): AIResponse {
    const template = this.getRandomTemplate('error');
    
    return {
      message: template,
      suggestions: [
        "Try describing what you want to create",
        "Ask me to analyze or optimize your design",
        "Say 'help' to see what I can do"
      ],
      followUpQuestions: [
        "What would you like to work on?",
        "Are you trying to create, modify, or analyze something?"
      ],
      confidence: 0.2
    };
  }

  // Utility methods
  private getRandomTemplate(category: string): string {
    const templates = this.responseTemplates.get(category) || ['I can help you with that.'];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private determineStyle(message: string): 'mechanical' | 'organic' | 'architectural' | 'electronic' | 'artistic' {
    if (/electronic|circuit|pcb/i.test(message)) return 'electronic';
    if (/building|house|structure/i.test(message)) return 'architectural';
    if (/organic|natural|curved/i.test(message)) return 'organic';
    if (/artistic|decorative|aesthetic/i.test(message)) return 'artistic';
    return 'mechanical';
  }

  private determineComplexity(message: string): 'simple' | 'medium' | 'complex' | 'expert' {
    if (/simple|basic|easy/i.test(message)) return 'simple';
    if (/complex|advanced|detailed/i.test(message)) return 'complex';
    if (/expert|professional|precision/i.test(message)) return 'expert';
    return 'medium';
  }

  private determineManufacturingMethod(message: string): 'additive' | 'subtractive' | 'casting' | 'molding' {
    if (/3d.?print|additive|print/i.test(message)) return 'additive';
    if (/machine|mill|lathe|cnc/i.test(message)) return 'subtractive';
    if (/cast|casting|foundry/i.test(message)) return 'casting';
    if (/mold|molding|injection/i.test(message)) return 'molding';
    return 'additive'; // default for prototyping
  }

  private parseDimensions(dimensionString: string): { x: number; y: number; z: number } {
    const match = dimensionString.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
    if (match) {
      return {
        x: parseFloat(match[1]),
        y: parseFloat(match[2]),
        z: parseFloat(match[3])
      };
    }
    
    // Single dimension - assume cube
    const singleMatch = dimensionString.match(/(\d+(?:\.\d+)?)/);
    if (singleMatch) {
      const size = parseFloat(singleMatch[1]);
      return { x: size, y: size, z: size };
    }
    
    return { x: 10, y: 10, z: 10 }; // default
  }

  private parseModifications(message: string): Record<string, any> {
    const modifications: Record<string, any> = {};
    
    if (/move|translate|position/i.test(message)) {
      modifications.translate = true;
    }
    
    if (/rotate|turn|spin/i.test(message)) {
      modifications.rotate = true;
    }
    
    if (/scale|resize|size/i.test(message)) {
      modifications.scale = true;
    }
    
    if (/color|material|appearance/i.test(message)) {
      modifications.material = true;
    }
    
    return modifications;
  }

  private determineAnalysisType(message: string): string {
    if (/stress|strength|structural/i.test(message)) return 'structural';
    if (/thermal|heat|temperature/i.test(message)) return 'thermal';
    if (/fluid|flow|aerodynamic/i.test(message)) return 'fluid';
    if (/vibration|modal|frequency/i.test(message)) return 'modal';
    if (/quality|overall|general/i.test(message)) return 'general';
    return 'general';
  }

  private parseOptimizationObjectives(message: string): Record<string, boolean> {
    const objectives: Record<string, boolean> = {};
    
    if (/weight|lighter|mass/i.test(message)) {
      objectives.minimizeWeight = true;
    }
    
    if (/strength|stronger|stress/i.test(message)) {
      objectives.maximizeStrength = true;
    }
    
    if (/cost|cheaper|economical/i.test(message)) {
      objectives.minimizeCost = true;
    }
    
    if (/aerodynamic|airflow|drag/i.test(message)) {
      objectives.improveAerodynamics = true;
    }
    
    if (/heat|thermal|cooling/i.test(message)) {
      objectives.optimizeHeatTransfer = true;
    }
    
    return objectives;
  }

  private determineSimulationType(message: string): string {
    if (/structural|stress|strength/i.test(message)) return 'structural';
    if (/thermal|heat|temperature/i.test(message)) return 'thermal';
    if (/fluid|flow|cfd/i.test(message)) return 'fluid';
    if (/modal|vibration|frequency/i.test(message)) return 'modal';
    return 'structural';
  }

  // Context management
  setActiveMode(mode: 'cad' | 'pcb' | 'schematic' | 'simulation'): void {
    this.context.activeMode = mode;
  }

  setSelectedObjects(objectIds: string[]): void {
    this.context.selectedObjects = objectIds;
  }

  getContext(): ConversationContext {
    return this.context;
  }

  clearHistory(): void {
    this.context.conversationHistory = [];
  }

  exportConversation(): string {
    return JSON.stringify(this.context.conversationHistory, null, 2);
  }
}

