import React, { memo, useState, useEffect } from 'react';
import { SceneRenderer } from './SceneRenderer';

/** React component that displays a three.js scene. */
export const SceneView: React.FC<{ className?: string }> = memo(({ className }) => {
  const [elt, setElt] = useState<HTMLElement | null>(null);
  // const [engine, setEngine] = useState<SceneRenderer>();

  // We can't construct the renderer until we have an element to attach it to.
  useEffect(() => {
    if (elt) {
      const engine = new SceneRenderer(elt);
      // setEngine(engine);

      // Destroy renderer when element changes or this component goes out of scope.
      return () => engine.dispose();
    }
  }, [elt]);

  return <section ref={setElt} className={className} />;
});
