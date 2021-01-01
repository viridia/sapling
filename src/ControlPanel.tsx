import styled from '@emotion/styled';
import React, { useCallback, useEffect, useState } from 'react';
import { FC } from 'react';
import { Button } from './controls/Button';
import { MeshGenerator } from './MeshGenerator';
import { colors } from './styles';
import {
  PropertyGroupEdit,
  PropertyMap,
  RepeatingPropertyGroup,
  RepeatingPropertyGroupEdit,
} from './properties';
const { ipcRenderer } = window.require('electron');

const ControlPanelElt = styled.aside`
  background-color: ${colors.controlPaletteBg};
  color: ${colors.text};
  flex: 0 1 20rem;
  font-weight: 500;
  font-size: 16px;
  padding: 16px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    background-color: transparent;
    width: 7px;
    height: 7px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
  }

  &::-webkit-scrollbar-thumb:window-inactive {
    background-color: rgba(0, 0, 0, 0.1);
  }

  &::-webkit-scrollbar-corner {
    background-color: transparent;
  }
`;

const ButtonGroup = styled.section`
  align-self: stretch;
  > button {
    margin-right: -1px;
    flex: 1;

    &:not(:last-child) {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }
    &:not(:first-child) {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
    }
  }
  margin-bottom: 4px;
`;

interface Props {
  generator: MeshGenerator;
}

export const ControlPanel: FC<Props> = ({ generator }) => {
  const [, forceRefresh] = useState({});

  useEffect(() => {
    try {
      const str = localStorage.getItem('sapling-doc');
      if (str) {
        const json = JSON.parse(str);
        generator.fromJson(json);
        generator.name = json?.name || 'tree-model';
        generator.filePath = json?.filePath || undefined;
      }
    } catch (e) {
      console.error('Invalid JSON', e);
    }

    const onUnload = () => {
      const json = generator.toJson();
      json.name = generator.name;
      json.filePath = generator.filePath;
      localStorage.setItem('sapling-doc', JSON.stringify(json));
    };

    window.addEventListener('unload', onUnload);
    return () => window.removeEventListener('unload', onUnload);
  }, [generator]);

  useEffect(() => {
    const handler = () => {
      forceRefresh({});
    };
    return generator.fileChanged.subscribe(handler);
  }, [generator]);

  const onClickReset = useCallback(() => {
    generator.reset();
    generator.name = 'tree-model';
    generator.filePath = undefined;
    generator.fileChanged.emit();
  }, [generator]);

  const onClickSave = useCallback(() => {
    generator.saveToFile(generator.filePath!);
  }, [generator]);

  const onClickSaveAs = useCallback(() => {
    ipcRenderer
      .invoke('open-save-as', `${generator.name}.glb`, generator.filePath)
      .then(filePath => {
        if (filePath) {
          generator.saveToFile(filePath);
        }
      });
  }, [generator]);

  const onClickOpen = useCallback(() => {
    ipcRenderer.invoke('open-file').then(filePath => {
      generator.readFromFile(filePath);
    });
  }, [generator]);

  return (
    <ControlPanelElt>
      <ButtonGroup>
        <Button onClick={onClickReset}>Reset</Button>
        <Button onClick={onClickSave} disabled={!generator.filePath}>
          Save
        </Button>
        <Button onClick={onClickSaveAs}>Save As&hellip;</Button>
        <Button onClick={onClickOpen}>Open&hellip;</Button>
      </ButtonGroup>
      {Object.keys(generator.properties).map(key => {
        const group = (generator.properties as PropertyMap)[key];
        if (group instanceof RepeatingPropertyGroup) {
          return <RepeatingPropertyGroupEdit key={key} group={group} groupName={key} />;
        } else {
          return <PropertyGroupEdit key={key} group={group} groupName={key} />;
        }
      })}
    </ControlPanelElt>
  );
};
