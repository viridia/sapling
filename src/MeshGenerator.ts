import {
  BufferGeometry,
  Float32BufferAttribute,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from 'three';
import { ResourcePool } from './ResourcePool';

export class MeshGenerator {
  public generate(pool: ResourcePool) {
    const positionArray: number[] = [];
    const indexArray: number[] = [];
    this.growBranch(new Matrix4(), positionArray, indexArray);

    const geometry = pool.add(new BufferGeometry());
    geometry.setIndex(indexArray);
    geometry.setAttribute('position', new Float32BufferAttribute(positionArray, 3));
    geometry.computeVertexNormals();

    const material = pool.add(new MeshBasicMaterial({ color: 0x808000 }));
    return new Mesh(geometry, material);
  }

  public growBranch(
    transform: Matrix4,
    positionArray: number[],
    indexArray: number[]
  ) {
    // Note: Lengths are presumed to be in meters
    let radius = 0.2;
    const segmentLength = 0.5;
    const numSegmentsAlong = 3; // Number of polygon faces along the branch length.
    const numSectors = 8; // Number of polygon faces around the circumference

    // Add the ring of vertices at the base of the branch.
    let prevRingIndex = positionArray.length / 3;
    this.addRing(positionArray, radius, numSectors, transform);

    // Add additional rings and connect the segments.
    for (let s = 0; s < numSegmentsAlong; s += 1) {
      radius *= 0.7;
      transform.multiply(new Matrix4().makeTranslation(0, segmentLength, 0));
      this.addRing(positionArray, radius, numSectors, transform);

      let nextRingIndex = prevRingIndex + numSectors;
      for (let i = 0; i < numSectors; i += 1) {
        const i2 = i < numSectors - 1 ? i + 1 : 0;
        indexArray.push(prevRingIndex + i, prevRingIndex + i2, nextRingIndex + i);
        indexArray.push(prevRingIndex + i2, nextRingIndex + i2, nextRingIndex + i);
      }
      prevRingIndex = nextRingIndex;
    }
  }

  public addRing(positionArray: number[], radius: number, numSectors: number, transform: Matrix4) {
    for (let i = 0; i < numSectors; i += 1) {
      const angle = (i * 2 * Math.PI) / numSectors;
      const vertex = new Vector3(
        Math.sin(angle) * radius,
        0,
        Math.cos(angle) * radius,
      ).applyMatrix4(transform);
      positionArray.push(vertex.x, vertex.y, vertex.z);
    }
  }
}
