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
// import { minimizeShadow } from './collision';

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
    trunk: {
      seed: new Property({ type: 'integer', init: 200, minVal: 1, maxVal: 100000, increment: 1 }),
      length: new Property({ type: 'float', init: 3, minVal: 0.01, maxVal: 6, increment: 0.1 }),
      radius: new Property({ type: 'float', init: 0.3, minVal: 0.01, maxVal: 1 }),
      taper: new Property({ type: 'float', init: 0.7, minVal: 0, maxVal: 1 }),
      color: new Property({ type: 'rgb', init: 0xa08000 }),
    },
    branches: {
      firstFork: new Property({
        type: 'float',
        init: 1,
        minVal: 0,
        maxVal: 8,
      }),
      maxForks: new Property({ type: 'integer', init: 1, minVal: 0, maxVal: 10, increment: 1 }),
      firstBranch: new Property({
        type: 'float',
        init: 1,
        minVal: 0,
        maxVal: 8,
      }),
      branchInterval: new Property({
        type: 'float',
        init: 1,
        minVal: 0.1,
        maxVal: 10,
      }),
      forkProbability: new Property({
        type: 'float',
        init: 0,
        minVal: 0,
        maxVal: 1,
      }),
      forkRotation: new Property({
        type: 'float',
        init: 0,
        minVal: -Math.PI / 2,
        maxVal: Math.PI / 2,
        increment: 0.01,
      }),
      forkRotationVariation: new Property({
        type: 'float',
        init: 0,
        minVal: 0,
        maxVal: 2,
        increment: 0.01,
      }),
      primaryAngle: new Property({
        type: 'float',
        init: 0,
        minVal: 0,
        maxVal: 0.6,
        increment: 0.01,
      }),
      primaryAngleVariation: new Property({
        type: 'float',
        init: 0,
        minVal: 0,
        maxVal: Math.PI,
        increment: 0.05,
      }),
      // secondaryAngle: new Property({
      //   type: 'float',
      //   init: Math.PI,
      //   minVal: 0,
      //   maxVal: Math.PI * 2,
      //   increment: 0.1,
      //   precision: 2,
      // }),
      // secondaryAngleVariation: new Property({
      //   type: 'float',
      //   init: 0,
      //   minVal: 0,
      //   maxVal: Math.PI,
      //   increment: 0.05,
      //   precision: 2,
      // }),
      // secondaryScaleBase: new Property({
      //   type: 'float',
      //   init: 1,
      //   minVal: 0.3,
      //   maxVal: 1.5,
      //   increment: 0.05,
      // }),
      // secondaryScaleTip: new Property({
      //   type: 'float',
      //   init: 1,
      //   minVal: 0.3,
      //   maxVal: 1.5,
      //   increment: 0.05,
      // }),
      flexBase: new Property({ type: 'float', init: 0, minVal: -1, maxVal: 1, increment: 0.1 }),
      flexTip: new Property({ type: 'float', init: 0, minVal: -1, maxVal: 1, increment: 0.1 }),

      // * Average fork forkInterval (or prob?)
      // * Primary fork deviation angle
      // * Secondary fork deviation angle
      // * Secondary fork count
    },
    leafGroup: {
      fanSize: new Property({ type: 'integer', init: 1, minVal: 1, maxVal: 10, increment: 1 }),
      fanAngle: new Property({ type: 'float', init: 3, minVal: 0.01, maxVal: 6 }),
      angleVariation: new Property({ type: 'float', init: 0, minVal: 0, maxVal: 3 }),
      lateralDroop: new Property({ type: 'float', init: 0, minVal: -1.5, maxVal: 1.5 }),
      axialDroop: new Property({ type: 'float', init: 0, minVal: -1.5, maxVal: 1.5 }),
      taper: new Property({ type: 'float', init: 1, minVal: 0, maxVal: 2 }),
      phalanxCount: new Property({ type: 'integer', init: 0, minVal: 0, maxVal: 10, increment: 1 }),
      leafSpacing: new Property({ type: 'float', init: 20, minVal: 1, maxVal: 100 }),
      leafSpacingVariation: new Property({ type: 'float', init: 0, minVal: 0, maxVal: 3 }),
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
      colorLeftInner: new Property({ type: 'rgb', init: 0x444444 }),
      colorLeftOuter: new Property({ type: 'rgb', init: 0x444444 }),
      colorRightInner: new Property({ type: 'rgb', init: 0x444444 }),
      colorRightOuter: new Property({ type: 'rgb', init: 0x444444 }),
    },
  };

  constructor() {
    this.unsubscribe = addGlobalListener(() => {
      this.modified = true;
    });

    this.barkMesh = new Mesh(this.barkGeometry, this.barkMaterial);
    this.barkMesh.name = 'bark';
    this.barkOutlineMesh = new Mesh(this.barkGeometry, this.barkOutlineMaterial);
    this.barkOutlineMesh.name = 'barkOutline';
    this.leafMesh = new Mesh(this.leafGeometry, this.leafMaterial);
    this.leafMesh.name = 'leaf';

    this.barkOutlineMaterial.side = BackSide;

    this.leafMaterial.side = DoubleSide;
    this.leafMaterial.transparent = true;
    this.leafMaterial.alphaTest = 0.2;
    this.leafMaterial.name = 'leaf';

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

    // Make a group representing the whole tree.
    const group = new Group();
    group.name = name;
    scene.add(group);

    // Do this instead of calling 'add' to prevent breakage of the original scene hierarchy.
    // TODO: Make outline mesh optional
    group.children.push(this.barkMesh, this.barkOutlineMesh, this.leafMesh);

    // Add custom data
    this.barkOutlineMaterial.userData = { outline: 0.008 };

    // Instantiate a exporter
    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (gltf: any) => {
        binary
          ? download(gltf, `${name}.glb`, 'model/gltf-binary')
          : download(JSON.stringify(gltf), `${name}.gltf`, 'model/gltf-binary');
      },
      { binary }
    );
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

    this.rnd = new Prando(this.properties.trunk.seed.value);

    const positionArray: number[] = [];
    const indexArray: number[] = [];
    this.leafMeshInstances.length = 0;
    this.growBranch(positionArray, indexArray);

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
    this.barkMaterial.color = new Color(this.properties.trunk.color.value);
    this.barkMaterial.name = 'bark';
    this.barkOutlineMesh.geometry = this.barkGeometry;
    this.barkOutlineMaterial.name = 'outline';

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

  private growBranch(positionArray: number[], indexArray: number[]) {
    const taper = this.properties.trunk.taper.value;
    const targetLength = this.properties.trunk.length.value;
    const baseRadius = this.properties.trunk.radius.value;
    const maxForks = this.properties.branches.maxForks.value;
    const forkRotation = this.properties.branches.forkRotation.value;
    const forkRotationVariation = this.properties.branches.forkRotationVariation.value;
    const primaryAngle = this.properties.branches.primaryAngle.value;
    const flexBase = this.properties.branches.flexBase.value;
    const flexTip = this.properties.branches.flexTip.value;

    // const branchScaleRadius = 0.5;
    // const branchScaleLength = 0.3;
    const leafSizeStart = 0.5;

    // Note: Lengths are presumed to be in meters
    const segmentLength = 0.3;
    const numSectors = 6; // Number of polygon faces around the circumference
    const firstFork = this.properties.branches.firstFork.value;
    // const forkInterval = this.properties.branches.forkInterval.value;
    const branchInterval = this.properties.branches.branchInterval.value;
    const forkProbability = this.properties.branches.forkProbability.value;
    // const branchSpacing = 0.02 * targetLength;

    const addSegmentNodeVertices = (transform: Matrix4, t: number) => {
      const radius = baseRadius * Math.pow(taper, t);
      for (let i = 0; i < numSectors; i += 1) {
        const angle = (i * 2 * Math.PI) / numSectors;
        const vertex = new Vector3(
          radius * Math.sin(angle),
          0,
          radius * Math.cos(angle)
        ).applyMatrix4(transform);
        positionArray.push(vertex.x, vertex.y, vertex.z);
      }
    };

    const grow = (
      transform: Matrix4,
      currentLength: number,
      targetLength: number,
      firstFork: number,
      forkLevel: number,
      forkNormal: Vector3
    ) => {
      const position = new Vector3();
      const forward = new Vector3();
      const rotation = new Matrix4();
      // const prevAngles: number[] = [];

      // Add the ring of vertices at the base of the branch.
      let prevRingIndex = positionArray.length / 3;
      let ringIndex = prevRingIndex;
      addSegmentNodeVertices(transform, currentLength / targetLength);

      // Add additional rings and connect the segments.
      let segmentStart = currentLength;
      while (currentLength < targetLength) {
        if (currentLength < firstFork) {
          // Step by 1 segment until we get to first fork point.
          currentLength = Math.min(currentLength + segmentLength, firstFork, targetLength);

          transform.multiply(new Matrix4().makeTranslation(0, currentLength - segmentStart, 0));
          segmentStart = currentLength;
          ringIndex = positionArray.length / 3;
          addSegmentNodeVertices(transform, currentLength / targetLength);
          this.addSegmentFaces(indexArray, numSectors, prevRingIndex, ringIndex);
          prevRingIndex = ringIndex;

          continue;
        } else {
          // Step by 1 branch interval until we encounter a branch.
          const segmentEnd = Math.min(segmentStart + segmentLength, targetLength);
          currentLength = Math.min(currentLength + branchInterval, segmentEnd);
          if (currentLength < segmentEnd && this.rnd.next() >= forkProbability) {
            // It's a branch, rather than a fork.
            continue;
          }
        }

        // nextBranch = Math.min(currentLength + branchInterval, targetLength);

        // const thisSegmentLength = Math.min(segmentLength, targetLength - currentLength);
        // const segmentEnd = currentLength + thisSegmentLength;
        // // let radius = initialRadius * Math.pow(taper, currentLength / targetLength);

        // while (forkLevel < maxForks && currentLength < segmentEnd) {
        //   currentLength = Math.min(currentLength + branchInterval, segmentEnd);
        //   // Otherwise, it's a branch.
        // }

        // if (forkLevel > 0) {
        //   while (nextFork >= currentLength && nextFork <= segmentEnd) {
        //     const dy = nextFork - currentLength;
        //     let yAngle = minimizeShadow(this.rnd, prevAngles);
        //     const translateY = new Matrix4().makeTranslation(0, dy, 0);
        //     const rotationY = new Matrix4().makeRotationY(yAngle);
        //     const rotationX = new Matrix4().makeRotationX(branchAngle);
        //     const branchTransform = transform
        //       .clone()
        //       .multiply(translateY)
        //       .multiply(rotationY)
        //       .multiply(rotationX);
        //     grow(
        //       position,
        //       // branchTransform,
        //       direction,
        //       currentLength,
        //       (targetLength - nextBranch) * branchScaleLength,
        //       radius * branchScaleRadius,
        //       forkLevel - 1
        //     );

        //     nextFork += branchSpacing;
        //     prevAngles.unshift(yAngle);
        //     if (prevAngles.length > 5) {
        //       prevAngles.length = 5;
        //     }
        //   }
        // }

        // Curve branches up or down based on gravity bias
        position.setFromMatrixPosition(transform);
        rotation.extractRotation(transform);
        forward.set(0, 1, 0).applyMatrix4(rotation);
        const up = new Vector3(0, 1, 0);
        const normal = up.clone().cross(forward);
        if (normal.length() > 0.01) {
          const flex = flexBase + ((flexTip - flexBase) * currentLength) / targetLength;
          const gravityRotation = new Matrix4().makeRotationAxis(normal, flex * 2);
          transform.copy(rotation).premultiply(gravityRotation).setPosition(position);
        }

        // Extend branch segment
        transform.multiply(new Matrix4().makeTranslation(0, currentLength - segmentStart, 0));
        segmentStart = currentLength;
        ringIndex = positionArray.length / 3;
        addSegmentNodeVertices(transform, currentLength / targetLength);
        this.addSegmentFaces(indexArray, numSectors, prevRingIndex, ringIndex);
        prevRingIndex = ringIndex;

        if (forkLevel < maxForks) {
          const forkTransform = transform.clone();
          transform.multiply(new Matrix4().makeRotationAxis(forkNormal, primaryAngle));
          forkTransform.multiply(new Matrix4().makeRotationAxis(forkNormal, -primaryAngle));

          const forkNormal2 = forkNormal.clone();

          rotation.extractRotation(transform);
          forward.set(0, 1, 0).applyMatrix4(rotation).normalize();
          forkNormal.cross(forward);
          rotation.makeRotationAxis(
            forward,
            forkRotation + this.rnd.next(-1, 1) * forkRotationVariation
          );
          forkNormal.applyMatrix4(rotation);

          rotation.extractRotation(forkTransform);
          forward.set(0, 1, 0).applyMatrix4(rotation).normalize();
          forkNormal2.cross(forward);
          rotation.makeRotationAxis(
            forward,
            forkRotation + this.rnd.next(-1, 1) * forkRotationVariation
          );
          forkNormal2.applyMatrix4(rotation);

          forkLevel += 1;
          grow(forkTransform, currentLength, targetLength, 0, forkLevel, forkNormal2);
        }
      }

      // Endpoint
      transform.multiply(new Matrix4().makeTranslation(0, segmentLength / 10, 0));
      this.addBranchEnd(positionArray, transform);
      const endpointIndex = ringIndex + numSectors;
      for (let i = 0; i < numSectors; i += 1) {
        const i2 = (i + 1) % numSectors;
        indexArray.push(ringIndex + i, ringIndex + i2, endpointIndex);
      }

      position.setFromMatrixPosition(transform);
      rotation.extractRotation(transform);
      forward.set(0, 1, 0).applyMatrix4(rotation).normalize();
      const up = new Vector3(0, 1, 0);
      const normal = up.clone().cross(forward).normalize();
      if (normal.length() > 0.01) {
        const binormal = normal.clone().cross(forward).normalize();
        transform.makeBasis(normal, forward, binormal).setPosition(position);
      }

      const leafSize = leafSizeStart;
      this.leafMeshInstances.push(
        transform
          .clone()
          .scale(new Vector3(leafSize, leafSize, leafSize))
          .multiply(new Matrix4().makeRotationX(-Math.PI / 2))
      );
    };

    grow(new Matrix4(), 0, targetLength, firstFork, 0, new Vector3(1, 0, 0));
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
      this.createLeafFaces(scaledBounds, positionArray, texCoordArray, indexArray, li);
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
    transform: Matrix4
  ) {
    const lateralDroop = this.properties.leafGroup.lateralDroop.value;
    const axialDroop = this.properties.leafGroup.axialDroop.value;

    const { x: width, y: length } = bounds.getSize(new Vector2());

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
      const z = dz > 0 ? cosAxial * dz : dz;
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
    const fanSize = this.properties.leafGroup.fanSize.value;
    const fanAngle = this.properties.leafGroup.fanAngle.value;
    const angleVariation = this.properties.leafGroup.angleVariation.value;
    const taper = this.properties.leafGroup.taper.value;
    const phalanxCount = this.properties.leafGroup.phalanxCount.value;
    const leafSpacing = this.properties.leafGroup.leafSpacing.value;
    const leafSpacingVariation = this.properties.leafGroup.leafSpacingVariation.value;
    const result: LeafStamp[] = [];

    result.push({
      angle: 0,
      scale: 1,
      translate: new Vector2(0, 0),
    });

    for (let i = 1; i < fanSize; i += 1) {
      let scale = Math.pow(taper, i / (fanSize - 1));
      result.push({
        angle: (i * fanAngle) / (fanSize - 1) + this.rnd.next(-0.5, 0.5) * angleVariation,
        scale,
        translate: new Vector2(0, 0),
      });
      result.push({
        angle: (-i * fanAngle) / (fanSize - 1) + this.rnd.next(-0.5, 0.5) * angleVariation,
        scale,
        translate: new Vector2(0, 0),
      });
    }

    let pos = 0;
    for (let i = 0; i < phalanxCount; i += 1) {
      pos -= leafSpacing;

      result.push({
        angle: fanAngle + this.rnd.next(-0.5, 0.5) * angleVariation,
        scale: taper,
        translate: new Vector2(
          0,
          pos + this.rnd.next(-0.5, 0.5) * leafSpacing * leafSpacingVariation
        ),
      });

      result.push({
        angle: -fanAngle + this.rnd.next(-0.5, 0.5) * angleVariation,
        scale: taper,
        translate: new Vector2(
          0,
          pos + this.rnd.next(-0.5, 0.5) * leafSpacing * leafSpacingVariation
        ),
      });
    }

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
