import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  DirectionalLight,
  HemisphereLight,
  WireframeGeometry,
  LineSegments,
} from 'three';
import { MeshGenerator } from './MeshGenerator';
import { ResourcePool } from './ResourcePool';

export class SceneRenderer {
  private scene = new Scene();
  private camera: PerspectiveCamera;
  private renderer: WebGLRenderer;
  private pool = new ResourcePool();
  private frameId: number | null = null;
  private generator = new MeshGenerator();

  constructor(private mount: HTMLElement) {
    this.render = this.render.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.pool.add(this.scene);

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // Setup camera
    this.camera = new PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.z = 4;
    this.camera.position.y = 4;
    this.camera.position.x = 4;
    this.camera.lookAt(0, 1, 0);

    // Setup renderer
    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setClearColor('#202030');
    this.mount.appendChild(this.renderer.domElement);

    // Populate scene
    this.addLights();
    this.addObjects();

    // Setup window resize callback.
    window.addEventListener('resize', this.handleResize);

    this.start();
  }

  public dispose() {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    this.mount.removeChild(this.renderer.domElement);
    this.pool.dispose();
  }

  private addLights() {
    // Ambient light
    const skyColor = 0xb1e1ff; // light blue
    const groundColor = 0xb97a20; // brownish orange
    const intensity = 0.5;
    const hLight = new HemisphereLight(skyColor, groundColor, intensity);
    this.scene.add(hLight);

    // Directional light
    const sunlight = new DirectionalLight('#ffffff', 0.3);
    sunlight.position.set(5, 7, 4);
    sunlight.target.position.set(0, 0, 0);
    this.scene.add(sunlight);
    this.scene.add(sunlight.target);
  }

  private addObjects() {
    // Add a generated mesh to the scene.
    const mesh = this.generator.generate(this.pool);
    this.scene.add(mesh);

    // Add a wireframe version of the same object
    const wireframe = new WireframeGeometry(mesh.geometry);
    const line = new LineSegments(wireframe);
    // line.material.depthTest = false;
    // line.material.opacity = 0.25;
    // line.material.transparent = true;

    this.scene.add(line);
  }

  private render() {
    // this.processInput();
    // this.updateCameraPosition();
    this.renderer.render(this.scene, this.camera);
    setTimeout(() => {
      this.frameId = window.requestAnimationFrame(this.render);
    }, 1000 / 40);
  }

  private start() {
    if (!this.frameId) {
      this.frameId = window.requestAnimationFrame(this.render);
    }
  }

  private stop() {
    window.cancelAnimationFrame(this.frameId!);
    this.frameId = null;
  }

  private handleResize() {
    const width = this.mount.clientWidth;
    const height = this.mount.clientHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.render();
  }
}
