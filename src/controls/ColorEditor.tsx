import React, { FC, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { colors, fontFamilies } from '../styles';
import clsx from 'clsx';
import { Color } from 'three';
import { GradientSlider } from './GradientSlider';

const HUE_COLORS = ['#f00', '#ff0', '#0f0', '#0ff', '#00f', '#f0f', '#f00'];

const ColorEditorElt = styled.div`
  background-color: ${colors.comboSliderBg};
  display: flex;
  align-items: stretch;
  flex-direction: column;
  border: 1px solid ${colors.comboBorder};
  border-top: none;
  min-width: 64px;
  overflow: hidden;
`;

const TopRow = styled.div`
  display: inline-flex;
  align-items: center;
  height: 24px;
  line-height: 24px;
`;

const ColorEditorName = styled.span`
  color: ${colors.comboLabel};
  font-size: 12px;
  margin-left: 25px;
  margin-right: 4px;
  flex: 1;
`;

const ColorEditorValue = styled.span`
  font-family: ${fontFamilies.monospace};
  font-size: 14px;
  margin-right: 25px;
`;

const ColorEditorSwatch = styled.span`
  border: 1px solid #00000010;
  width: 16px;
  height: 12px;
  margin-right: 4px;
`;

const ColorDropdown = styled.div`
  border-top: 1px solid rgba(0, 0, 0, 0.2);
  display: flex;
  padding: 4px 8px;
`;

const ColorChannels = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const Channel = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  margin-top: 4px;
  line-height: 16px;

  &:first-of-type {
    margin-top: 0;
  }

  > .control {
    flex: 1;
  }
`;

const ChannelName = styled.span`
  color: ${colors.comboLabel};
  font-size: 12px;
  width: 16px;
`;

const ChannelValue = styled.span`
  color: ${colors.comboText};
  font-family: ${fontFamilies.monospace};
  font-size: 14px;
  width: 32px;
  text-align: end;
`;

interface Props {
  name: string;
  value: Color;
  className?: string;
  onChange: (value: number) => void;
}

export const ColorEditor: FC<Props> = memo(({ className, name, value, onChange }) => {
  const [expanded, setExpanded] = useState(false);

  // While this control is active, HSL is the source of truth, not RGB - avoids precision
  // loss and gimble-lock.
  const [hue, setHue] = useState(0);
  const [sat, setSat] = useState(0);
  const [lum, setLum] = useState(0);

  const onToggleExpand = useCallback(() => {
    setExpanded(!expanded);
  }, [expanded]);

  const updateHSL = useCallback((color: Color) => {
    const { h, s, l } = color.getHSL({ h: 0, s: 0, l: 0.5 });
    setHue(h);
    setSat(s);
    setLum(l);
  }, []);

  useEffect(() => {
    updateHSL(value);
  }, [value, updateHSL]);

  const rgbColor = useMemo(() => new Color().setHSL(hue, sat, lum), [hue, sat, lum]);

  useEffect(() => {
    onChange(rgbColor.getHex());
  }, [rgbColor, onChange]);

  const state = useMemo(() => {
    return {
      setR: (n: number) => {
        const color = rgbColor.clone();
        color.r = n;
        updateHSL(color);
      },
      setG: (n: number) => {
        const color = rgbColor.clone();
        color.g = n;
        updateHSL(color);
      },
      setB: (n: number) => {
        const color = rgbColor.clone();
        color.b = n;
        updateHSL(color);
      },
    };
  }, [rgbColor, updateHSL]);

  const redGradient = useMemo(
    () => [
      new Color().setRGB(0, rgbColor.g, rgbColor.b).getStyle(),
      new Color().setRGB(255, rgbColor.g, rgbColor.b).getStyle(),
    ],
    [rgbColor.g, rgbColor.b]
  );

  const greenGradient = useMemo(
    () => [
      new Color().setRGB(rgbColor.r, 0, rgbColor.b).getStyle(),
      new Color().setRGB(rgbColor.r, 255, rgbColor.b).getStyle(),
    ],
    [rgbColor.r, rgbColor.b]
  );

  const blueGradient = useMemo(
    () => [
      new Color().setRGB(rgbColor.r, rgbColor.g, 0).getStyle(),
      new Color().setRGB(rgbColor.r, rgbColor.g, 255).getStyle(),
    ],
    [rgbColor.r, rgbColor.g]
  );

  const satGradient = useMemo(
    () => [
      new Color().setHSL(hue, 0, lum).getStyle(),
      new Color().setHSL(hue, 1, lum).getStyle(),
    ],
    [hue, lum]
  );

  const lumGradient = useMemo(
    () => [
      new Color().setHSL(hue, sat, 0).getStyle(),
      new Color().setHSL(hue, sat, 0.5).getStyle(),
      new Color().setHSL(hue, sat, 1).getStyle(),
    ],
    [hue, sat]
  );

  const ref = useRef<HTMLDivElement>(null);
  return (
    <ColorEditorElt ref={ref} className={clsx('control', 'color-editor', className)}>
      <TopRow onClick={onToggleExpand}>
        <ColorEditorName className="name">{name} </ColorEditorName>
        <ColorEditorSwatch className="value" style={{ backgroundColor: rgbColor.getStyle() }} />
        <ColorEditorValue>#{rgbColor.getHexString()}</ColorEditorValue>
      </TopRow>
      {expanded && (
        <ColorDropdown>
          <ColorChannels>
            <Channel>
              <ChannelName>R</ChannelName>
              <GradientSlider
                value={rgbColor.r}
                max={1}
                colors={redGradient}
                onChange={state.setR}
              />
              <ChannelValue>{Math.round(rgbColor.r * 256)}</ChannelValue>
            </Channel>
            <Channel>
              <ChannelName>G</ChannelName>
              <GradientSlider
                value={rgbColor.g}
                max={1}
                colors={greenGradient}
                onChange={state.setG}
              />
              <ChannelValue>{Math.round(rgbColor.g * 256)}</ChannelValue>
            </Channel>
            <Channel>
              <ChannelName>B</ChannelName>
              <GradientSlider
                value={rgbColor.b}
                max={1}
                colors={blueGradient}
                onChange={state.setB}
              />
              <ChannelValue>{Math.round(rgbColor.b)}</ChannelValue>
            </Channel>
            <Channel>
              <ChannelName>H</ChannelName>
              <GradientSlider value={hue} max={1} colors={HUE_COLORS} onChange={setHue} />
              <ChannelValue>{Math.round(hue * 360)}</ChannelValue>
            </Channel>
            <Channel>
              <ChannelName>S</ChannelName>
              <GradientSlider value={sat} max={1} colors={satGradient} onChange={setSat} />
              <ChannelValue>{Math.round(sat * 100) / 100}</ChannelValue>
            </Channel>
            <Channel>
              <ChannelName>L</ChannelName>
              <GradientSlider value={lum} max={1} colors={lumGradient} onChange={setLum} />
              <ChannelValue>{Math.round(lum * 100) / 100}</ChannelValue>
            </Channel>
          </ColorChannels>
        </ColorDropdown>
      )}
    </ColorEditorElt>
  );
});
ColorEditor.displayName = 'ColorEditor';
