import {
  BackSide,
  Box2,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Scene,
  Vector2,
  Vector3,
} from 'three';
import { OutlineMaterial } from './materials/OutlineMaterial';
import {
  addGlobalListener,
  Property,
  PropertyMap,
  UnsubscribeCallback,
} from './properties/Property';
import Prando from 'prando';
import download from 'downloadjs';
import { buildLeafPath, calcLeafBounds } from './genLeafShape';
import { LeafSplineSegment, LeafStamp } from './leaf';
import { drawLeafTexture } from './genLeafTexture';
import { minimizeShadow } from './collision';

const GLTFExporter = require('./third-party/GLTFExporter.js');

/** Class which generates a collection of meshes and geometry for the tree model. */
export class MeshGenerator {
  private modified = true;
  private unsubscribe: UnsubscribeCallback;

  private barkGeometry = new BufferGeometry();
  private barkMaterial = new MeshStandardMaterial({ color: 0xa08000 });
  private barkOutlineMaterial = new OutlineMaterial(0.008);
  private barkMesh: Mesh;
  private barkOutlineMesh: Mesh;

  private leafGeometry = new BufferGeometry();
  private leafMaterial = new MeshStandardMaterial();
  private leafMesh: Mesh;
  private leafTexture: CanvasTexture;
  private leafMeshInstances: Matrix4[] = [];

  private group: Group = new Group();

  public canvas: HTMLCanvasElement;

  private rnd = new Prando(200);

  // This defines the list of editable properties for the tree.
  public properties: PropertyMap = {
    root: {
      seed: new Property({ type: 'integer', init: 200, minVal: 1, maxVal: 100000, increment: 1 }),
      radius: new Property({ type: 'float', init: 0.3, minVal: 0.01, maxVal: 1 }),
      color: new Property({ type: 'rgb', init: 0xa08000 }),
    },
    leaf: {
      length: new Property({ type: 'float', init: 60, minVal: 20, maxVal: 128, increment: 1 }),
      numSegments: new Property({ type: 'integer', init: 1, minVal: 1, maxVal: 12, increment: 1 }),
      serration: new Property({ type: 'float', init: 0, minVal: 0, maxVal: 1 }),
      jitter: new Property({ type: 'float', init: 0, minVal: 0, maxVal: 1 }),
      baseWidth: new Property({ type: 'float', init: 0.6, minVal: 0.01, maxVal: 1 }),
      baseTaper: new Property({ type: 'float', init: 0, minVal: -1, maxVal: 1 }),
      baseRake: new Property({ type: 'float', init: 0, minVal: 0, maxVal: 1 }),
      tipWidth: new Property({ type: 'float', init: 0.2, minVal: 0.01, maxVal: 1 }),
      tipTaper: new Property({ type: 'float', init: 0.2, minVal: -1, maxVal: 1 }),
      tipRake: new Property({ type: 'float', init: 0, minVal: 0, maxVal: 1 }),
      colorLeftInner: new Property({ type: 'rgb', init: 0x00dd00 }),
      colorLeftOuter: new Property({ type: 'rgb', init: 0x00bb00 }),
      colorRightInner: new Property({ type: 'rgb', init: 0x00cc00 }),
      colorRightOuter: new Property({ type: 'rgb', init: 0x00aa00 }),
    },
  };

  constructor() {
    this.unsubscribe = addGlobalListener(() => {
      this.modified = true;
    });

    this.barkMesh = new Mesh(this.barkGeometry, this.barkMaterial);
    this.barkOutlineMesh = new Mesh(this.barkGeometry, this.barkOutlineMaterial);
    this.leafMesh = new Mesh(this.leafGeometry, this.leafMaterial);

    this.barkOutlineMaterial.side = BackSide;

    this.leafMaterial.side = DoubleSide;
    this.leafMaterial.transparent = true;
    this.leafMaterial.alphaTest = 0.2;

    this.group.add(this.barkMesh);
    this.group.add(this.barkOutlineMesh);
    this.group.add(this.leafMesh);

    this.canvas = document.createElement('canvas');
    this.canvas.width = 128;
    this.canvas.height = 128;
    this.canvas.style.zIndex = '100';
    this.leafTexture = new CanvasTexture(this.canvas);
    this.leafMaterial.map = this.leafTexture;
  }

  public dispose() {
    this.group.remove(this.barkMesh);
    this.group.remove(this.barkOutlineMesh);
    this.group.remove(this.leafMesh);
    this.barkGeometry.dispose();
    this.barkMaterial.dispose();
    this.barkOutlineMaterial.dispose();
    this.leafGeometry.dispose();
    this.leafMaterial.dispose();
    this.unsubscribe();
  }

  public get isModified() {
    return this.modified;
  }

  public setModified() {
    this.modified = true;
  }

  public toJson() {
    const result: any = {};
    for (const key in this.properties) {
      const group = this.properties[key];
      const groupValues: any = {};
      for (const propId in group) {
        groupValues[propId] = group[propId].value;
      }
      result[key] = groupValues;
    }
    return result;
  }

  public fromJson(json: any) {
    for (const key in json) {
      const group = json[key];
      const props = this.properties[key];
      if (typeof group === 'object' && typeof props === 'object') {
        for (const propId in group) {
          const value = group[propId];
          const prop = props[propId];
          if (
            typeof value === 'number' &&
            prop &&
            (prop.type === 'float' ||
              prop.type === 'integer' ||
              prop.type === 'rgb' ||
              prop.type === 'rgba')
          ) {
            prop.update(value, true);
          }
        }
      }
    }
  }

  public downloadGltf(name: string) {
    const binary = true;

    // Temporary scene containing just what we want to export.
    const scene = new Scene();
    scene.name = 'sapling';
    scene.userData = { sapling: this.toJson() };
    // Do this instead of calling 'add' to prevent breakage of the original scene hierarchy.
    scene.children.push(this.barkMesh, this.barkOutlineMesh, this.leafMesh);

    // Add custom data
    this.barkOutlineMaterial.userData = { outline: 0.008 };

    // Instantiate a exporter
    const exporter = new GLTFExporter();
    if (binary) {
      exporter.parse(
        scene,
        (gltf: any) => {
          download(gltf, `${name}.glb`, 'model/gltf-binary');
        },
        { binary: true }
      );
    } else {
      exporter.parse(
        scene,
        (gltf: any) => {
          download(JSON.stringify(gltf), `${name}.gltf`, 'model/gltf-binary');
        },
        { binary: false }
      );
    }
  }

  public reset() {
    for (const key in this.properties) {
      const group = this.properties[key];
      for (const propId in group) {
        group[propId].reset();
      }
    }
  }

  public generate() {
    this.modified = false;

    this.rnd = new Prando(this.properties.root.seed.value);

    const positionArray: number[] = [];
    const indexArray: number[] = [];
    this.growBranch(
      new Matrix4(),
      positionArray,
      indexArray,
      3,
      this.properties.root.radius.value,
      1
    );

    if (this.barkGeometry) {
      this.barkGeometry.dispose();
    }

    if (this.leafGeometry) {
      this.leafGeometry.dispose();
    }

    this.barkGeometry = new BufferGeometry();
    this.barkGeometry.setIndex(indexArray);
    this.barkGeometry.setAttribute('position', new Float32BufferAttribute(positionArray, 3));
    this.barkGeometry.computeVertexNormals();
    this.barkMesh.geometry = this.barkGeometry;
    this.barkMaterial.color = new Color(this.properties.root.color.value);
    this.barkOutlineMesh.geometry = this.barkGeometry;

    // Compute the outline of a single leaf
    const leafOutline = buildLeafPath(
      {
        length: this.properties.leaf.length.value,
        baseWidth: this.properties.leaf.baseWidth.value,
        baseTaper: this.properties.leaf.baseTaper.value,
        tipWidth: this.properties.leaf.tipWidth.value,
        tipTaper: this.properties.leaf.tipTaper.value,
        numSegments: this.properties.leaf.numSegments.value,
        baseRake: this.properties.leaf.baseRake.value,
        tipRake: this.properties.leaf.tipRake.value,
        serration: this.properties.leaf.serration.value,
        jitter: this.properties.leaf.jitter.value,
      },
      this.rnd
    );
    const stamps = this.createLeafStamps();
    const bounds = calcLeafBounds(leafOutline, stamps);

    this.createLeafMesh(bounds);
    this.drawTexture(leafOutline, stamps, bounds);
    this.leafTexture.needsUpdate = true;
    return this.group;
  }

  private growBranch(
    transform: Matrix4,
    positionArray: number[],
    indexArray: number[],
    length: number,
    radius: number,
    numDivisions: number
  ) {
    const taper = 0.6;

    const prevAngles: number[] = [];

    // angleQueue

    // Note: Lengths are presumed to be in meters
    const segmentLength = 0.5;
    const numSectors = 8; // Number of polygon faces around the circumference
    const initialBranchSpacing = 0.3 * length;
    const branchSpacing = 0.02 * length;
    let nextBranch = initialBranchSpacing;

    // Add the ring of vertices at the base of the branch.
    let prevRingIndex = positionArray.length / 3;
    let ringIndex = prevRingIndex;
    this.addSegmentNodeVertices(positionArray, radius, numSectors, transform);

    // Add additional rings and connect the segments.
    let extent = 0;
    for (; extent < length; extent += segmentLength) {
      radius *= taper;

      if (numDivisions > 0) {
        while (nextBranch >= extent && nextBranch <= extent + segmentLength) {
          const dy = nextBranch - extent;
          let yAngle = minimizeShadow(this.rnd, prevAngles);
          const translateY = new Matrix4().makeTranslation(0, dy, 0);
          const rotationY = new Matrix4().makeRotationY(yAngle);
          const rotationX = new Matrix4().makeRotationX(Math.PI * 0.6);
          const branchTransform = transform
            .clone()
            .multiply(translateY)
            .multiply(rotationX)
            .premultiply(rotationY);
          this.growBranch(
            branchTransform,
            positionArray,
            indexArray,
            (length - nextBranch) * 0.3,
            radius * 0.5,
            numDivisions - 1
          );

          nextBranch += branchSpacing;
          prevAngles.unshift(yAngle);
          if (prevAngles.length > 5) {
            prevAngles.length = 5;
          }
        }
      }

      transform.multiply(
        new Matrix4().makeTranslation(0, Math.min(segmentLength, length - extent), 0)
      );
      ringIndex = positionArray.length / 3;
      this.addSegmentNodeVertices(positionArray, radius, numSectors, transform);
      this.addSegmentFaces(indexArray, numSectors, prevRingIndex, ringIndex);
      prevRingIndex = ringIndex;
    }

    // Add endcap
    ringIndex = positionArray.length / 3;
    transform.multiply(new Matrix4().makeTranslation(0, segmentLength / 50, 0));
    this.addSegmentNodeVertices(positionArray, radius, numSectors, transform);
    this.addSegmentFaces(indexArray, numSectors, prevRingIndex, ringIndex);

    // Endpoint
    transform.multiply(new Matrix4().makeTranslation(0, segmentLength / 10, 0));
    this.addBranchEnd(positionArray, transform);
    const endpointIndex = ringIndex + numSectors;
    for (let i = 0; i < numSectors; i += 1) {
      const i2 = (i + 1) % numSectors;
      indexArray.push(ringIndex + i, ringIndex + i2, endpointIndex);
    }

    if (numDivisions === 0) {
      this.leafMeshInstances.push(
        transform
          .clone()
          .scale(new Vector3(length + .1, length + .1, length + .1))
          .multiply(new Matrix4().makeRotationX(-Math.PI / 2))
      );
    }
  }

  private addSegmentFaces(
    indexArray: number[],
    numSectors: number,
    prevRingIndex: number,
    nextRingIndex: number
  ) {
    for (let i = 0; i < numSectors; i += 1) {
      const i2 = (i + 1) % numSectors;
      indexArray.push(prevRingIndex + i, prevRingIndex + i2, nextRingIndex + i);
      indexArray.push(prevRingIndex + i2, nextRingIndex + i2, nextRingIndex + i);
    }
  }

  private addSegmentNodeVertices(
    positionArray: number[],
    radius: number,
    numSectors: number,
    transform: Matrix4
  ) {
    for (let i = 0; i < numSectors; i += 1) {
      const angle = (i * 2 * Math.PI) / numSectors;
      const vertex = new Vector3(
        Math.sin(angle) * radius,
        0,
        Math.cos(angle) * radius
      ).applyMatrix4(transform);
      positionArray.push(vertex.x, vertex.y, vertex.z);
    }
  }

  private addBranchEnd(positionArray: number[], transform: Matrix4) {
    const vertex = new Vector3(0, 0, 0).applyMatrix4(transform);
    positionArray.push(vertex.x, vertex.y, vertex.z);
  }

  private createLeafMesh(bounds: Box2) {
    const positionArray: number[] = [];
    const texCoordArray: number[] = [];
    const indexArray: number[] = [];

    const scaledBounds = bounds.clone();
    scaledBounds.min.divideScalar(128);
    scaledBounds.max.divideScalar(128);

    this.leafMeshInstances.forEach(li => {
      this.createLeafFaces(scaledBounds, positionArray, texCoordArray, indexArray, li, 0.3, 0.1);
    });

    this.leafGeometry = new BufferGeometry();
    this.leafGeometry.setIndex(indexArray);
    this.leafGeometry.setAttribute('position', new Float32BufferAttribute(positionArray, 3));
    this.leafGeometry.setAttribute('uv', new Float32BufferAttribute(texCoordArray, 2));
    this.leafGeometry.computeVertexNormals();
    this.leafMaterial.map = this.leafTexture;
    this.leafMesh.geometry = this.leafGeometry;
  }

  private createLeafFaces(
    bounds: Box2,
    positionArray: number[],
    texCoordArray: number[],
    indexArray: number[],
    transform: Matrix4,
    lateralDroop: number,
    axialDroop: number
  ) {
    const size = bounds.getSize(new Vector2());
    const width = size.x;
    const length = size.y;

    // Leaf-relative coordinates:
    // * z extends along the axis of the shoot
    // * y is perpendicular up (normal to leaf face)
    // * x is perpendicular lateral (tangent to leaf face)

    const index = positionArray.length / 3;

    const sinLateral = Math.sin(lateralDroop);
    const cosLateral = Math.cos(lateralDroop);
    const sinAxial = Math.sin(axialDroop);
    const cosAxial = Math.cos(axialDroop);

    // Size of leaf mesh: 2 x 2 quads
    const numSteps = 2;

    const zs = [bounds.min.y, 0, bounds.max.y];

    // Generate vertices
    for (const dz of zs) {
      const zt = 1 - (dz - bounds.min.y) / length;
      const z = (dz > 0 ? cosAxial * dz : dz) * length;
      for (let dx = -0.5; dx <= 0.5; dx += 1 / numSteps) {
        const ax = -Math.abs(dx);
        const az = -Math.max(0, dz) * length;
        const x = cosLateral * dx * width;
        const y = sinLateral * ax * width + sinAxial * az;

        const vertex = new Vector3(x, y, z).applyMatrix4(transform);
        positionArray.push(vertex.x, vertex.y, vertex.z);
        texCoordArray.push(dx + 0.5, zt);

        // We want the center fold to be a sharp crease, so we need extra vertices.
        if (dx === 0) {
          positionArray.push(vertex.x, vertex.y, vertex.z);
          texCoordArray.push(dx + 0.5, zt);
        }
      }
    }

    const stride = numSteps + 2;
    for (let z = 0; z < numSteps; z += 1) {
      let i2 = index + z * stride;
      indexArray.push(i2, i2 + 1, i2 + stride);
      indexArray.push(i2 + stride, i2 + 1, i2 + stride + 1);

      i2 += 2;
      indexArray.push(i2, i2 + 1, i2 + stride);
      indexArray.push(i2 + stride, i2 + 1, i2 + stride + 1);
    }
  }

  private createLeafStamps(): LeafStamp[] {
    const result: LeafStamp[] = [];

    result.push({
      angle: 0,
      scale: 1,
      translate: new Vector2(0, 0),
    });

    result.push({
      angle: Math.PI * 0.4,
      scale: 1,
      translate: new Vector2(0, 0),
    });

    result.push({
      angle: -Math.PI * 0.4,
      scale: 1,
      translate: new Vector2(0, 0),
    });

    result.push({
      angle: Math.PI * 0.45,
      scale: 1,
      translate: new Vector2(0, -20),
    });

    result.push({
      angle: -Math.PI * 0.4,
      scale: 1,
      translate: new Vector2(0, -20),
    });

    result.push({
      angle: Math.PI * 0.35,
      scale: 1,
      translate: new Vector2(0, -40),
    });

    result.push({
      angle: -Math.PI * 0.45,
      scale: 1,
      translate: new Vector2(0, -40),
    });

    result.push({
      angle: Math.PI * 0.4,
      scale: 1,
      translate: new Vector2(0, -60),
    });

    result.push({
      angle: -Math.PI * 0.35,
      scale: 1,
      translate: new Vector2(0, -60),
    });

    result.push({
      angle: Math.PI * 0.37,
      scale: 1,
      translate: new Vector2(0, -80),
    });

    result.push({
      angle: -Math.PI * 0.41,
      scale: 1,
      translate: new Vector2(0, -80),
    });

    result.push({
      angle: Math.PI * 0.2,
      scale: 1,
      translate: new Vector2(0, 0),
    });

    result.push({
      angle: -Math.PI * 0.2,
      scale: 1,
      translate: new Vector2(0, 0),
    });

    return result;
  }

  private drawTexture(leaf: LeafSplineSegment[], stamps: LeafStamp[], bounds: Box2) {
    const props = this.properties.leaf;
    drawLeafTexture(this.canvas, leaf, stamps, bounds, {
      colorLeftInner: props.colorLeftInner.value,
      colorLeftOuter: props.colorLeftOuter.value,
      colorRightInner: props.colorRightInner.value,
      colorRightOuter: props.colorRightOuter.value,
    });
  }
}
