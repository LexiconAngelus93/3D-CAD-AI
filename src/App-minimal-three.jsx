import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Box, Circle } from 'lucide-react'
import './App.css'

function App() {
  const [status, setStatus] = useState('Starting...')
  const [objects, setObjects] = useState([])
  const [threeLoaded, setThreeLoaded] = useState(false)
  const viewportRef = useRef(null)
  const sceneRef = useRef(null)

  useEffect(() => {
    const initializeThreeJS = async () => {
      try {
        setStatus('Loading Three.js...')
        
        // Dynamic import of Three.js to see if this is the issue
        const THREE = await import('three')
        
        setStatus('Three.js loaded, creating scene...')
        
        if (!viewportRef.current) {
          throw new Error('Viewport container not found')
        }

        // Create scene
        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000)
        const renderer = new THREE.WebGLRenderer({ antialias: true })
        
        setStatus('Setting up renderer...')
        
        renderer.setSize(800, 600)
        renderer.setClearColor(0x1a1a1a)
        viewportRef.current.appendChild(renderer.domElement)
        
        setStatus('Setting up camera...')
        
        camera.position.set(5, 5, 5)
        camera.lookAt(0, 0, 0)
        
        setStatus('Adding lights...')
        
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
        scene.add(ambientLight)
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
        directionalLight.position.set(10, 10, 5)
        scene.add(directionalLight)
        
        setStatus('Adding grid...')
        
        const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x444444)
        scene.add(gridHelper)
        
        setStatus('Starting render loop...')
        
        const animate = () => {
          requestAnimationFrame(animate)
          renderer.render(scene, camera)
        }
        animate()
        
        // Store references
        sceneRef.current = {
          scene,
          camera,
          renderer,
          THREE,
          objects: []
        }
        
        setStatus('Ready!')
        setThreeLoaded(true)
        
      } catch (error) {
        console.error('Three.js initialization error:', error)
        setStatus(`Error: ${error.message}`)
      }
    }

    if (viewportRef.current && !threeLoaded) {
      initializeThreeJS()
    }
  }, [threeLoaded])

  const createBox = () => {
    if (!sceneRef.current) return
    
    const { scene, THREE } = sceneRef.current
    
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(Math.random() * 4 - 2, 0.5, Math.random() * 4 - 2)
    
    const obj = {
      id: Date.now(),
      name: `Box ${objects.length + 1}`,
      mesh
    }
    
    scene.add(mesh)
    sceneRef.current.objects.push(obj)
    setObjects([...sceneRef.current.objects])
  }

  const createSphere = () => {
    if (!sceneRef.current) return
    
    const { scene, THREE } = sceneRef.current
    
    const geometry = new THREE.SphereGeometry(0.5, 32, 32)
    const material = new THREE.MeshLambertMaterial({ color: 0xff6600 })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(Math.random() * 4 - 2, 0.5, Math.random() * 4 - 2)
    
    const obj = {
      id: Date.now(),
      name: `Sphere ${objects.length + 1}`,
      mesh
    }
    
    scene.add(mesh)
    sceneRef.current.objects.push(obj)
    setObjects([...sceneRef.current.objects])
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">3D CAD AI - Minimal Three.js Test</h1>
          <Badge variant="outline">Status: {status}</Badge>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-80 bg-gray-800 border-r border-gray-700 p-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Test Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                onClick={createBox} 
                disabled={!threeLoaded}
                className="w-full justify-start"
                variant="outline"
              >
                <Box className="w-4 h-4 mr-2" />
                Create Box
              </Button>
              <Button 
                onClick={createSphere} 
                disabled={!threeLoaded}
                className="w-full justify-start"
                variant="outline"
              >
                <Circle className="w-4 h-4 mr-2" />
                Create Sphere
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Objects ({objects.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {objects.length === 0 ? (
                <p className="text-sm text-gray-400">No objects created yet</p>
              ) : (
                <div className="space-y-2">
                  {objects.map((obj) => (
                    <div key={obj.id} className="p-2 bg-gray-700 rounded">
                      <span className="text-sm">{obj.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Debug Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-xs">
                <div>Three.js Loaded: {threeLoaded ? '✅' : '❌'}</div>
                <div>Scene Ready: {sceneRef.current ? '✅' : '❌'}</div>
                <div>Viewport: {viewportRef.current ? '✅' : '❌'}</div>
                <div>Status: {status}</div>
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Main Viewport */}
        <main className="flex-1 relative">
          <div 
            ref={viewportRef} 
            className="w-full h-full flex items-center justify-center"
            style={{ background: '#1a1a1a' }}
          >
            {!threeLoaded && (
              <div className="text-center">
                <div className="text-xl mb-2">Loading Three.js...</div>
                <div className="text-sm text-gray-400">{status}</div>
              </div>
            )}
          </div>
          
          {/* Status Bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <Badge variant="outline">Objects: {objects.length}</Badge>
                <Badge variant="outline">Minimal Test</Badge>
              </div>
              <div className="text-gray-400">
                {status}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App

