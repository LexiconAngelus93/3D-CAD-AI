import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { 
  Box, 
  Cylinder, 
  Circle, 
  Download, 
  Upload, 
  Settings, 
  Eye, 
  EyeOff,
  Cpu,
  Zap,
  Activity,
  Bot
} from 'lucide-react'
import * as THREE from 'three'
import './App.css'

function App() {
  const [loadingStep, setLoadingStep] = useState(0)
  const [loadingStatus, setLoadingStatus] = useState('Starting...')
  const [error, setError] = useState(null)
  const [objects, setObjects] = useState([])
  const [cadEngine, setCadEngine] = useState(null)
  const viewportRef = useRef(null)

  const loadingSteps = [
    'Starting application...',
    'Loading Three.js...',
    'Creating basic CAD engine...',
    'Initializing 3D scene...',
    'Setting up camera and lights...',
    'Adding grid and axes...',
    'Setting up mouse controls...',
    'Starting render loop...',
    'Loading AI engine...',
    'Loading PCB engine...',
    'Loading simulation engine...',
    'Application ready!'
  ]

  useEffect(() => {
    const loadEnginesStepByStep = async () => {
      try {
        // Step 0: Starting
        setLoadingStep(0)
        setLoadingStatus(loadingSteps[0])
        await new Promise(resolve => setTimeout(resolve, 500))

        // Step 1: Three.js
        setLoadingStep(1)
        setLoadingStatus(loadingSteps[1])
        await new Promise(resolve => setTimeout(resolve, 500))

        // Step 2: Basic CAD Engine
        setLoadingStep(2)
        setLoadingStatus(loadingSteps[2])
        
        if (!viewportRef.current) {
          throw new Error('Viewport container not found')
        }

        // Create a minimal CAD engine
        const engine = {
          scene: new THREE.Scene(),
          camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000),
          renderer: null,
          objects: []
        }

        await new Promise(resolve => setTimeout(resolve, 500))

        // Step 3: Initialize 3D scene
        setLoadingStep(3)
        setLoadingStatus(loadingSteps[3])
        
        engine.renderer = new THREE.WebGLRenderer({ antialias: true })
        engine.renderer.setSize(viewportRef.current.clientWidth, viewportRef.current.clientHeight)
        engine.renderer.setClearColor(0x1a1a1a)
        viewportRef.current.appendChild(engine.renderer.domElement)

        await new Promise(resolve => setTimeout(resolve, 500))

        // Step 4: Camera and lights
        setLoadingStep(4)
        setLoadingStatus(loadingSteps[4])
        
        engine.camera.position.set(5, 5, 5)
        engine.camera.lookAt(0, 0, 0)

        const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
        engine.scene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
        directionalLight.position.set(10, 10, 5)
        engine.scene.add(directionalLight)

        await new Promise(resolve => setTimeout(resolve, 500))

        // Step 5: Grid and axes
        setLoadingStep(5)
        setLoadingStatus(loadingSteps[5])
        
        const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x444444)
        engine.scene.add(gridHelper)

        const axesHelper = new THREE.AxesHelper(5)
        engine.scene.add(axesHelper)

        await new Promise(resolve => setTimeout(resolve, 500))

        // Step 6: Mouse controls
        setLoadingStep(6)
        setLoadingStatus(loadingSteps[6])
        
        let isMouseDown = false
        let mouseX = 0
        let mouseY = 0

        engine.renderer.domElement.addEventListener('mousedown', (event) => {
          isMouseDown = true
          mouseX = event.clientX
          mouseY = event.clientY
        })

        engine.renderer.domElement.addEventListener('mousemove', (event) => {
          if (!isMouseDown) return

          const deltaX = event.clientX - mouseX
          const deltaY = event.clientY - mouseY

          const spherical = new THREE.Spherical()
          spherical.setFromVector3(engine.camera.position)
          spherical.theta -= deltaX * 0.01
          spherical.phi += deltaY * 0.01
          spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi))

          engine.camera.position.setFromSpherical(spherical)
          engine.camera.lookAt(0, 0, 0)

          mouseX = event.clientX
          mouseY = event.clientY
        })

        engine.renderer.domElement.addEventListener('mouseup', () => {
          isMouseDown = false
        })

        engine.renderer.domElement.addEventListener('wheel', (event) => {
          const scale = event.deltaY > 0 ? 1.1 : 0.9
          engine.camera.position.multiplyScalar(scale)
        })

        await new Promise(resolve => setTimeout(resolve, 500))

        // Step 7: Render loop
        setLoadingStep(7)
        setLoadingStatus(loadingSteps[7])
        
        const animate = () => {
          requestAnimationFrame(animate)
          engine.renderer.render(engine.scene, engine.camera)
        }
        animate()

        // Add methods to engine
        engine.createBox = () => {
          const geometry = new THREE.BoxGeometry(1, 1, 1)
          const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 })
          const mesh = new THREE.Mesh(geometry, material)
          mesh.position.set(Math.random() * 4 - 2, 0.5, Math.random() * 4 - 2)
          
          const obj = {
            id: Date.now(),
            name: `Box ${engine.objects.length + 1}`,
            type: 'Box',
            mesh: mesh,
            visible: true
          }
          
          engine.objects.push(obj)
          engine.scene.add(mesh)
          return obj
        }

        engine.createCylinder = () => {
          const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32)
          const material = new THREE.MeshLambertMaterial({ color: 0x0066ff })
          const mesh = new THREE.Mesh(geometry, material)
          mesh.position.set(Math.random() * 4 - 2, 0.5, Math.random() * 4 - 2)
          
          const obj = {
            id: Date.now(),
            name: `Cylinder ${engine.objects.length + 1}`,
            type: 'Cylinder',
            mesh: mesh,
            visible: true
          }
          
          engine.objects.push(obj)
          engine.scene.add(mesh)
          return obj
        }

        engine.createSphere = () => {
          const geometry = new THREE.SphereGeometry(0.5, 32, 32)
          const material = new THREE.MeshLambertMaterial({ color: 0xff6600 })
          const mesh = new THREE.Mesh(geometry, material)
          mesh.position.set(Math.random() * 4 - 2, 0.5, Math.random() * 4 - 2)
          
          const obj = {
            id: Date.now(),
            name: `Sphere ${engine.objects.length + 1}`,
            type: 'Sphere',
            mesh: mesh,
            visible: true
          }
          
          engine.objects.push(obj)
          engine.scene.add(mesh)
          return obj
        }

        engine.toggleObjectVisibility = (id) => {
          const obj = engine.objects.find(o => o.id === id)
          if (obj) {
            obj.visible = !obj.visible
            obj.mesh.visible = obj.visible
          }
        }

        setCadEngine(engine)

        await new Promise(resolve => setTimeout(resolve, 500))

        // Step 8: AI Engine (simplified)
        setLoadingStep(8)
        setLoadingStatus(loadingSteps[8])
        
        // Simple AI engine that doesn't cause issues
        const aiEngine = {
          processCommand: (command) => {
            const lowerCommand = command.toLowerCase()
            if (lowerCommand.includes('box')) {
              return engine.createBox()
            } else if (lowerCommand.includes('cylinder')) {
              return engine.createCylinder()
            } else {
              return engine.createSphere()
            }
          }
        }

        await new Promise(resolve => setTimeout(resolve, 500))

        // Step 9: PCB Engine (placeholder)
        setLoadingStep(9)
        setLoadingStatus(loadingSteps[9])
        
        // Simple placeholder that doesn't cause issues
        const pcbEngine = {
          getStats: () => ({ componentCount: 0, traceCount: 0, layerCount: 4 })
        }

        await new Promise(resolve => setTimeout(resolve, 500))

        // Step 10: Simulation Engine (placeholder)
        setLoadingStep(10)
        setLoadingStatus(loadingSteps[10])
        
        // Simple placeholder that doesn't cause issues
        const simulationEngine = {
          getStats: () => ({ totalNodes: 0 })
        }

        await new Promise(resolve => setTimeout(resolve, 500))

        // Step 11: Ready
        setLoadingStep(11)
        setLoadingStatus(loadingSteps[11])

      } catch (err) {
        console.error('Engine loading error:', err)
        setError(`Error at step ${loadingStep}: ${err.message}`)
      }
    }

    if (viewportRef.current && !cadEngine) {
      loadEnginesStepByStep()
    }
  }, [cadEngine, loadingStep])

  const createPrimitive = (type) => {
    if (!cadEngine) return
    
    let newObj
    switch (type) {
      case 'box':
        newObj = cadEngine.createBox()
        break
      case 'cylinder':
        newObj = cadEngine.createCylinder()
        break
      case 'sphere':
        newObj = cadEngine.createSphere()
        break
      default:
        return
    }
    
    setObjects([...objects, newObj])
  }

  const toggleVisibility = (id) => {
    if (!cadEngine) return
    
    cadEngine.toggleObjectVisibility(id)
    setObjects(objects.map(obj => 
      obj.id === id ? { ...obj, visible: !obj.visible } : obj
    ))
  }

  if (error) {
    return (
      <div className="h-screen bg-gray-900 text-white flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-red-500">Engine Loading Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{error}</p>
            <Button 
              className="mt-4 w-full" 
              onClick={() => window.location.reload()}
            >
              Reload Application
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loadingStep < 11) {
    return (
      <div className="h-screen bg-gray-900 text-white flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Loading 3D CAD AI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {loadingSteps.map((step, index) => (
                <div 
                  key={index} 
                  className={`text-sm flex items-center space-x-2 ${
                    index < loadingStep ? 'text-green-400' : 
                    index === loadingStep ? 'text-blue-400' : 
                    'text-gray-500'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    index < loadingStep ? 'bg-green-400' : 
                    index === loadingStep ? 'bg-blue-400' : 
                    'bg-gray-500'
                  }`} />
                  <span>{step}</span>
                </div>
              ))}
            </div>
            <div className="text-center text-sm text-gray-400">
              Step {loadingStep + 1} of {loadingSteps.length}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">3D CAD AI - Debug Version</h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Objects: {objects.length}</Badge>
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-80 bg-gray-800 border-r border-gray-700 p-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Primitives</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                onClick={() => createPrimitive('box')} 
                className="w-full justify-start"
                variant="outline"
              >
                <Box className="w-4 h-4 mr-2" />
                Box
              </Button>
              <Button 
                onClick={() => createPrimitive('cylinder')} 
                className="w-full justify-start"
                variant="outline"
              >
                <Cylinder className="w-4 h-4 mr-2" />
                Cylinder
              </Button>
              <Button 
                onClick={() => createPrimitive('sphere')} 
                className="w-full justify-start"
                variant="outline"
              >
                <Circle className="w-4 h-4 mr-2" />
                Sphere
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Objects ({objects.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {objects.map((obj) => (
                <div key={obj.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                  <span className="text-sm">{obj.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleVisibility(obj.id)}
                  >
                    {obj.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>

        {/* Main Viewport */}
        <main className="flex-1 relative">
          <div 
            ref={viewportRef} 
            className="w-full h-full"
            style={{ background: '#1a1a1a' }}
          />
          
          {/* Status Bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <Badge variant="outline">Objects: {objects.length}</Badge>
                <Badge variant="outline">Debug Mode</Badge>
              </div>
              <div className="text-gray-400">
                All engines loaded successfully • WebGL Enabled
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App

