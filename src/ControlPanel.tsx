import styled from '@emotion/styled';
import React, { useCallback, useEffect } from 'react';
import { FC } from 'react';
import { Button } from './controls/Button';
import { ControlGroup } from './controls/ControlGroup';
import { MeshGenerator } from './MeshGenerator';
import { PropertyEdit } from './properties/PropertyEdit';
import { colors } from './styles';

const ControlPanelElt = styled.aside`
  background-color: ${colors.controlPaletteBg};
  color: ${colors.text};
  flex: 0 1 20rem;
  font-weight: 500;
  font-size: 16px;
  padding: 16px;
`;

interface Props {
  generator: MeshGenerator;
}

export const ControlPanel: FC<Props> = ({ generator }) => {
  const onClickReset = useCallback(() => generator.reset(), [generator]);

  useEffect(() => {
    try {
      const json = localStorage.getItem('sapling-doc');
      if (json) {
        generator.fromJson(JSON.parse(json));
      }
    } catch (e) {
      console.error('Invalid JSON', e);
    }

    const onUnload = () => {
      localStorage.setItem('sapling-doc', JSON.stringify(generator.toJson()));
    };

    window.addEventListener('unload', onUnload);
    return () => window.removeEventListener('unload', onUnload);
  }, [generator]);

  return (
    <ControlPanelElt>
      {Object.keys(generator.properties).map(key => {
        const group = generator.properties[key];
        return (
          <ControlGroup key={key}>
            <header>{key}</header>
            {Object.keys(group).map(propName => (
              <PropertyEdit key={propName} name={propName} property={group[propName]} />
            ))}
          </ControlGroup>
        );
      })}
      <Button onClick={onClickReset}>Reset</Button>
    </ControlPanelElt>
  );
};
