import {
  BackSide,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
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
import download from 'downloadjs';

const GLTFExporter = require('./third-party/GLTFExporter.js');

interface LeafSplineSegment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
}

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

  private group: Group = new Group();

  public canvas: HTMLCanvasElement;

  // This defines the list of editable properties for the tree.
  public properties: PropertyMap = {
    root: {
      radius: new Property({ type: 'float', init: 0.3, minVal: 0.01, maxVal: 1 }),
    },
    leaf: {
      length: new Property({ type: 'float', init: 60, minVal: 20, maxVal: 128, increment: 1 }),
      numSegments: new Property({ type: 'integer', init: 1, minVal: 1, maxVal: 12, increment: 1 }),
      serration: new Property({ type: 'float', init: 0, minVal: 0, maxVal: 1 }),
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
    this.drawTexture();

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

  public toGltf() {
    // Add cusotm data
    this.group.userData = { 'sapling': this.toJson() };
    this.barkOutlineMaterial.userData = { 'outline': 0.008 };

    // Instantiate a exporter
    const exporter = new GLTFExporter();
    exporter.parse(this.group, (gltf: any) => {
      const name = 'tree';
      download(gltf, `${name}.glb`, 'model/gltf-binary');
    }, { binary: true });
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
    this.drawTexture();
    this.leafTexture.needsUpdate = true;
    return this.group;
  }

  private growBranch(transform: Matrix4, positionArray: number[], indexArray: number[]) {
    // Note: Lengths are presumed to be in meters
    let radius = this.properties.root.radius.value;
    const segmentLength = 1;
    const numSegmentsAlong = 3; // Number of polygon faces along the branch length.
    const numSectors = 8; // Number of polygon faces around the circumference

    // Add the ring of vertices at the base of the branch.
    let ringIndex = positionArray.length / 3;
    this.addSegmentNodeVertices(positionArray, radius, numSectors, transform);

    // Add additional rings and connect the segments.
    for (let s = 0; s < numSegmentsAlong; s += 1) {
      radius *= 0.7;
      transform.multiply(new Matrix4().makeTranslation(0, segmentLength, 0));
      this.addSegmentNodeVertices(positionArray, radius, numSectors, transform);
      this.addSegmentFaces(indexArray, numSectors, ringIndex);
      ringIndex += numSectors;
    }

    // Add endcap
    transform.multiply(new Matrix4().makeTranslation(0, segmentLength / 50, 0));
    this.addSegmentNodeVertices(positionArray, radius, numSectors, transform);
    this.addSegmentFaces(indexArray, numSectors, ringIndex);
    ringIndex += numSectors;

    // Endpoint
    transform.multiply(new Matrix4().makeTranslation(0, segmentLength / 10, 0));
    this.addBranchEnd(positionArray, transform);
    const endpointIndex = ringIndex + numSectors;
    for (let i = 0; i < numSectors; i += 1) {
      const i2 = (i + 1) % numSectors;
      indexArray.push(ringIndex + i, ringIndex + i2, endpointIndex);
    }
  }

  private addSegmentFaces(indexArray: number[], numSectors: number, prevRingIndex: number) {
    let nextRingIndex = prevRingIndex + numSectors;
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

  private createLeafMesh() {
    const positionArray: number[] = [];
    const texCoordArray: number[] = [];
    const indexArray: number[] = [];

    const transform = new Matrix4();
    this.createLeafFaces(positionArray, texCoordArray, indexArray, transform, 0, 0.5, 0, 1, 1);
    transform.multiply(new Matrix4().makeTranslation(0, 1, 0));
    this.createLeafFaces(positionArray, texCoordArray, indexArray, transform, 0, 1, 1, 1, 1);
    transform.multiply(new Matrix4().makeTranslation(0, 1, 0));
    this.createLeafFaces(positionArray, texCoordArray, indexArray, transform, 0, 1.2, 0, 1, 1);
    transform.multiply(new Matrix4().makeTranslation(0, 1, 0));
    this.createLeafFaces(positionArray, texCoordArray, indexArray, transform, 0, -1, 0, 1, 1);

    transform.identity();
    transform.multiply(new Matrix4().makeRotationY(Math.PI));
    this.createLeafFaces(positionArray, texCoordArray, indexArray, transform, 0, 0.5, 0.5, 1, 1);
    transform.multiply(new Matrix4().makeTranslation(0, 1, 0));
    this.createLeafFaces(positionArray, texCoordArray, indexArray, transform, 0.5, 0.5, 0.9, 1, 1);
    transform.multiply(new Matrix4().makeTranslation(0, 1, 0));
    this.createLeafFaces(
      positionArray,
      texCoordArray,
      indexArray,
      transform,
      0.5,
      -0.5,
      -0.9,
      1,
      1
    );
    transform.multiply(new Matrix4().makeTranslation(0, 1, 0));
    this.createLeafFaces(positionArray, texCoordArray, indexArray, transform, 0, -1.3, -0.5, 1, 1);

    this.leafGeometry = new BufferGeometry();
    this.leafGeometry.setIndex(indexArray);
    this.leafGeometry.setAttribute('position', new Float32BufferAttribute(positionArray, 3));
    this.leafGeometry.setAttribute('uv', new Float32BufferAttribute(texCoordArray, 2));
    this.leafGeometry.computeVertexNormals();

    this.leafMaterial.map = this.leafTexture;
    this.leafMesh.geometry = this.leafGeometry;
  }

  private createLeafFaces(
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

    const sinLateral = Math.sin(lateralDroop);
    const cosLateral = Math.cos(lateralDroop);
    const sinAxial = Math.sin(axialDroop);
    const cosAxial = Math.cos(axialDroop);

    // Size of leaf mesh: 4 x 4 quads
    const numSteps = 2;

    // Generate vertices
    for (let dz = -0.5; dz <= 0.5; dz += 1 / numSteps) {
      for (let dx = -0.5; dx <= 0.5; dx += 1 / numSteps) {
        const ax = -Math.abs(dx);
        const az = -Math.max(0, dz);
        const oz = dz + (Math.abs(dz) - 0.5) * axialOffset;
        const x = cosLateral * dx * width;
        const y = sinLateral * ax * width + sinAxial * az * length;
        const z = ((dz > 0 ? cosAxial : 1) * oz + 0.5) * length;

        const vertex = new Vector3(x, y, z).applyMatrix4(transform);
        positionArray.push(vertex.x, vertex.y, vertex.z);
        texCoordArray.push(dx + 0.5, 0.5 - oz);
        if (dx === 0) {
          positionArray.push(vertex.x, vertex.y, vertex.z);
          texCoordArray.push(dx + 0.5, 0.5 - oz);
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

  private drawTexture() {
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.resetTransform();
      ctx.globalAlpha = 0;
      ctx.clearRect(0, 0, 128, 128);
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'green';

      for (let x = 0; x <= 128; x += 64) {
        ctx.strokeRect(x, 0, x, 128);
      }
      for (let z = 0; z <= 128; z += 64) {
        ctx.strokeRect(0, z, 128, z);
      }

      ctx.strokeStyle = 'black';
      ctx.fillStyle = 'blue';
      ctx.lineWidth = 2.0;
      ctx.lineJoin = 'round';
      const leaf = this.createLeafPath(ctx);

      ctx.resetTransform();
      ctx.translate(64, 40);
      this.drawLeafPath(ctx, leaf);
      ctx.stroke();

      ctx.resetTransform();
      ctx.translate(64, 40);
      ctx.rotate(Math.PI / 2);
      this.drawLeafPath(ctx, leaf);
      ctx.stroke();

      ctx.resetTransform();
      ctx.translate(64, 40);
      ctx.rotate(-Math.PI / 2);
      this.drawLeafPath(ctx, leaf);
      ctx.stroke();

      const props = this.properties.leaf;

      const gradient1 = ctx.createLinearGradient(0, 0, 15, 0);
      gradient1.addColorStop(0, new Color(props.colorLeftInner.value).getStyle());
      gradient1.addColorStop(1, new Color(props.colorLeftOuter.value).getStyle());

      const gradient2 = ctx.createLinearGradient(0, 0, -15, 0);
      gradient2.addColorStop(0, new Color(props.colorRightInner.value).getStyle());
      gradient2.addColorStop(1, new Color(props.colorRightOuter.value).getStyle());

      ctx.resetTransform();
      ctx.translate(64, 40);
      ctx.fillStyle = gradient1;
      this.drawLeafPath(ctx, leaf, 'left');
      ctx.fill();
      ctx.fillStyle = gradient2;
      this.drawLeafPath(ctx, leaf, 'right');
      ctx.fill();

      ctx.resetTransform();
      ctx.translate(64, 40);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = gradient1;
      this.drawLeafPath(ctx, leaf, 'left');
      ctx.fill();
      ctx.fillStyle = gradient2;
      this.drawLeafPath(ctx, leaf, 'right');
      ctx.fill();

      ctx.resetTransform();
      ctx.translate(64, 40);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = gradient1;
      this.drawLeafPath(ctx, leaf, 'left');
      ctx.fill();
      ctx.fillStyle = gradient2;
      this.drawLeafPath(ctx, leaf, 'right');
      ctx.fill();
    }
  }

  // Create a leaf path
  private createLeafPath(ctx: CanvasRenderingContext2D): LeafSplineSegment[] {
    const length = this.properties.leaf.length.value;
    const baseWidth = this.properties.leaf.baseWidth.value;
    const baseTaper = this.properties.leaf.baseTaper.value;
    const tipWidth = this.properties.leaf.tipWidth.value;
    const tipTaper = this.properties.leaf.tipTaper.value;
    const numSegments = this.properties.leaf.numSegments.value;

    const segment: LeafSplineSegment = {
      x0: 0,
      y0: 0,
      x1: length * baseWidth,
      y1: length * baseTaper,
      x2: length * tipWidth,
      y2: length * (1 - tipTaper),
      x3: 0,
      y3: length,
    };

    const segments: LeafSplineSegment[] = this.divideSegments(segment, numSegments);
    this.addSerration(segments, length);
    return segments;
  }

  private drawLeafPath(
    ctx: CanvasRenderingContext2D,
    segments: LeafSplineSegment[],
    side: 'left' | 'right' | 'both' = 'both'
  ) {
    ctx.beginPath();
    ctx.moveTo(segments[0].x0, segments[0].y0);

    if (side === 'left' || side === 'both') {
      segments.forEach(s => {
        ctx.lineTo(s.x0, s.y0);
        ctx.bezierCurveTo(s.x1, s.y1, s.x2, s.y2, s.x3, s.y3);
      });
    } else {
      const lastSegment = segments[segments.length - 1];
      ctx.lineTo(lastSegment.x3, lastSegment.y3);
    }

    if (side === 'right' || side === 'both') {
      const reverse = segments.slice().reverse();
      reverse.forEach(s => {
        ctx.lineTo(-s.x3, s.y3);
        ctx.bezierCurveTo(-s.x2, s.y2, -s.x1, s.y1, -s.x0, s.y0);
      });
    } else {
      const firstSegment = segments[0];
      ctx.lineTo(firstSegment.x0, firstSegment.y0);
    }

    ctx.closePath();
  }

  private divideSegments(segment: LeafSplineSegment, numDivisions: number): LeafSplineSegment[] {
    const { x0, y0, x1, y1, x2, y2, x3, y3 } = segment;

    if (numDivisions < 2) {
      return [segment];
    }

    const result: LeafSplineSegment[] = [];

    let t0: number;
    let t1 = 0;
    do {
      t0 = t1;
      t1 += 1 / numDivisions;

      if (t1 >= 0.99) {
        t1 = 1;
      }

      const u0 = 1.0 - t0;
      const u1 = 1.0 - t1;

      const qxa = x0 * u0 * u0 + x1 * 2 * t0 * u0 + x2 * t0 * t0;
      const qxb = x0 * u1 * u1 + x1 * 2 * t1 * u1 + x2 * t1 * t1;
      const qxc = x1 * u0 * u0 + x2 * 2 * t0 * u0 + x3 * t0 * t0;
      const qxd = x1 * u1 * u1 + x2 * 2 * t1 * u1 + x3 * t1 * t1;

      const qya = y0 * u0 * u0 + y1 * 2 * t0 * u0 + y2 * t0 * t0;
      const qyb = y0 * u1 * u1 + y1 * 2 * t1 * u1 + y2 * t1 * t1;
      const qyc = y1 * u0 * u0 + y2 * 2 * t0 * u0 + y3 * t0 * t0;
      const qyd = y1 * u1 * u1 + y2 * 2 * t1 * u1 + y3 * t1 * t1;

      const newSegment: LeafSplineSegment = {
        x0: qxa * u0 + qxc * t0,
        y0: qya * u0 + qyc * t0,

        x1: qxa * u1 + qxc * t1,
        y1: qya * u1 + qyc * t1,

        x2: qxb * u0 + qxd * t0,
        y2: qyb * u0 + qyd * t0,

        x3: qxb * u1 + qxd * t1,
        y3: qyb * u1 + qyd * t1,
      };

      result.push(newSegment);
    } while (t1 < 1);

    return result;
  }

  private addSerration(segments: LeafSplineSegment[], length: number) {
    const baseRake = this.properties.leaf.baseRake.value;
    const tipRake = this.properties.leaf.tipRake.value;
    const serration = this.properties.leaf.serration.value;
    const pointyness = 40 * serration;

    for (let i = 0; i < segments.length - 1; i += 1) {
      const s = segments[i];

      // The tangent of the curve at the end of the segment.
      const tangent = new Vector2(s.x3 - s.x0, s.y3 - s.y0).normalize();
      const normal = new Vector2(tangent.y, -tangent.x);
      const rake = baseRake + (i / segments.length) * (tipRake - baseRake) - 0.5;
      const displacement = normal
        .clone()
        .multiplyScalar(pointyness)
        .add(tangent.clone().multiplyScalar((rake * length) / segments.length));

      const p0 = new Vector2(s.x0, s.y0);
      const d3 = new Vector2(s.x3, s.y3).sub(p0).dot(tangent);
      const d1 = new Vector2(s.x1, s.y1).sub(p0).dot(tangent) / d3;
      const d2 = new Vector2(s.x2, s.y2).sub(p0).dot(tangent) / d3;

      s.x1 += d1 * displacement.x;
      s.x2 += d2 * displacement.x;
      s.x3 += displacement.x;

      s.y1 += d1 * displacement.y;
      s.y2 += d2 * displacement.y;
      s.y3 += displacement.y;
    }

    segments[segments.length - 1].y3 += pointyness;
    segments[segments.length - 1].y2 += pointyness;
  }
}
