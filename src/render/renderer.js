import * as THREE from 'three';
import { COLORS } from './colors.js';
import { buildScene, disposeGroup } from './sceneBuilder.js';

export class DungeonRenderer {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.background);
    this.camera = null;
    this.renderer = null;
    this.canvas = null;
    this.dungeonGroup = null;
    this._gridSize = null;
    this._zoomFactor = 1;
    this._onResize = () => this._resize();
  }

  static ZOOM_STEP = 0.12;
  static ZOOM_MIN = 0.35;
  static ZOOM_MAX = 2.5;
  static FRUSTUM_PADDING = 18;

  /**
   * @param {HTMLCanvasElement} canvas
   */
  init(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
    this.camera.position.set(0, 50, 0);
    this.camera.lookAt(0, 0, 0);
    this.camera.up.set(0, 0, -1);

    window.addEventListener('resize', this._onResize);
    this._resize();
    this._animate();
  }

  /**
   * @param {object} dungeon
   */
  render(dungeon) {
    if (this.dungeonGroup) {
      this.scene.remove(this.dungeonGroup);
      disposeGroup(this.dungeonGroup);
    }

    this.dungeonGroup = buildScene(dungeon);
    this.scene.add(this.dungeonGroup);

    const [gridW, gridH] = dungeon.metadata.gridSize;
    this._gridSize = [gridW, gridH];
    this._zoomFactor = 1;
    const cx = gridW / 2;
    const cz = gridH / 2;
    this.camera.position.set(cx, 50, cz);
    this.camera.lookAt(cx, 0, cz);
    this._fitCamera(gridW, gridH);
  }

  zoomIn() {
    this._zoomFactor = Math.max(
      DungeonRenderer.ZOOM_MIN,
      this._zoomFactor - DungeonRenderer.ZOOM_STEP
    );
    this._applyZoom();
  }

  zoomOut() {
    this._zoomFactor = Math.min(
      DungeonRenderer.ZOOM_MAX,
      this._zoomFactor + DungeonRenderer.ZOOM_STEP
    );
    this._applyZoom();
  }

  resetZoom() {
    this._zoomFactor = 1;
    this._applyZoom();
  }

  _applyZoom() {
    if (this._gridSize) {
      this._fitCamera(this._gridSize[0], this._gridSize[1]);
    }
  }

  _fitCamera(gridW, gridH) {
    if (!this.canvas || !this.camera) return;
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    const frustumSize =
      (Math.max(gridW, gridH) + DungeonRenderer.FRUSTUM_PADDING) * this._zoomFactor;
    const halfH = frustumSize / 2;
    const halfW = (frustumSize * aspect) / 2;
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
  }

  _resize() {
    if (!this.canvas || !this.renderer) return;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    if (this._gridSize) {
      this._fitCamera(this._gridSize[0], this._gridSize[1]);
    } else if (this.dungeonGroup?.userData.gridSize) {
      const [gw, gh] = this.dungeonGroup.userData.gridSize;
      this._fitCamera(gw, gh);
    }
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    if (this.renderer && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    if (this.dungeonGroup) {
      this.scene.remove(this.dungeonGroup);
      disposeGroup(this.dungeonGroup);
    }
    this.renderer?.dispose();
  }
}
