import React, { memo, useState, useEffect } from 'react';
import { MeshGenerator } from './MeshGenerator';
import { SceneRenderer } from './SceneRenderer';
import { TriangleCount } from './TriangleCount';

interface Props {
  className?: string;
  generator: MeshGenerator;
}

/** React component that displays a three.js scene. */
export const SceneView: React.FC<Props> = memo(({ className, generator }) => {
  const [elt, setElt] = useState<HTMLElement | null>(null);

  // We can't construct the renderer until we have an element to attach it to.
  useEffect(() => {
    if (elt) {
      const renderer = new SceneRenderer(elt, generator);

      // Destroy renderer when element changes or this component goes out of scope.
      return () => renderer.dispose();
    }
  }, [elt, generator]);

  return (
    <section ref={setElt} className={className}>
      <TriangleCount generator={generator} />
    </section>
  );
});
