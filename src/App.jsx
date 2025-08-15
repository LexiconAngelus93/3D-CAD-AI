import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { 
  Box, 
  Cylinder, 
  Circle, 
  Torus,
  Play,
  Download,
  Upload,
  Settings,
  Eye,
  EyeOff,
  Trash2,
  Cpu,
  Zap,
  Brain,
  BarChart3
} from 'lucide-react'
import { CADEngine } from './engines/CADEngine.js'
import { AIEngine } from './engines/AIEngine.js'
import { PCBEngine } from './engines/PCBEngine.js'
import { SimulationEngine } from './engines/SimulationEngine.js'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('cad')
  const [objects, setObjects] = useState([])
  const [aiCommand, setAiCommand] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({})
  const [simulationResults, setSimulationResults] = useState(null)
  const [webglStatus, setWebglStatus] = useState('Initializing...')
  
  const viewportRef = useRef(null)
  const cadEngineRef = useRef(null)
  const aiEngineRef = useRef(null)
  const pcbEngineRef = useRef(null)
  const simulationEngineRef = useRef(null)

  useEffect(() => {
    const initializeEngines = async () => {
      if (viewportRef.current && !cadEngineRef.current) {
        try {
          setWebglStatus('Initializing WebGL...')
          
          // Initialize CAD engine
          cadEngineRef.current = new CADEngine()
          await cadEngineRef.current.initialize(viewportRef.current)
          
          // Initialize other engines
          aiEngineRef.current = new AIEngine(cadEngineRef.current)
          pcbEngineRef.current = new PCBEngine()
          simulationEngineRef.current = new SimulationEngine()

          setWebglStatus('WebGL Ready')
          updateStats()

          console.log('All engines initialized successfully')
        } catch (error) {
          console.error('Engine initialization failed:', error)
          setWebglStatus('WebGL Failed')
        }
      }
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initializeEngines, 100)
    
    return () => {
      clearTimeout(timer)
      if (cadEngineRef.current) {
        cadEngineRef.current.dispose()
      }
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (cadEngineRef.current && viewportRef.current) {
        cadEngineRef.current.resize(
          viewportRef.current.clientWidth,
          viewportRef.current.clientHeight
        )
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const updateStats = () => {
    if (cadEngineRef.current) {
      setObjects([...cadEngineRef.current.objects])
      setStats({
        objects: cadEngineRef.current.objects.length,
        pcb: pcbEngineRef.current?.getStats() || {},
        simulation: simulationEngineRef.current?.getStats() || {},
        ai: aiEngineRef.current?.getStats() || {}
      })
    }
  }

  const createPrimitive = (type) => {
    if (!cadEngineRef.current) {
      console.warn('CAD Engine not initialized')
      return
    }

    let newObject
    try {
      switch (type) {
        case 'box':
          newObject = cadEngineRef.current.createBox()
          break
        case 'cylinder':
          newObject = cadEngineRef.current.createCylinder()
          break
        case 'sphere':
          newObject = cadEngineRef.current.createSphere()
          break
        case 'torus':
          newObject = cadEngineRef.current.createTorus()
          break
        default:
          console.warn('Unknown primitive type:', type)
          return
      }

      if (newObject) {
        updateStats()
        console.log(`Created ${type}:`, newObject.name)
      }
    } catch (error) {
      console.error(`Failed to create ${type}:`, error)
    }
  }

  const toggleObjectVisibility = (id) => {
    if (cadEngineRef.current) {
      cadEngineRef.current.toggleObjectVisibility(id)
      updateStats()
    }
  }

  const deleteObject = (id) => {
    if (cadEngineRef.current) {
      cadEngineRef.current.deleteObject(id)
      updateStats()
    }
  }

  const handleAICommand = async () => {
    if (!aiCommand.trim() || !aiEngineRef.current) return

    setIsLoading(true)
    try {
      const result = aiEngineRef.current.processCommand(aiCommand)
      setAiResponse(`✅ Created: ${result.name} (${result.type})`)
      setAiCommand('')
      updateStats()
    } catch (error) {
      setAiResponse(`❌ Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const runSimulation = async (type) => {
    if (!simulationEngineRef.current || objects.length === 0) return

    setIsLoading(true)
    try {
      // Generate mesh for the first object
      const firstObject = objects[0]
      if (firstObject && firstObject.mesh) {
        simulationEngineRef.current.generateMesh(firstObject.mesh.geometry)
      }

      let results
      switch (type) {
        case 'structural':
          results = simulationEngineRef.current.runStructuralAnalysis()
          break
        case 'thermal':
          results = simulationEngineRef.current.runThermalAnalysis()
          break
        case 'fluid':
          results = simulationEngineRef.current.runFluidAnalysis()
          break
        case 'modal':
          results = simulationEngineRef.current.runModalAnalysis()
          break
      }

      setSimulationResults(results)
    } catch (error) {
      console.error('Simulation error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addPCBComponent = (type, subtype) => {
    if (!pcbEngineRef.current) return

    try {
      const position = { 
        x: Math.random() * 20 - 10, 
        y: Math.random() * 20 - 10 
      }
      pcbEngineRef.current.addComponent(type, subtype, position)
      updateStats()
    } catch (error) {
      console.error('PCB component error:', error)
    }
  }

  const exportScene = () => {
    if (cadEngineRef.current) {
      const sceneData = cadEngineRef.current.exportScene()
      const blob = new Blob([JSON.stringify(sceneData, null, 2)], { 
        type: 'application/json' 
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = '3d-cad-scene.json'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const exportSTL = () => {
    if (cadEngineRef.current && objects.length > 0) {
      // Simple STL export simulation
      const stlData = `solid CADModel
${objects.map(obj => `  facet normal 0 0 1
    outer loop
      vertex 0 0 0
      vertex 1 0 0
      vertex 0 1 0
    endloop
  endfacet`).join('\n')}
endsolid CADModel`
      
      const blob = new Blob([stlData], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'cad-model.stl'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const exportOBJ = () => {
    if (cadEngineRef.current && objects.length > 0) {
      // Simple OBJ export simulation
      const objData = `# CAD Model Export
${objects.map((obj, i) => `
o ${obj.name}
v 0 0 0
v 1 0 0
v 0 1 0
f 1 2 3`).join('\n')}`
      
      const blob = new Blob([objData], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'cad-model.obj'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">3D CAD AI - Advanced Computer-Aided Design</h1>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary">Objects: {stats.objects || 0}</Badge>
            <Badge variant={webglStatus === 'WebGL Ready' ? 'default' : 'destructive'}>
              {webglStatus}
            </Badge>
            <Button variant="outline" size="sm" onClick={exportSTL}>
              <Download className="w-4 h-4 mr-2" />
              Export STL
            </Button>
            <Button variant="outline" size="sm" onClick={exportOBJ}>
              <Download className="w-4 h-4 mr-2" />
              Export OBJ
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="cad">CAD</TabsTrigger>
              <TabsTrigger value="ai">AI</TabsTrigger>
              <TabsTrigger value="pcb">PCB</TabsTrigger>
              <TabsTrigger value="sim">SIM</TabsTrigger>
            </TabsList>

            <TabsContent value="cad" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Primitives</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    onClick={() => createPrimitive('box')} 
                    className="w-full justify-start"
                    disabled={webglStatus !== 'WebGL Ready'}
                  >
                    <Box className="w-4 h-4 mr-2" />
                    Box
                  </Button>
                  <Button 
                    onClick={() => createPrimitive('cylinder')} 
                    className="w-full justify-start"
                    disabled={webglStatus !== 'WebGL Ready'}
                  >
                    <Cylinder className="w-4 h-4 mr-2" />
                    Cylinder
                  </Button>
                  <Button 
                    onClick={() => createPrimitive('sphere')} 
                    className="w-full justify-start"
                    disabled={webglStatus !== 'WebGL Ready'}
                  >
                    <Circle className="w-4 h-4 mr-2" />
                    Sphere
                  </Button>
                  <Button 
                    onClick={() => createPrimitive('torus')} 
                    className="w-full justify-start"
                    disabled={webglStatus !== 'WebGL Ready'}
                  >
                    <Torus className="w-4 h-4 mr-2" />
                    Torus
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Objects ({objects.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {objects.length === 0 ? (
                      <p className="text-gray-400 text-sm">No objects created yet</p>
                    ) : (
                      objects.map((obj) => (
                        <div key={obj.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                          <span className="text-sm">{obj.name}</span>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleObjectVisibility(obj.id)}
                            >
                              {obj.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteObject(obj.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">AI Assistant</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="Describe what to create..."
                      value={aiCommand}
                      onChange={(e) => setAiCommand(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAICommand()}
                      disabled={webglStatus !== 'WebGL Ready'}
                    />
                    <Button 
                      onClick={handleAICommand} 
                      disabled={isLoading || !aiCommand.trim() || webglStatus !== 'WebGL Ready'}
                      className="w-full"
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      {isLoading ? 'Generating...' : 'Generate'}
                    </Button>
                  </div>
                  
                  {aiResponse && (
                    <div className="p-3 bg-gray-700 rounded text-sm">
                      {aiResponse}
                    </div>
                  )}

                  <div className="text-xs text-gray-400">
                    <p>Try commands like:</p>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>"create a red box"</li>
                      <li>"make a blue cylinder"</li>
                      <li>"add a large green sphere"</li>
                      <li>"create a small torus at center"</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pcb" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">PCB Components</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    onClick={() => addPCBComponent('resistors', 'R_0603')} 
                    className="w-full justify-start"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Resistor 0603
                  </Button>
                  <Button 
                    onClick={() => addPCBComponent('capacitors', 'C_0805')} 
                    className="w-full justify-start"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Capacitor 0805
                  </Button>
                  <Button 
                    onClick={() => addPCBComponent('ics', 'SOIC8')} 
                    className="w-full justify-start"
                  >
                    <Cpu className="w-4 h-4 mr-2" />
                    IC SOIC-8
                  </Button>
                  <Button 
                    onClick={() => addPCBComponent('connectors', 'USB_C')} 
                    className="w-full justify-start"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    USB-C Connector
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">PCB Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>Components: {stats.pcb?.componentCount || 0}</div>
                    <div>Traces: {stats.pcb?.traceCount || 0}</div>
                    <div>Layers: {stats.pcb?.layerCount || 0}</div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sim" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Simulation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    onClick={() => runSimulation('structural')} 
                    disabled={isLoading || objects.length === 0}
                    className="w-full justify-start"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Structural Analysis
                  </Button>
                  <Button 
                    onClick={() => runSimulation('thermal')} 
                    disabled={isLoading || objects.length === 0}
                    className="w-full justify-start"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Thermal Analysis
                  </Button>
                  <Button 
                    onClick={() => runSimulation('fluid')} 
                    disabled={isLoading || objects.length === 0}
                    className="w-full justify-start"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Fluid Analysis
                  </Button>
                  <Button 
                    onClick={() => runSimulation('modal')} 
                    disabled={isLoading || objects.length === 0}
                    className="w-full justify-start"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Modal Analysis
                  </Button>
                </CardContent>
              </Card>

              {simulationResults && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div>Type: {simulationResults.type}</div>
                      {simulationResults.maxStress && (
                        <div>Max Stress: {simulationResults.maxStress.toFixed(2)} Pa</div>
                      )}
                      {simulationResults.maxTemperature && (
                        <div>Max Temp: {simulationResults.maxTemperature.toFixed(1)} °C</div>
                      )}
                      {simulationResults.maxVelocity && (
                        <div>Max Velocity: {simulationResults.maxVelocity.toFixed(2)} m/s</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Viewport */}
        <div className="flex-1 relative">
          <div 
            ref={viewportRef} 
            className="w-full h-full bg-gray-900"
            style={{ minHeight: '400px' }}
          >
            {webglStatus !== 'WebGL Ready' && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center">
                  <div className="text-6xl mb-4">🖥️</div>
                  <div className="text-xl font-semibold mb-2">{webglStatus}</div>
                  <div className="text-gray-400">
                    {webglStatus === 'Initializing...' && 'Setting up 3D viewport...'}
                    {webglStatus === 'WebGL Ready' && '3D viewport ready for CAD operations'}
                    {webglStatus === 'WebGL Failed' && 'Failed to initialize WebGL. Please check browser support.'}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Viewport Controls */}
          <div className="absolute bottom-4 right-4 flex space-x-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                if (cadEngineRef.current) {
                  cadEngineRef.current.camera.position.set(10, 10, 10)
                  cadEngineRef.current.camera.lookAt(0, 0, 0)
                }
              }}
            >
              Reset View
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                // Fit all objects in view
                console.log('Fit to view')
              }}
            >
              Fit All
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

