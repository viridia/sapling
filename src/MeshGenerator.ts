import {
  BackSide,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Vector3,
} from 'three';
import { OutlineMaterial } from './materials/OutlineMaterial';
import {
  addGlobalListener,
  Property,
  PropertyMap,
  UnsubscribeCallback,
} from './properties/Property';

/** Class which generates a collection of meshes and geometry for the tree model. */
export class MeshGenerator {
  private modified = true;
  private unsubscribe: UnsubscribeCallback;

  private barkGeometry = new BufferGeometry();
  private barkMaterial = new MeshLambertMaterial({ color: 0xa08000 });
  private barkOutlineMaterial = new OutlineMaterial();
  private barkMesh: Mesh;
  private barkOutlineMesh: Mesh;

  private leafGeometry = new BufferGeometry();
  private leafMaterial = new MeshBasicMaterial();
  private leafMesh: Mesh;
  private leafTexture: CanvasTexture;

  private group: Group = new Group();

  public canvas: HTMLCanvasElement;

  // This defines the list of editable properties for the tree.
  public properties: PropertyMap = {
    root: {
      radius: new Property({ type: 'float', init: 0.3, minVal: 0.01, maxVal: 1.0 }),
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
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.globalAlpha = 0;
      ctx.clearRect(0, 0, 128, 128);
      ctx.globalAlpha = 1;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'green';
      ctx.strokeRect(16, 16, 96, 96);
      ctx.strokeRect(0, 0, 128, 128);
      ctx.fillStyle = 'red';
      ctx.fillRect(32, 32, 64, 64);
    }

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

  public generate() {
    this.modified = false;

    const positionArray: number[] = [];
    const indexArray: number[] = [];
    this.growBranch(new Matrix4(), positionArray, indexArray);

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
    this.barkOutlineMesh.geometry = this.barkGeometry;

    this.createLeafMesh();
    return this.group;
  }

  public growBranch(transform: Matrix4, positionArray: number[], indexArray: number[]) {
    // Note: Lengths are presumed to be in meters
    let radius = this.properties.root.radius.value;
    const segmentLength = 1;
    const numSegmentsAlong = 3; // Number of polygon faces along the branch length.
    const numSectors = 8; // Number of polygon faces around the circumference

    // Add the ring of vertices at the base of the branch.
    let ringIndex = positionArray.length / 3;
    this.addVertexRing(positionArray, radius, numSectors, transform);

    // Add additional rings and connect the segments.
    for (let s = 0; s < numSegmentsAlong; s += 1) {
      radius *= 0.7;
      transform.multiply(new Matrix4().makeTranslation(0, segmentLength, 0));
      this.addVertexRing(positionArray, radius, numSectors, transform);
      this.addSegmentFaces(indexArray, numSectors, ringIndex);
      ringIndex += numSectors;
    }

    // Add endcap
    transform.multiply(new Matrix4().makeTranslation(0, segmentLength / 50, 0));
    this.addVertexRing(positionArray, radius, numSectors, transform);
    this.addSegmentFaces(indexArray, numSectors, ringIndex);
    ringIndex += numSectors;

    // Endpoint
    transform.multiply(new Matrix4().makeTranslation(0, segmentLength / 10, 0));
    this.addEndpoint(positionArray, transform);
    const endpointIndex = ringIndex + numSectors;
    for (let i = 0; i < numSectors; i += 1) {
      const i2 = (i + 1) % numSectors;
      indexArray.push(ringIndex + i, ringIndex + i2, endpointIndex);
    }
  }

  public addSegmentFaces(indexArray: number[], numSectors: number, prevRingIndex: number) {
    let nextRingIndex = prevRingIndex + numSectors;
    for (let i = 0; i < numSectors; i += 1) {
      const i2 = (i + 1) % numSectors;
      indexArray.push(prevRingIndex + i, prevRingIndex + i2, nextRingIndex + i);
      indexArray.push(prevRingIndex + i2, nextRingIndex + i2, nextRingIndex + i);
    }
  }

  public addVertexRing(
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

  public addEndpoint(positionArray: number[], transform: Matrix4) {
    const vertex = new Vector3(0, 0, 0).applyMatrix4(transform);
    positionArray.push(vertex.x, vertex.y, vertex.z);
  }

  public createLeafMesh() {
    const positionArray: number[] = [];
    const texCoordArray: number[] = [];
    const indexArray: number[] = [];

    const transform = new Matrix4();
    this.createLeafFaces(positionArray, texCoordArray, indexArray, transform, 0, .5, 0, 1, 1);
    transform.multiply(new Matrix4().makeTranslation(0, 1, 0));
    this.createLeafFaces(positionArray, texCoordArray, indexArray, transform, 0, 1, 1, 1, 1);
    transform.multiply(new Matrix4().makeTranslation(0, 1, 0));
    this.createLeafFaces(positionArray, texCoordArray, indexArray, transform, 0, 1.2, 0, 1, 1);
    transform.multiply(new Matrix4().makeTranslation(0, 1, 0));
    this.createLeafFaces(positionArray, texCoordArray, indexArray, transform, 0, -1, 0, 1, 1);

    transform.identity();
    transform.multiply(new Matrix4().makeRotationY(Math.PI));
    this.createLeafFaces(positionArray, texCoordArray, indexArray, transform, 0, .5, .5, 1, 1);
    transform.multiply(new Matrix4().makeTranslation(0, 1, 0));
    this.createLeafFaces(positionArray, texCoordArray, indexArray, transform, .5, .5, .9, 1, 1);
    transform.multiply(new Matrix4().makeTranslation(0, 1, 0));
    this.createLeafFaces(positionArray, texCoordArray, indexArray, transform, .5, -.5, -.9, 1, 1);
    transform.multiply(new Matrix4().makeTranslation(0, 1, 0));
    this.createLeafFaces(positionArray, texCoordArray, indexArray, transform, 0, -1.3, -.5, 1, 1);

    this.leafGeometry = new BufferGeometry();
    this.leafGeometry.setIndex(indexArray);
    this.leafGeometry.setAttribute('position', new Float32BufferAttribute(positionArray, 3));
    this.leafGeometry.setAttribute('uv', new Float32BufferAttribute(texCoordArray, 2));
    this.leafGeometry.computeVertexNormals();

    this.leafMaterial.map = this.leafTexture;
    this.leafMesh.geometry = this.leafGeometry;
  }

  public createLeafFaces(
    positionArray: number[],
    texCoordArray: number[],
    indexArray: number[],
    transform: Matrix4,
    axialOffset: number,
    lateralDroop: number,
    axialDroop: number,
    width: number,
    length: number
  ) {
    // Leaf-relative coordinates:
    // * z extends along the axis of the shoot
    // * y is perpendicular up
    // * X is perpendicular lateral

    const index = positionArray.length / 3;

    const sinTransverse = Math.sin(lateralDroop);
    const cosTransverse = Math.cos(lateralDroop);
    const sinAxial = Math.sin(axialDroop);
    const cosAxial = Math.cos(axialDroop);

    const lateralCurveBias = Math.abs(lateralDroop) * 0.1;
    const axialCurveBias = Math.abs(axialDroop) * 0.1;

    // Size of leaf mesh: 4 x 4 quads
    const numSteps = 4;

    // Generate vertices
    for (let dz = -0.5; dz <= 0.5; dz += 1 / numSteps) {
      for (let dx = -0.5; dx <= 0.5; dx += 1 / numSteps) {
        const ax = -Math.abs(dx);
        const az = -Math.max(0, dz);
        const oz = dz + (Math.abs(dz) - 0.5) * axialOffset;
        const hx = (1 - 16 * ((ax + .25) ** 2)) * lateralCurveBias;
        const hz = (1 - 16 * ((az + .25) ** 2)) * axialCurveBias;
        const x = cosTransverse * dx * width;
        const y = sinTransverse * (ax + hx) * width + sinAxial * (az + hz) * length;
        const z = ((dz > 0 ? cosAxial : 1) * oz + 0.5) * length;

        const vertex = new Vector3(x, y, z).applyMatrix4(transform);
        positionArray.push(vertex.x, vertex.y, vertex.z);
        texCoordArray.push(dx + 0.5, oz + 0.5);
      }
    }

    for (let z = 0; z < 4; z += 1) {
      for (let x = 0; x < 4; x += 1) {
        const i2 = index + z * 5 + x;
        indexArray.push(i2, i2 + 1, i2 + 5);
        indexArray.push(i2 + 5, i2 + 1, i2 + 6);
      }
    }
  }
}
