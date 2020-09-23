/** @jsx jsx */
import { jsx } from '@emotion/core';
import styled from '@emotion/styled';
import { useEffect, useState } from 'react';
import { ControlPanel } from './ControlPanel';
import { MeshGenerator } from './MeshGenerator';
import { SceneView } from './SceneView';

const SceneContainer = styled.section`
  flex: 1 1 0;
  position: relative;
  overflow: hidden;

  > section {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    right: 0;
    overflow: hidden;
  }
`;

function App() {
  const [generator] = useState(() => new MeshGenerator());
  const [scene, setScene] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (scene) {
      scene.appendChild(generator.canvas);
      return () => { scene.removeChild(generator.canvas); }
    }
  }, [scene, generator.canvas]);

  return (
    <div
      className="App"
      css={{
        position: 'absolute',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
      }}
    >
      <ControlPanel generator={generator} />
      <SceneContainer ref={setScene}>
        <SceneView generator={generator} />
      </SceneContainer>
    </div>
  );
}

export default App;
