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
  
  const viewportRef = useRef(null)
  const cadEngineRef = useRef(null)
  const aiEngineRef = useRef(null)
  const pcbEngineRef = useRef(null)
  const simulationEngineRef = useRef(null)

  useEffect(() => {
    if (viewportRef.current && !cadEngineRef.current) {
      // Initialize engines
      cadEngineRef.current = new CADEngine()
      cadEngineRef.current.initialize(viewportRef.current)
      
      aiEngineRef.current = new AIEngine(cadEngineRef.current)
      pcbEngineRef.current = new PCBEngine()
      simulationEngineRef.current = new SimulationEngine()

      // Update stats
      updateStats()

      // Handle window resize
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
    }
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
    if (!cadEngineRef.current) return

    let newObject
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
    }

    if (newObject) {
      updateStats()
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

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">3D CAD AI - Advanced Computer-Aided Design</h1>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary">Objects: {stats.objects || 0}</Badge>
            <Button variant="outline" size="sm" onClick={exportScene}>
              <Download className="w-4 h-4 mr-2" />
              Export
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
                  >
                    <Box className="w-4 h-4 mr-2" />
                    Box
                  </Button>
                  <Button 
                    onClick={() => createPrimitive('cylinder')} 
                    className="w-full justify-start"
                  >
                    <Cylinder className="w-4 h-4 mr-2" />
                    Cylinder
                  </Button>
                  <Button 
                    onClick={() => createPrimitive('sphere')} 
                    className="w-full justify-start"
                  >
                    <Circle className="w-4 h-4 mr-2" />
                    Sphere
                  </Button>
                  <Button 
                    onClick={() => createPrimitive('torus')} 
                    className="w-full justify-start"
                  >
                    <Torus className="w-4 h-4 mr-2" />
                    Torus
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Object Tree</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {objects.map((obj) => (
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
                    ))}
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
                      placeholder="Describe what you want to create..."
                      value={aiCommand}
                      onChange={(e) => setAiCommand(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAICommand()}
                    />
                    <Button 
                      onClick={handleAICommand} 
                      disabled={isLoading || !aiCommand.trim()}
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
            style={{ minHeight: '600px' }}
          />
          
          {/* Status Bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex space-x-4">
                <span>Mode: {activeTab.toUpperCase()}</span>
                <span>Objects: {stats.objects || 0}</span>
                {stats.simulation?.totalNodes > 0 && (
                  <span>Nodes: {stats.simulation.totalNodes}</span>
                )}
              </div>
              <div className="flex space-x-4">
                <span>Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

