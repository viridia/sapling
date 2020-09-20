/** @jsx jsx */
import { jsx } from '@emotion/core';
import styled from '@emotion/styled';
import { SceneView } from './SceneView';

const colors = {
  text: '#ccc',
};

const ControlPalette = styled.aside`
  background-color: #334;
  color: ${colors.text};
  flex: 0 1 20rem;
  font-weight: 500;
  font-size: 16px;
  padding: 16px;
`;

const Button = styled.button`
  border: 1px solid #111;
  border-radius: 4px;
  background: linear-gradient(0deg, #223 0%, #445 100%);
  color: ${colors.text};
  font-weight: 500;
  height: 2rem;
  padding: 0 16px;
  outline: none;
  &:focus {
    box-shadow: 0 0 1px 2px #88888844;
  }
`;

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
      <ControlPalette>
        <Button>Hello</Button>
      </ControlPalette>
      <SceneContainer>
        <SceneView />
      </SceneContainer>
    </div>
  );
}

export default App;
