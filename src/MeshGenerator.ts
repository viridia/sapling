import {
  BufferGeometry,
  Float32BufferAttribute,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  Vector3,
} from 'three';
import { addGlobalListener, Property, PropertyMap, UnsubscribeCallback } from './properties/Property';

/** Class which generates a collection of meshes and geometry for the tree model. */
export class MeshGenerator {
  private modified = true;
  private geometry = new BufferGeometry();
  private barkMaterial = new MeshLambertMaterial({ color: 0xa08000 });
  private unsubscribe: UnsubscribeCallback;
  private mesh: Mesh;

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
    this.mesh = new Mesh(this.geometry, this.barkMaterial);
  }

  public dispose() {
    this.geometry.dispose();
    this.barkMaterial.dispose();
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

    if (this.geometry) {
      this.geometry.dispose();
    }

    this.geometry = new BufferGeometry();
    this.geometry.setIndex(indexArray);
    this.geometry.setAttribute('position', new Float32BufferAttribute(positionArray, 3));
    this.geometry.computeVertexNormals();

    this.mesh.geometry = this.geometry;

    return this.mesh;
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
}
