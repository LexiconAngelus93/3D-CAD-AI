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
  }

  initialize(container) {
    // Create renderer with advanced settings
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x1a1a1a, 1)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1
    container.appendChild(this.renderer.domElement)

    // Set up camera
    this.camera.position.set(10, 10, 10)
    this.camera.lookAt(0, 0, 0)

    // Advanced lighting setup
    this.setupLighting()

    // Add environment
    this.setupEnvironment()

    // Set up advanced controls
    this.setupControls()

    // Set up interaction
    this.setupInteraction()

    // Start render loop
    this.animate()
  }

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4)
    this.scene.add(ambientLight)

    // Main directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
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
    const fillLight = new THREE.DirectionalLight(0x4080ff, 0.3)
    fillLight.position.set(-10, 10, -10)
    this.scene.add(fillLight)

    // Rim light
    const rimLight = new THREE.DirectionalLight(0xff8040, 0.2)
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

    // Sky gradient
    const skyGeometry = new THREE.SphereGeometry(100, 32, 32)
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0077ff) },
        bottomColor: { value: new THREE.Color(0x89b2eb) },
        offset: { value: 33 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    })
    const sky = new THREE.Mesh(skyGeometry, skyMaterial)
    this.scene.add(sky)
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
      // Calculate mouse position in normalized device coordinates
      const rect = this.renderer.domElement.getBoundingClientRect()
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      // Update raycaster
      this.raycaster.setFromCamera(this.mouse, this.camera)

      // Calculate objects intersecting the picking ray
      const meshes = this.objects.map(obj => obj.mesh).filter(mesh => mesh.visible)
      const intersects = this.raycaster.intersectObjects(meshes)

      if (intersects.length > 0) {
        // Select object
        this.selectObject(intersects[0].object)
      } else {
        // Deselect
        this.selectObject(null)
      }
    })
  }

  selectObject(mesh) {
    // Remove previous selection highlight
    if (this.selectedObject) {
      this.selectedObject.material.emissive.setHex(0x000000)
    }

    this.selectedObject = mesh

    // Add selection highlight
    if (this.selectedObject) {
      this.selectedObject.material.emissive.setHex(0x333333)
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate())
    
    // Rotate objects slightly for visual appeal
    this.objects.forEach(obj => {
      if (obj.mesh && obj.type === 'Sphere') {
        obj.mesh.rotation.y += 0.005
      }
    })

    this.renderer.render(this.scene, this.camera)
  }

  createBox(options = {}) {
    const {
      width = 1,
      height = 1,
      depth = 1,
      color = 0x00ff00,
      position = { x: Math.random() * 4 - 2, y: height/2, z: Math.random() * 4 - 2 }
    } = options

    const geometry = new THREE.BoxGeometry(width, height, depth)
    const material = new THREE.MeshLambertMaterial({ 
      color: color,
      transparent: true,
      opacity: 0.9
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(position.x, position.y, position.z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    
    const obj = {
      id: Date.now() + Math.random(),
      name: `Box ${this.objects.length + 1}`,
      type: 'Box',
      mesh: mesh,
      visible: true,
      properties: { width, height, depth, color }
    }
    
    this.objects.push(obj)
    this.scene.add(mesh)
    return obj
  }

  createCylinder(options = {}) {
    const {
      radiusTop = 0.5,
      radiusBottom = 0.5,
      height = 1,
      radialSegments = 32,
      color = 0x0066ff,
      position = { x: Math.random() * 4 - 2, y: height/2, z: Math.random() * 4 - 2 }
    } = options

    const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments)
    const material = new THREE.MeshLambertMaterial({ 
      color: color,
      transparent: true,
      opacity: 0.9
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(position.x, position.y, position.z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    
    const obj = {
      id: Date.now() + Math.random(),
      name: `Cylinder ${this.objects.length + 1}`,
      type: 'Cylinder',
      mesh: mesh,
      visible: true,
      properties: { radiusTop, radiusBottom, height, radialSegments, color }
    }
    
    this.objects.push(obj)
    this.scene.add(mesh)
    return obj
  }

  createSphere(options = {}) {
    const {
      radius = 0.5,
      widthSegments = 32,
      heightSegments = 32,
      color = 0xff6600,
      position = { x: Math.random() * 4 - 2, y: radius, z: Math.random() * 4 - 2 }
    } = options

    const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments)
    const material = new THREE.MeshLambertMaterial({ 
      color: color,
      transparent: true,
      opacity: 0.9
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(position.x, position.y, position.z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    
    const obj = {
      id: Date.now() + Math.random(),
      name: `Sphere ${this.objects.length + 1}`,
      type: 'Sphere',
      mesh: mesh,
      visible: true,
      properties: { radius, widthSegments, heightSegments, color }
    }
    
    this.objects.push(obj)
    this.scene.add(mesh)
    return obj
  }

  createTorus(options = {}) {
    const {
      radius = 1,
      tube = 0.3,
      radialSegments = 16,
      tubularSegments = 100,
      color = 0xff00ff,
      position = { x: Math.random() * 4 - 2, y: 1, z: Math.random() * 4 - 2 }
    } = options

    const geometry = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments)
    const material = new THREE.MeshLambertMaterial({ 
      color: color,
      transparent: true,
      opacity: 0.9
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(position.x, position.y, position.z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    
    const obj = {
      id: Date.now() + Math.random(),
      name: `Torus ${this.objects.length + 1}`,
      type: 'Torus',
      mesh: mesh,
      visible: true,
      properties: { radius, tube, radialSegments, tubularSegments, color }
    }
    
    this.objects.push(obj)
    this.scene.add(mesh)
    return obj
  }

  toggleObjectVisibility(id) {
    const obj = this.objects.find(o => o.id === id)
    if (obj) {
      obj.visible = !obj.visible
      obj.mesh.visible = obj.visible
    }
  }

  deleteObject(id) {
    const objIndex = this.objects.findIndex(o => o.id === id)
    if (objIndex !== -1) {
      const obj = this.objects[objIndex]
      this.scene.remove(obj.mesh)
      this.objects.splice(objIndex, 1)
      
      if (this.selectedObject === obj.mesh) {
        this.selectedObject = null
      }
    }
  }

  resize(width, height) {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  exportScene() {
    // Export scene data
    return {
      objects: this.objects.map(obj => ({
        id: obj.id,
        name: obj.name,
        type: obj.type,
        visible: obj.visible,
        properties: obj.properties,
        position: obj.mesh.position.toArray(),
        rotation: obj.mesh.rotation.toArray(),
        scale: obj.mesh.scale.toArray()
      }))
    }
  }

  importScene(sceneData) {
    // Clear current scene
    this.objects.forEach(obj => this.scene.remove(obj.mesh))
    this.objects = []

    // Import objects
    sceneData.objects.forEach(objData => {
      let obj
      switch (objData.type) {
        case 'Box':
          obj = this.createBox({
            ...objData.properties,
            position: { x: objData.position[0], y: objData.position[1], z: objData.position[2] }
          })
          break
        case 'Cylinder':
          obj = this.createCylinder({
            ...objData.properties,
            position: { x: objData.position[0], y: objData.position[1], z: objData.position[2] }
          })
          break
        case 'Sphere':
          obj = this.createSphere({
            ...objData.properties,
            position: { x: objData.position[0], y: objData.position[1], z: objData.position[2] }
          })
          break
        case 'Torus':
          obj = this.createTorus({
            ...objData.properties,
            position: { x: objData.position[0], y: objData.position[1], z: objData.position[2] }
          })
          break
      }

      if (obj) {
        obj.id = objData.id
        obj.name = objData.name
        obj.visible = objData.visible
        obj.mesh.rotation.fromArray(objData.rotation)
        obj.mesh.scale.fromArray(objData.scale)
        obj.mesh.visible = objData.visible
      }
    })
  }
}

