import { Box2, Color } from 'three';
import { LeafSplineSegment, LeafStamp } from './leaf';

interface LeafImageProps {
  colors: number[];
}

const showGrid = false;

export function drawLeafTexture(
  canvas: HTMLCanvasElement,
  leaf: LeafSplineSegment[],
  stamps: LeafStamp[],
  bounds: Box2,
  props: LeafImageProps
) {
  const [color0, color1] = props.colors;
  const [color2, color3] = props.colors;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.resetTransform();
    ctx.globalAlpha = 0;
    ctx.clearRect(0, 0, 128, 128);

    if (showGrid) {
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'green';

      for (let x = 0; x <= 128; x += 32) {
        ctx.strokeRect(x, 0, x, 128);
      }
      for (let z = 0; z <= 128; z += 32) {
        ctx.strokeRect(0, z, 128, z);
      }
    }

    let maxWidth = 0;
    let maxLength = 0;
    leaf.forEach(l => {
      maxWidth = Math.max(maxWidth, l.x0, l.x1, l.x2, l.x3);
      maxLength = Math.max(maxLength, l.y0, l.y1, l.y2, l.y3);
    });

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
    const gradient1 = ctx.createLinearGradient(-maxWidth * 0.6, 0, maxWidth * 0.6, 0);
    // const gradient1 = ctx.createLinearGradient(0, 0, 0, maxLength);
    gradient1.addColorStop(0, new Color(color1).getStyle());
    gradient1.addColorStop(0.5, new Color(color0).getStyle());
    gradient1.addColorStop(0.5, new Color(color2).getStyle());
    gradient1.addColorStop(1, new Color(color3).getStyle());

    // const gradient2 = ctx.createLinearGradient(0, 0, -maxWidth * 0.6, 0);
    // gradient2.addColorStop(0, new Color(color2).getStyle());
    // gradient2.addColorStop(1, new Color(color3).getStyle());

    for (const stamp of stamps) {
      ctx.resetTransform();
      ctx.transform(sx, 0, 0, sy, -(bounds.min.x * sx), -(bounds.min.y * sy));
      ctx.translate(stamp.translate.x, stamp.translate.y);
      ctx.scale(stamp.scale, stamp.scale);
      ctx.rotate(stamp.angle);
      ctx.fillStyle = gradient1;
      drawLeafPath(ctx, leaf, 'both');
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
