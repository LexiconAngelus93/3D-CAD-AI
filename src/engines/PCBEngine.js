export class PCBEngine {
  constructor() {
    this.components = []
    this.traces = []
    this.layers = ['Top', 'Bottom', 'Power', 'Ground']
    this.currentLayer = 'Top'
    this.gridSize = 0.1 // 0.1mm grid
    this.designRules = {
      minTraceWidth: 0.1,
      minViaSize: 0.2,
      minClearance: 0.1,
      maxCurrentDensity: 35 // A/mm²
    }
    this.componentLibrary = this.initializeComponentLibrary()
  }

  initializeComponentLibrary() {
    return {
      resistors: [
        { name: 'R_0603', package: '0603', pins: 2, width: 1.6, height: 0.8 },
        { name: 'R_0805', package: '0805', pins: 2, width: 2.0, height: 1.25 },
        { name: 'R_1206', package: '1206', pins: 2, width: 3.2, height: 1.6 }
      ],
      capacitors: [
        { name: 'C_0603', package: '0603', pins: 2, width: 1.6, height: 0.8 },
        { name: 'C_0805', package: '0805', pins: 2, width: 2.0, height: 1.25 },
        { name: 'C_1206', package: '1206', pins: 2, width: 3.2, height: 1.6 }
      ],
      ics: [
        { name: 'SOIC8', package: 'SOIC-8', pins: 8, width: 5.0, height: 4.0 },
        { name: 'QFP32', package: 'LQFP-32', pins: 32, width: 7.0, height: 7.0 },
        { name: 'BGA64', package: 'BGA-64', pins: 64, width: 8.0, height: 8.0 }
      ],
      connectors: [
        { name: 'USB_C', package: 'USB-C', pins: 24, width: 8.94, height: 7.35 },
        { name: 'Header_2x5', package: 'Header-2x5', pins: 10, width: 12.7, height: 5.08 }
      ]
    }
  }

  addComponent(type, subtype, position, rotation = 0, properties = {}) {
    const library = this.componentLibrary[type]
    if (!library) {
      throw new Error(`Component type ${type} not found in library`)
    }

    const componentDef = library.find(comp => comp.name === subtype)
    if (!componentDef) {
      throw new Error(`Component ${subtype} not found in ${type} library`)
    }

    const component = {
      id: Date.now() + Math.random(),
      type: type,
      subtype: subtype,
      name: `${subtype}_${this.components.length + 1}`,
      position: { x: position.x, y: position.y },
      rotation: rotation,
      layer: this.currentLayer,
      properties: {
        ...componentDef,
        ...properties
      },
      pins: this.generatePins(componentDef, position, rotation),
      visible: true
    }

    this.components.push(component)
    return component
  }

  generatePins(componentDef, position, rotation) {
    const pins = []
    const { pins: pinCount, width, height, package: packageType } = componentDef

    switch (packageType) {
      case '0603':
      case '0805':
      case '1206':
        // Two-pin components (resistors, capacitors)
        pins.push(
          { 
            id: 1, 
            position: { 
              x: position.x - width/2, 
              y: position.y 
            }, 
            connected: false 
          },
          { 
            id: 2, 
            position: { 
              x: position.x + width/2, 
              y: position.y 
            }, 
            connected: false 
          }
        )
        break

      case 'SOIC-8':
        // 8-pin SOIC
        for (let i = 0; i < 4; i++) {
          pins.push({
            id: i + 1,
            position: {
              x: position.x - width/2,
              y: position.y - 1.5 + i
            },
            connected: false
          })
          pins.push({
            id: i + 5,
            position: {
              x: position.x + width/2,
              y: position.y + 1.5 - i
            },
            connected: false
          })
        }
        break

      case 'LQFP-32':
        // 32-pin LQFP
        const pinSpacing = 0.8
        for (let i = 0; i < 8; i++) {
          // Bottom pins
          pins.push({
            id: i + 1,
            position: {
              x: position.x - 2.8 + i * pinSpacing,
              y: position.y - height/2
            },
            connected: false
          })
          // Right pins
          pins.push({
            id: i + 9,
            position: {
              x: position.x + width/2,
              y: position.y - 2.8 + i * pinSpacing
            },
            connected: false
          })
          // Top pins
          pins.push({
            id: i + 17,
            position: {
              x: position.x + 2.8 - i * pinSpacing,
              y: position.y + height/2
            },
            connected: false
          })
          // Left pins
          pins.push({
            id: i + 25,
            position: {
              x: position.x - width/2,
              y: position.y + 2.8 - i * pinSpacing
            },
            connected: false
          })
        }
        break

      default:
        // Generic pin layout
        for (let i = 0; i < pinCount; i++) {
          pins.push({
            id: i + 1,
            position: {
              x: position.x + (i % 2 === 0 ? -width/2 : width/2),
              y: position.y + (Math.floor(i/2) - pinCount/4) * 1.27
            },
            connected: false
          })
        }
    }

    return pins
  }

  addTrace(startPin, endPin, width = this.designRules.minTraceWidth, layer = this.currentLayer) {
    const trace = {
      id: Date.now() + Math.random(),
      startPin: startPin,
      endPin: endPin,
      width: width,
      layer: layer,
      path: this.calculateTracePath(startPin.position, endPin.position),
      visible: true
    }

    // Mark pins as connected
    startPin.connected = true
    endPin.connected = true

    this.traces.push(trace)
    return trace
  }

  calculateTracePath(start, end) {
    // Simple Manhattan routing for now
    const path = [
      { x: start.x, y: start.y },
      { x: start.x, y: end.y },
      { x: end.x, y: end.y }
    ]
    return path
  }

  autoRoute() {
    // Simple auto-routing algorithm
    const unconnectedPins = this.getAllUnconnectedPins()
    const connections = this.findOptimalConnections(unconnectedPins)

    connections.forEach(connection => {
      this.addTrace(connection.pin1, connection.pin2)
    })

    return connections.length
  }

  getAllUnconnectedPins() {
    const pins = []
    this.components.forEach(component => {
      component.pins.forEach(pin => {
        if (!pin.connected) {
          pins.push({ component: component, pin: pin })
        }
      })
    })
    return pins
  }

  findOptimalConnections(pins) {
    // Simple nearest neighbor algorithm
    const connections = []
    const used = new Set()

    for (let i = 0; i < pins.length; i++) {
      if (used.has(i)) continue

      let nearestIndex = -1
      let nearestDistance = Infinity

      for (let j = i + 1; j < pins.length; j++) {
        if (used.has(j)) continue

        const distance = this.calculateDistance(
          pins[i].pin.position,
          pins[j].pin.position
        )

        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestIndex = j
        }
      }

      if (nearestIndex !== -1) {
        connections.push({
          pin1: pins[i].pin,
          pin2: pins[nearestIndex].pin,
          distance: nearestDistance
        })
        used.add(i)
        used.add(nearestIndex)
      }
    }

    return connections
  }

  calculateDistance(pos1, pos2) {
    return Math.sqrt(
      Math.pow(pos2.x - pos1.x, 2) + 
      Math.pow(pos2.y - pos1.y, 2)
    )
  }

  runDesignRuleCheck() {
    const violations = []

    // Check trace width violations
    this.traces.forEach(trace => {
      if (trace.width < this.designRules.minTraceWidth) {
        violations.push({
          type: 'trace_width',
          message: `Trace width ${trace.width}mm is below minimum ${this.designRules.minTraceWidth}mm`,
          trace: trace
        })
      }
    })

    // Check component clearance violations
    for (let i = 0; i < this.components.length; i++) {
      for (let j = i + 1; j < this.components.length; j++) {
        const comp1 = this.components[i]
        const comp2 = this.components[j]
        
        const distance = this.calculateDistance(comp1.position, comp2.position)
        const minDistance = (comp1.properties.width + comp2.properties.width) / 2 + this.designRules.minClearance

        if (distance < minDistance) {
          violations.push({
            type: 'component_clearance',
            message: `Components ${comp1.name} and ${comp2.name} are too close`,
            components: [comp1, comp2]
          })
        }
      }
    }

    return violations
  }

  generateGerberFiles() {
    const gerberFiles = {}

    this.layers.forEach(layer => {
      const layerComponents = this.components.filter(comp => comp.layer === layer)
      const layerTraces = this.traces.filter(trace => trace.layer === layer)

      gerberFiles[layer] = {
        header: this.generateGerberHeader(),
        apertures: this.generateApertures(),
        components: this.generateComponentGerber(layerComponents),
        traces: this.generateTraceGerber(layerTraces),
        footer: 'M02*' // End of file
      }
    })

    // Generate drill file
    gerberFiles.drill = this.generateDrillFile()

    return gerberFiles
  }

  generateGerberHeader() {
    return [
      'G04 Generated by 3D CAD AI PCB Engine*',
      'G04 Creation date: ' + new Date().toISOString() + '*',
      '%FSLAX26Y26*%',
      '%MOMM*%',
      'G04 Aperture definitions*'
    ].join('\n')
  }

  generateApertures() {
    return [
      '%ADD10C,0.100000*%', // 0.1mm circle
      '%ADD11C,0.200000*%', // 0.2mm circle
      '%ADD12R,1.600000X0.800000*%', // 0603 rectangle
      '%ADD13R,2.000000X1.250000*%', // 0805 rectangle
    ].join('\n')
  }

  generateComponentGerber(components) {
    let gerber = 'G04 Components*\n'
    
    components.forEach(component => {
      component.pins.forEach(pin => {
        const x = Math.round(pin.position.x * 1000000) // Convert to Gerber units
        const y = Math.round(pin.position.y * 1000000)
        gerber += `D10*\nX${x}Y${y}D03*\n`
      })
    })

    return gerber
  }

  generateTraceGerber(traces) {
    let gerber = 'G04 Traces*\n'
    
    traces.forEach(trace => {
      gerber += 'D11*\n' // Select aperture
      trace.path.forEach((point, index) => {
        const x = Math.round(point.x * 1000000)
        const y = Math.round(point.y * 1000000)
        const command = index === 0 ? 'D02' : 'D01' // Move or draw
        gerber += `X${x}Y${y}${command}*\n`
      })
    })

    return gerber
  }

  generateDrillFile() {
    let drill = 'M48\n' // Header
    drill += 'METRIC,TZ\n'
    drill += 'T01C0.200\n' // Tool definition
    drill += '%\n'
    drill += 'G05\n'
    drill += 'T01\n'

    // Add drill holes for vias and component holes
    this.components.forEach(component => {
      component.pins.forEach(pin => {
        const x = pin.position.x.toFixed(3)
        const y = pin.position.y.toFixed(3)
        drill += `X${x}Y${y}\n`
      })
    })

    drill += 'M30\n' // End of program
    return drill
  }

  exportPCB() {
    return {
      components: this.components,
      traces: this.traces,
      layers: this.layers,
      designRules: this.designRules,
      gerberFiles: this.generateGerberFiles()
    }
  }

  importPCB(pcbData) {
    this.components = pcbData.components || []
    this.traces = pcbData.traces || []
    this.layers = pcbData.layers || this.layers
    this.designRules = { ...this.designRules, ...pcbData.designRules }
  }

  getStats() {
    return {
      componentCount: this.components.length,
      traceCount: this.traces.length,
      layerCount: this.layers.length,
      connectedPins: this.components.reduce((total, comp) => 
        total + comp.pins.filter(pin => pin.connected).length, 0
      ),
      totalPins: this.components.reduce((total, comp) => total + comp.pins.length, 0)
    }
  }
}

