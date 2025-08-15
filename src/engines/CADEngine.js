import * as THREE from 'three'

export class CADEngine {
  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    this.renderer = null
    this.objects = []
    this.controls = null
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.selectedObject = null
    this.transformControls = null
    this.isInitialized = false
    this.container = null
  }

  initialize(container) {
    if (this.isInitialized) return
    
    this.container = container
    
    try {
      // Create renderer with advanced settings
      this.renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
      })
      
      // Set size and pixel ratio
      const width = container.clientWidth || 800
      const height = container.clientHeight || 600
      this.renderer.setSize(width, height)
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      
      // Configure renderer
      this.renderer.setClearColor(0x1a1a1a, 1)
      this.renderer.shadowMap.enabled = true
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
      this.renderer.outputColorSpace = THREE.SRGBColorSpace
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping
      this.renderer.toneMappingExposure = 1
      
      // Add to container
      container.appendChild(this.renderer.domElement)

      // Set up camera
      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
      this.camera.position.set(10, 10, 10)
      this.camera.lookAt(0, 0, 0)

      // Advanced lighting setup
      this.setupLighting()

      // Add environment
      this.setupEnvironment()

      // Set up controls
      this.setupControls()

      // Set up interaction
      this.setupInteraction()

      // Mark as initialized
      this.isInitialized = true

      // Start render loop
      this.animate()
      
      console.log('CAD Engine initialized successfully')
      
    } catch (error) {
      console.error('Failed to initialize CAD Engine:', error)
      throw error
    }
  }

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    this.scene.add(ambientLight)

    // Main directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2)
    directionalLight.position.set(20, 20, 10)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 50
    directionalLight.shadow.camera.left = -20
    directionalLight.shadow.camera.right = 20
    directionalLight.shadow.camera.top = 20
    directionalLight.shadow.camera.bottom = -20
    this.scene.add(directionalLight)

    // Fill light
    const fillLight = new THREE.DirectionalLight(0x4080ff, 0.4)
    fillLight.position.set(-10, 10, -10)
    this.scene.add(fillLight)

    // Rim light
    const rimLight = new THREE.DirectionalLight(0xff8040, 0.3)
    rimLight.position.set(0, 10, -20)
    this.scene.add(rimLight)
  }

  setupEnvironment() {
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(50, 50)
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x333333,
      transparent: true,
      opacity: 0.8
    })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    // Grid helper
    const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222)
    gridHelper.material.transparent = true
    gridHelper.material.opacity = 0.6
    this.scene.add(gridHelper)

    // Axes helper
    const axesHelper = new THREE.AxesHelper(5)
    this.scene.add(axesHelper)
  }

  setupControls() {
    let isMouseDown = false
    let mouseX = 0
    let mouseY = 0
    let isRightClick = false

    this.renderer.domElement.addEventListener('mousedown', (event) => {
      isMouseDown = true
      isRightClick = event.button === 2
      mouseX = event.clientX
      mouseY = event.clientY
    })

    this.renderer.domElement.addEventListener('mousemove', (event) => {
      if (!isMouseDown) return

      const deltaX = event.clientX - mouseX
      const deltaY = event.clientY - mouseY

      if (isRightClick) {
        // Pan camera
        const panSpeed = 0.01
        const panX = deltaX * panSpeed
        const panY = deltaY * panSpeed
        
        this.camera.position.x -= panX
        this.camera.position.z -= panY
      } else {
        // Rotate camera around the scene
        const spherical = new THREE.Spherical()
        spherical.setFromVector3(this.camera.position)
        spherical.theta -= deltaX * 0.01
        spherical.phi += deltaY * 0.01
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi))

        this.camera.position.setFromSpherical(spherical)
        this.camera.lookAt(0, 0, 0)
      }

      mouseX = event.clientX
      mouseY = event.clientY
    })

    this.renderer.domElement.addEventListener('mouseup', () => {
      isMouseDown = false
      isRightClick = false
    })

    this.renderer.domElement.addEventListener('wheel', (event) => {
      event.preventDefault()
      const scale = event.deltaY > 0 ? 1.1 : 0.9
      this.camera.position.multiplyScalar(scale)
      
      // Limit zoom
      const distance = this.camera.position.length()
      if (distance < 2) {
        this.camera.position.normalize().multiplyScalar(2)
      } else if (distance > 100) {
        this.camera.position.normalize().multiplyScalar(100)
      }
    })

    // Disable context menu
    this.renderer.domElement.addEventListener('contextmenu', (event) => {
      event.preventDefault()
    })
  }

  setupInteraction() {
    this.renderer.domElement.addEventListener('click', (event) => {
      if (!this.renderer || !this.camera) return

      const rect = this.renderer.domElement.getBoundingClientRect()
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      this.raycaster.setFromCamera(this.mouse, this.camera)
      const intersects = this.raycaster.intersectObjects(this.objects.map(obj => obj.mesh))

      if (intersects.length > 0) {
        const selectedMesh = intersects[0].object
        const selectedObj = this.objects.find(obj => obj.mesh === selectedMesh)
        
        if (selectedObj) {
          this.selectObject(selectedObj)
        }
      } else {
        this.deselectObject()
      }
    })
  }

  selectObject(obj) {
    // Deselect previous object
    this.deselectObject()
    
    this.selectedObject = obj
    
    // Change material to indicate selection
    if (obj.mesh && obj.mesh.material) {
      obj.originalMaterial = obj.mesh.material.clone()
      obj.mesh.material = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.8
      })
    }
  }

  deselectObject() {
    if (this.selectedObject && this.selectedObject.mesh) {
      // Restore original material
      if (this.selectedObject.originalMaterial) {
        this.selectedObject.mesh.material = this.selectedObject.originalMaterial
      }
    }
    this.selectedObject = null
  }

  createBox(width = 2, height = 2, depth = 2) {
    const geometry = new THREE.BoxGeometry(width, height, depth)
    const material = new THREE.MeshPhongMaterial({ 
      color: Math.random() * 0xffffff,
      shininess: 100
    })
    const mesh = new THREE.Mesh(geometry, material)
    
    // Position randomly
    mesh.position.set(
      (Math.random() - 0.5) * 10,
      height / 2,
      (Math.random() - 0.5) * 10
    )
    
    mesh.castShadow = true
    mesh.receiveShadow = true
    
    this.scene.add(mesh)

    const obj = {
      id: Date.now() + Math.random(),
      name: `Box ${this.objects.length + 1}`,
      type: 'box',
      mesh: mesh,
      visible: true,
      parameters: { width, height, depth }
    }

    this.objects.push(obj)
    console.log('Created box:', obj.name)
    return obj
  }

  createCylinder(radius = 1, height = 2, segments = 32) {
    const geometry = new THREE.CylinderGeometry(radius, radius, height, segments)
    const material = new THREE.MeshPhongMaterial({ 
      color: Math.random() * 0xffffff,
      shininess: 100
    })
    const mesh = new THREE.Mesh(geometry, material)
    
    // Position randomly
    mesh.position.set(
      (Math.random() - 0.5) * 10,
      height / 2,
      (Math.random() - 0.5) * 10
    )
    
    mesh.castShadow = true
    mesh.receiveShadow = true
    
    this.scene.add(mesh)

    const obj = {
      id: Date.now() + Math.random(),
      name: `Cylinder ${this.objects.length + 1}`,
      type: 'cylinder',
      mesh: mesh,
      visible: true,
      parameters: { radius, height, segments }
    }

    this.objects.push(obj)
    console.log('Created cylinder:', obj.name)
    return obj
  }

  createSphere(radius = 1, segments = 32) {
    const geometry = new THREE.SphereGeometry(radius, segments, segments)
    const material = new THREE.MeshPhongMaterial({ 
      color: Math.random() * 0xffffff,
      shininess: 100
    })
    const mesh = new THREE.Mesh(geometry, material)
    
    // Position randomly
    mesh.position.set(
      (Math.random() - 0.5) * 10,
      radius,
      (Math.random() - 0.5) * 10
    )
    
    mesh.castShadow = true
    mesh.receiveShadow = true
    
    this.scene.add(mesh)

    const obj = {
      id: Date.now() + Math.random(),
      name: `Sphere ${this.objects.length + 1}`,
      type: 'sphere',
      mesh: mesh,
      visible: true,
      parameters: { radius, segments }
    }

    this.objects.push(obj)
    console.log('Created sphere:', obj.name)
    return obj
  }

  createTorus(radius = 1, tube = 0.4, radialSegments = 16, tubularSegments = 100) {
    const geometry = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments)
    const material = new THREE.MeshPhongMaterial({ 
      color: Math.random() * 0xffffff,
      shininess: 100
    })
    const mesh = new THREE.Mesh(geometry, material)
    
    // Position randomly
    mesh.position.set(
      (Math.random() - 0.5) * 10,
      radius + tube,
      (Math.random() - 0.5) * 10
    )
    
    mesh.castShadow = true
    mesh.receiveShadow = true
    
    this.scene.add(mesh)

    const obj = {
      id: Date.now() + Math.random(),
      name: `Torus ${this.objects.length + 1}`,
      type: 'torus',
      mesh: mesh,
      visible: true,
      parameters: { radius, tube, radialSegments, tubularSegments }
    }

    this.objects.push(obj)
    console.log('Created torus:', obj.name)
    return obj
  }

  toggleObjectVisibility(id) {
    const obj = this.objects.find(o => o.id === id)
    if (obj && obj.mesh) {
      obj.visible = !obj.visible
      obj.mesh.visible = obj.visible
    }
  }

  deleteObject(id) {
    const index = this.objects.findIndex(o => o.id === id)
    if (index !== -1) {
      const obj = this.objects[index]
      if (obj.mesh) {
        this.scene.remove(obj.mesh)
        if (obj.mesh.geometry) obj.mesh.geometry.dispose()
        if (obj.mesh.material) obj.mesh.material.dispose()
      }
      this.objects.splice(index, 1)
      
      if (this.selectedObject === obj) {
        this.selectedObject = null
      }
    }
  }

  exportScene() {
    return {
      objects: this.objects.map(obj => ({
        id: obj.id,
        name: obj.name,
        type: obj.type,
        visible: obj.visible,
        parameters: obj.parameters,
        position: obj.mesh ? {
          x: obj.mesh.position.x,
          y: obj.mesh.position.y,
          z: obj.mesh.position.z
        } : null
      }))
    }
  }

  resize(width, height) {
    if (!this.renderer || !this.camera) return
    
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  animate() {
    if (!this.isInitialized || !this.renderer || !this.scene || !this.camera) return
    
    requestAnimationFrame(() => this.animate())
    
    try {
      this.renderer.render(this.scene, this.camera)
    } catch (error) {
      console.error('Render error:', error)
    }
  }

  dispose() {
    if (this.renderer) {
      this.renderer.dispose()
      if (this.container && this.renderer.domElement) {
        this.container.removeChild(this.renderer.domElement)
      }
    }
    
    this.objects.forEach(obj => {
      if (obj.mesh) {
        if (obj.mesh.geometry) obj.mesh.geometry.dispose()
        if (obj.mesh.material) obj.mesh.material.dispose()
      }
    })
    
    this.isInitialized = false
  }
}

