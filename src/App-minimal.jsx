import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [status, setStatus] = useState('Testing basic functionality...')

  const testFeatures = () => {
    setStatus('✅ React state management works!')
    setCount(count + 1)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">3D CAD AI - Minimal Test</h1>
        
        <div className="space-y-4">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Basic Functionality Test</h2>
            <p className="mb-4">Status: {status}</p>
            <p className="mb-4">Button clicks: {count}</p>
            <Button onClick={testFeatures} className="mr-4">
              Test React Features
            </Button>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Environment Check</h2>
            <ul className="space-y-2">
              <li>✅ Vite build system</li>
              <li>✅ React 19</li>
              <li>✅ Tailwind CSS</li>
              <li>✅ shadcn/ui components</li>
              <li>✅ Modern JavaScript</li>
            </ul>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
            <p>If you can see this page and the button works, the basic setup is functioning correctly.</p>
            <p className="mt-2">We can then proceed to add Three.js and the comprehensive CAD features.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

