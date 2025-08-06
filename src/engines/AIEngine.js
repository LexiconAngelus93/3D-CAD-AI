export class AIEngine {
  constructor(cadEngine) {
    this.cadEngine = cadEngine
    this.commandHistory = []
    this.patterns = {
      // Shape patterns
      box: /\b(box|cube|rectangular|square|block)\b/i,
      cylinder: /\b(cylinder|tube|pipe|column|rod)\b/i,
      sphere: /\b(sphere|ball|globe|orb|round)\b/i,
      torus: /\b(torus|donut|ring|doughnut)\b/i,
      
      // Color patterns
      red: /\b(red|crimson|scarlet)\b/i,
      green: /\b(green|emerald|lime)\b/i,
      blue: /\b(blue|azure|navy|cyan)\b/i,
      yellow: /\b(yellow|gold|amber)\b/i,
      orange: /\b(orange|tangerine)\b/i,
      purple: /\b(purple|violet|magenta)\b/i,
      pink: /\b(pink|rose)\b/i,
      white: /\b(white|ivory)\b/i,
      black: /\b(black|dark)\b/i,
      gray: /\b(gray|grey|silver)\b/i,
      
      // Size patterns
      small: /\b(small|tiny|little|mini)\b/i,
      large: /\b(large|big|huge|giant|massive)\b/i,
      medium: /\b(medium|normal|regular|standard)\b/i,
      
      // Position patterns
      center: /\b(center|middle|origin)\b/i,
      left: /\b(left|west)\b/i,
      right: /\b(right|east)\b/i,
      front: /\b(front|forward|north)\b/i,
      back: /\b(back|behind|south)\b/i,
      
      // Action patterns
      create: /\b(create|make|add|build|generate|spawn)\b/i,
      delete: /\b(delete|remove|destroy|eliminate)\b/i,
      move: /\b(move|relocate|position|place)\b/i,
      scale: /\b(scale|resize|size|enlarge|shrink)\b/i,
      rotate: /\b(rotate|turn|spin|orient)\b/i,
      
      // Number patterns
      numbers: /\b(\d+(?:\.\d+)?)\b/g
    }
    
    this.colorMap = {
      red: 0xff0000,
      green: 0x00ff00,
      blue: 0x0000ff,
      yellow: 0xffff00,
      orange: 0xff6600,
      purple: 0x800080,
      pink: 0xffc0cb,
      white: 0xffffff,
      black: 0x000000,
      gray: 0x808080,
      grey: 0x808080
    }
  }

  processCommand(command) {
    const lowerCommand = command.toLowerCase().trim()
    
    // Store command in history
    this.commandHistory.push({
      command: command,
      timestamp: new Date(),
      processed: lowerCommand
    })

    try {
      // Parse the command
      const intent = this.parseIntent(lowerCommand)
      
      // Execute the command based on intent
      return this.executeIntent(intent, lowerCommand)
    } catch (error) {
      console.error('AI Engine Error:', error)
      return this.createDefaultObject()
    }
  }

  parseIntent(command) {
    const intent = {
      action: 'create',
      shape: 'sphere',
      color: null,
      size: 'medium',
      position: null,
      properties: {}
    }

    // Determine action
    if (this.patterns.delete.test(command)) {
      intent.action = 'delete'
    } else if (this.patterns.move.test(command)) {
      intent.action = 'move'
    } else if (this.patterns.scale.test(command)) {
      intent.action = 'scale'
    } else if (this.patterns.rotate.test(command)) {
      intent.action = 'rotate'
    }

    // Determine shape
    if (this.patterns.box.test(command)) {
      intent.shape = 'box'
    } else if (this.patterns.cylinder.test(command)) {
      intent.shape = 'cylinder'
    } else if (this.patterns.sphere.test(command)) {
      intent.shape = 'sphere'
    } else if (this.patterns.torus.test(command)) {
      intent.shape = 'torus'
    }

    // Determine color
    for (const [colorName, colorValue] of Object.entries(this.colorMap)) {
      if (this.patterns[colorName] && this.patterns[colorName].test(command)) {
        intent.color = colorValue
        break
      }
    }

    // Determine size
    if (this.patterns.small.test(command)) {
      intent.size = 'small'
    } else if (this.patterns.large.test(command)) {
      intent.size = 'large'
    }

    // Extract numbers for dimensions
    const numbers = command.match(this.patterns.numbers)
    if (numbers) {
      intent.properties.numbers = numbers.map(n => parseFloat(n))
    }

    // Determine position
    if (this.patterns.center.test(command)) {
      intent.position = { x: 0, y: 0, z: 0 }
    } else if (this.patterns.left.test(command)) {
      intent.position = { x: -3, y: 0, z: 0 }
    } else if (this.patterns.right.test(command)) {
      intent.position = { x: 3, y: 0, z: 0 }
    } else if (this.patterns.front.test(command)) {
      intent.position = { x: 0, y: 0, z: 3 }
    } else if (this.patterns.back.test(command)) {
      intent.position = { x: 0, y: 0, z: -3 }
    }

    return intent
  }

  executeIntent(intent, originalCommand) {
    switch (intent.action) {
      case 'create':
        return this.createObject(intent)
      case 'delete':
        return this.deleteLastObject()
      case 'move':
        return this.moveLastObject(intent)
      case 'scale':
        return this.scaleLastObject(intent)
      case 'rotate':
        return this.rotateLastObject(intent)
      default:
        return this.createObject(intent)
    }
  }

  createObject(intent) {
    const options = this.buildObjectOptions(intent)
    
    switch (intent.shape) {
      case 'box':
        return this.cadEngine.createBox(options)
      case 'cylinder':
        return this.cadEngine.createCylinder(options)
      case 'sphere':
        return this.cadEngine.createSphere(options)
      case 'torus':
        return this.cadEngine.createTorus(options)
      default:
        return this.cadEngine.createSphere(options)
    }
  }

  buildObjectOptions(intent) {
    const options = {}

    // Set color
    if (intent.color !== null) {
      options.color = intent.color
    }

    // Set size based on intent
    const sizeMultiplier = {
      small: 0.5,
      medium: 1.0,
      large: 2.0
    }[intent.size] || 1.0

    // Set position
    if (intent.position) {
      options.position = {
        x: intent.position.x,
        y: intent.position.y + (intent.shape === 'sphere' ? 0.5 * sizeMultiplier : sizeMultiplier / 2),
        z: intent.position.z
      }
    }

    // Set dimensions based on shape and size
    switch (intent.shape) {
      case 'box':
        options.width = sizeMultiplier
        options.height = sizeMultiplier
        options.depth = sizeMultiplier
        
        // Use specific numbers if provided
        if (intent.properties.numbers && intent.properties.numbers.length >= 3) {
          options.width = intent.properties.numbers[0]
          options.height = intent.properties.numbers[1]
          options.depth = intent.properties.numbers[2]
        } else if (intent.properties.numbers && intent.properties.numbers.length === 1) {
          const size = intent.properties.numbers[0]
          options.width = options.height = options.depth = size
        }
        break

      case 'cylinder':
        options.radiusTop = 0.5 * sizeMultiplier
        options.radiusBottom = 0.5 * sizeMultiplier
        options.height = sizeMultiplier
        
        if (intent.properties.numbers && intent.properties.numbers.length >= 2) {
          options.radiusTop = options.radiusBottom = intent.properties.numbers[0]
          options.height = intent.properties.numbers[1]
        } else if (intent.properties.numbers && intent.properties.numbers.length === 1) {
          options.radiusTop = options.radiusBottom = intent.properties.numbers[0]
        }
        break

      case 'sphere':
        options.radius = 0.5 * sizeMultiplier
        
        if (intent.properties.numbers && intent.properties.numbers.length >= 1) {
          options.radius = intent.properties.numbers[0]
        }
        break

      case 'torus':
        options.radius = sizeMultiplier
        options.tube = 0.3 * sizeMultiplier
        
        if (intent.properties.numbers && intent.properties.numbers.length >= 2) {
          options.radius = intent.properties.numbers[0]
          options.tube = intent.properties.numbers[1]
        } else if (intent.properties.numbers && intent.properties.numbers.length === 1) {
          options.radius = intent.properties.numbers[0]
        }
        break
    }

    return options
  }

  deleteLastObject() {
    if (this.cadEngine.objects.length > 0) {
      const lastObject = this.cadEngine.objects[this.cadEngine.objects.length - 1]
      this.cadEngine.deleteObject(lastObject.id)
      return { action: 'deleted', object: lastObject.name }
    }
    return { action: 'no_object_to_delete' }
  }

  moveLastObject(intent) {
    if (this.cadEngine.objects.length > 0 && intent.position) {
      const lastObject = this.cadEngine.objects[this.cadEngine.objects.length - 1]
      lastObject.mesh.position.set(intent.position.x, intent.position.y, intent.position.z)
      return { action: 'moved', object: lastObject.name }
    }
    return { action: 'move_failed' }
  }

  scaleLastObject(intent) {
    if (this.cadEngine.objects.length > 0) {
      const lastObject = this.cadEngine.objects[this.cadEngine.objects.length - 1]
      const scale = intent.size === 'large' ? 1.5 : intent.size === 'small' ? 0.5 : 1.0
      
      if (intent.properties.numbers && intent.properties.numbers.length >= 1) {
        const scaleValue = intent.properties.numbers[0]
        lastObject.mesh.scale.setScalar(scaleValue)
      } else {
        lastObject.mesh.scale.setScalar(scale)
      }
      
      return { action: 'scaled', object: lastObject.name }
    }
    return { action: 'scale_failed' }
  }

  rotateLastObject(intent) {
    if (this.cadEngine.objects.length > 0) {
      const lastObject = this.cadEngine.objects[this.cadEngine.objects.length - 1]
      
      if (intent.properties.numbers && intent.properties.numbers.length >= 1) {
        const angle = (intent.properties.numbers[0] * Math.PI) / 180 // Convert to radians
        lastObject.mesh.rotation.y = angle
      } else {
        lastObject.mesh.rotation.y += Math.PI / 4 // 45 degrees
      }
      
      return { action: 'rotated', object: lastObject.name }
    }
    return { action: 'rotate_failed' }
  }

  createDefaultObject() {
    // Fallback to creating a sphere if parsing fails
    return this.cadEngine.createSphere()
  }

  generateSuggestions(partialCommand) {
    const suggestions = []
    const lower = partialCommand.toLowerCase()

    // Shape suggestions
    if (lower.includes('create') || lower.includes('make') || lower.includes('add')) {
      suggestions.push(
        'create a red box',
        'make a blue cylinder',
        'add a green sphere',
        'create a large torus',
        'make a small yellow cube'
      )
    }

    // Color suggestions
    if (this.patterns.box.test(lower) || this.patterns.cylinder.test(lower) || this.patterns.sphere.test(lower)) {
      suggestions.push(
        `${partialCommand} in red`,
        `${partialCommand} in blue`,
        `${partialCommand} in green`,
        `${partialCommand} in yellow`
      )
    }

    // Size suggestions
    if (lower.includes('box') || lower.includes('sphere') || lower.includes('cylinder')) {
      suggestions.push(
        `small ${partialCommand}`,
        `large ${partialCommand}`,
        `${partialCommand} at center`
      )
    }

    return suggestions.slice(0, 5) // Return top 5 suggestions
  }

  getCommandHistory() {
    return this.commandHistory.slice(-10) // Return last 10 commands
  }

  getStats() {
    return {
      totalCommands: this.commandHistory.length,
      objectsCreated: this.cadEngine.objects.length,
      lastCommand: this.commandHistory[this.commandHistory.length - 1]?.command || 'None'
    }
  }
}

