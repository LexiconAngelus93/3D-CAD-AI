import {
   ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  DirectionalLight,
  Material,
  Mesh,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Raycaster,
  SRGBColorSpace,
  Scene,
  Spherical,
  Vector2,
  Vector3,
  WebGLRenderer 
} from 'three';

export interface RenderSettings {
  antialias: boolean;
  shadows: boolean;
  wireframe: boolean;
  showGrid: boolean;
  showAxes: boolean;
  backgroundColor: number;
  ambientLightIntensity: number;
  directionalLightIntensity: number;
}

export class RenderEngine {
  private scene: Scene;
  private camera: PerspectiveCamera;
  private renderer: WebGLRenderer | null = null;
  private container: HTMLElement | null = null;
  
  private controls: any = null; // Would be OrbitControls in real implementation
  private raycaster: Raycaster;
  private mouse: Vector2;
  
  private settings: RenderSettings = {
    antialias: true,
    shadows: true,
    wireframe: false,
    showGrid: true,
    showAxes: true,
    backgroundColor: 0x1a1a1a,
    ambientLightIntensity: 0.6,
    directionalLightIntensity: 0.8,
  };

  private animationId: number | null = null;
  private isRendering: boolean = false;

  constructor(scene: Scene, camera: PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new Raycaster();
    this.mouse = new Vector2();
  }

  async initialize(): Promise<void> {
    console.log('Render Engine initialized');
  }

  setContainer(container: HTMLElement): void {
    this.container = container;
    this.createRenderer();
    this.setupEventListeners();
    this.startRenderLoop();
  }

  private createRenderer(): void {
    if (!this.container) return;

    this.renderer = new WebGLRenderer({
      antialias: this.settings.antialias,
      alpha: true,
      powerPreference: 'high-performance',
    });

    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(this.settings.backgroundColor);
    
    if (this.settings.shadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = PCFSoftShadowMap;
    }

    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;

    this.container.appendChild(this.renderer.domElement);

    // Initialize controls (simplified - would use OrbitControls)
    this.initializeControls();
  }

  private initializeControls(): void {
    // This would initialize OrbitControls in a real implementation
    // For now, we'll implement basic mouse controls
    if (!this.renderer || !this.container) return;

    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;

    this.container.addEventListener('mousedown', (event) => {
      isMouseDown = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
    });

    this.container.addEventListener('mousemove', (event) => {
      if (!isMouseDown) return;

      const deltaX = event.clientX - mouseX;
      const deltaY = event.clientY - mouseY;

      // Rotate camera around target
      const spherical = new Spherical();
      spherical.setFromVector3(this.camera.position);
      spherical.theta -= deltaX * 0.01;
      spherical.phi += deltaY * 0.01;
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

      this.camera.position.setFromSpherical(spherical);
      this.camera.lookAt(0, 0, 0);

      mouseX = event.clientX;
      mouseY = event.clientY;
    });

    this.container.addEventListener('mouseup', () => {
      isMouseDown = false;
    });

    this.container.addEventListener('wheel', (event) => {
      const scale = event.deltaY > 0 ? 1.1 : 0.9;
      this.camera.position.multiplyScalar(scale);
      this.camera.position.clampLength(1, 100);
    });
  }

  private setupEventListeners(): void {
    if (!this.container) return;

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this.handleResize(entry.contentRect.width, entry.contentRect.height);
      }
    });
    resizeObserver.observe(this.container);

    // Handle mouse events for object selection
    this.container.addEventListener('click', (event) => {
      this.handleMouseClick(event);
    });

    this.container.addEventListener('mousemove', (event) => {
      this.updateMousePosition(event);
    });
  }

  private handleResize(width: number, height: number): void {
    if (!this.renderer) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private handleMouseClick(event: MouseEvent): void {
    if (!this.container || !this.renderer) return;

    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      const object = intersects[0].object;
      this.onObjectClick(object);
    }
  }

  private updateMousePosition(event: MouseEvent): void {
    if (!this.container) return;

    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onObjectClick(object: Object3D): void {
    // Emit object selection event
    const event = new CustomEvent('objectSelected', {
      detail: { objectId: object.userData.id }
    });
    this.container?.dispatchEvent(event);
  }

  private startRenderLoop(): void {
    if (this.isRendering) return;
    
    this.isRendering = true;
    this.renderLoop();
  }

  private renderLoop = (): void => {
    if (!this.isRendering || !this.renderer) return;

    this.animationId = requestAnimationFrame(this.renderLoop);
    this.render();
  };

  render(): void {
    if (!this.renderer) return;
    this.renderer.render(this.scene, this.camera);
  }

  stopRenderLoop(): void {
    this.isRendering = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  // Settings Management
  updateSettings(newSettings: Partial<RenderSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.applySettings();
  }

  private applySettings(): void {
    if (!this.renderer) return;

    // Update renderer settings
    this.renderer.setClearColor(this.settings.backgroundColor);
    this.renderer.shadowMap.enabled = this.settings.shadows;

    // Update scene lighting
    this.updateLighting();

    // Update wireframe mode
    this.updateWireframeMode();

    // Update grid and axes visibility
    this.updateHelpers();
  }

  private updateLighting(): void {
    // Find and update lights in the scene
    this.scene.traverse((object) => {
      if (object instanceof AmbientLight) {
        object.intensity = this.settings.ambientLightIntensity;
      } else if (object instanceof DirectionalLight) {
        object.intensity = this.settings.directionalLightIntensity;
      }
    });
  }

  private updateWireframeMode(): void {
    this.scene.traverse((object) => {
      if (object instanceof Mesh && object.material instanceof Material) {
        if ('wireframe' in object.material) {
          (object.material as any).wireframe = this.settings.wireframe;
        }
      }
    });
  }

  private updateHelpers(): void {
    // Update grid helper visibility
    const gridHelper = this.scene.getObjectByName('gridHelper');
    if (gridHelper) {
      gridHelper.visible = this.settings.showGrid;
    }

    // Update axes helper visibility
    const axesHelper = this.scene.getObjectByName('axesHelper');
    if (axesHelper) {
      axesHelper.visible = this.settings.showAxes;
    }
  }

  // Camera Controls
  resetCamera(): void {
    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(0, 0, 0);
  }

  fitToView(objects: Object3D[]): void {
    if (objects.length === 0) return;

    const box = new Box3();
    objects.forEach(object => {
      box.expandByObject(object);
    });

    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim / (2 * Math.tan(this.camera.fov * Math.PI / 360));

    this.camera.position.copy(center);
    this.camera.position.z += distance * 1.5;
    this.camera.lookAt(center);
  }

  setViewDirection(direction: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'iso'): void {
    const distance = this.camera.position.length();
    
    switch (direction) {
      case 'front':
        this.camera.position.set(0, 0, distance);
        break;
      case 'back':
        this.camera.position.set(0, 0, -distance);
        break;
      case 'left':
        this.camera.position.set(-distance, 0, 0);
        break;
      case 'right':
        this.camera.position.set(distance, 0, 0);
        break;
      case 'top':
        this.camera.position.set(0, distance, 0);
        break;
      case 'bottom':
        this.camera.position.set(0, -distance, 0);
        break;
      case 'iso':
        this.camera.position.set(distance * 0.7, distance * 0.7, distance * 0.7);
        break;
    }
    
    this.camera.lookAt(0, 0, 0);
  }

  // Screenshot and Export
  takeScreenshot(width?: number, height?: number): string {
    if (!this.renderer) return '';

    const originalSize = this.renderer.getSize(new Vector2());
    
    if (width && height) {
      this.renderer.setSize(width, height);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    this.render();
    const dataURL = this.renderer.domElement.toDataURL('image/png');

    // Restore original size
    this.renderer.setSize(originalSize.x, originalSize.y);
    this.camera.aspect = originalSize.x / originalSize.y;
    this.camera.updateProjectionMatrix();

    return dataURL;
  }

  // Getters
  getRenderer(): WebGLRenderer | null {
    return this.renderer;
  }

  getSettings(): RenderSettings {
    return { ...this.settings };
  }

  // Cleanup
  dispose(): void {
    this.stopRenderLoop();
    
    if (this.renderer) {
      this.renderer.dispose();
      if (this.container && this.renderer.domElement.parentNode === this.container) {
        this.container.removeChild(this.renderer.domElement);
      }
    }

    this.renderer = null;
    this.container = null;
    this.controls = null;
  }
}

