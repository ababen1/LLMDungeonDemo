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
    this._onResize = () => this._resize();
  }

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
    const cx = gridW / 2;
    const cz = gridH / 2;
    this.camera.position.set(cx, 50, cz);
    this.camera.lookAt(cx, 0, cz);
    this._fitCamera(gridW, gridH);
  }

  _fitCamera(gridW, gridH) {
    if (!this.canvas || !this.camera) return;
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    const frustumSize = Math.max(gridW, gridH) + 4;
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
    if (this.dungeonGroup?.userData.gridSize) {
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
