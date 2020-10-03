import { Box2, Color } from 'three';
import { LeafSplineSegment, LeafStamp } from './leaf';

interface LeafImageProps {
  colorLeftInner: number;
  colorLeftOuter: number;
  colorRightInner: number;
  colorRightOuter: number;
}

export function drawLeafTexture(
  canvas: HTMLCanvasElement,
  leaf: LeafSplineSegment[],
  stamps: LeafStamp[],
  bounds: Box2,
  props: LeafImageProps
) {
  // const twigAngle = Math.PI / 5;
  // const twigLength = 30;
  // const leafFan = 3;
  // console.log(bounds);

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.resetTransform();
    ctx.globalAlpha = 0;
    ctx.clearRect(0, 0, 128, 128);
    // ctx.globalAlpha = 1;
    // ctx.lineWidth = 2.5;
    // ctx.strokeStyle = 'green';

    // for (let x = 0; x <= 128; x += 32) {
    //   ctx.strokeRect(x, 0, x, 128);
    // }
    // for (let z = 0; z <= 128; z += 32) {
    //   ctx.strokeRect(0, z, 128, z);
    // }

    const sx = 128 / (bounds.max.x - bounds.min.x);
    const sy = 128 / (bounds.max.y - bounds.min.y);

    // ctx.strokeStyle = 'yellow';
    // ctx.transform(sx, 0, 0, sy, -(bounds.min.x * sx), -(bounds.min.y * sy));
    // ctx.strokeRect(
    //   bounds.min.x,
    //   bounds.min.y,
    //   bounds.max.x - bounds.min.x,
    //   bounds.max.y - bounds.min.y
    // );

    // Draw outline around leaves
    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'blue';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 1;
    for (const stamp of stamps) {
      ctx.resetTransform();
      ctx.transform(sx, 0, 0, sy, -(bounds.min.x * sx), -(bounds.min.y * sy));
      ctx.translate(stamp.translate.x, stamp.translate.y);
      ctx.scale(stamp.scale, stamp.scale);
      ctx.rotate(stamp.angle);
      ctx.lineWidth = 2.0 / stamp.scale;
      drawLeafPath(ctx, leaf);
      ctx.stroke();
    }

    // Fill leafs with gradient colors
    const gradient1 = ctx.createLinearGradient(0, 0, 15, 0);
    gradient1.addColorStop(0, new Color(props.colorLeftInner).getStyle());
    gradient1.addColorStop(1, new Color(props.colorLeftOuter).getStyle());

    const gradient2 = ctx.createLinearGradient(0, 0, -15, 0);
    gradient2.addColorStop(0, new Color(props.colorRightInner).getStyle());
    gradient2.addColorStop(1, new Color(props.colorRightOuter).getStyle());

    for (const stamp of stamps) {
      ctx.resetTransform();
      ctx.transform(sx, 0, 0, sy, -(bounds.min.x * sx), -(bounds.min.y * sy));
      ctx.translate(stamp.translate.x, stamp.translate.y);
      ctx.rotate(stamp.angle);
      ctx.fillStyle = gradient1;
      drawLeafPath(ctx, leaf, 'left');
      ctx.fill();
      ctx.fillStyle = gradient2;
      drawLeafPath(ctx, leaf, 'right');
      ctx.fill();
    }
  }
}

function drawLeafPath(
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
