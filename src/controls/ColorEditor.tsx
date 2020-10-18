import React, {
  FC,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
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

interface ReducerState {
  rgbColor: Color;
  h: number;
  s: number;
  l: number;
}

interface ReducerAction {
  r?: number;
  g?: number;
  b?: number;
  h?: number;
  s?: number;
  l?: number;
}

const initialState: ReducerState = { rgbColor: new Color(), h: 0, s: 0, l: 1 };

const reducer = (state: Readonly<ReducerState>, action: ReducerAction): ReducerState => {
  if (action.r !== undefined || action.g !== undefined || action.b !== undefined) {
    let newState = { ...state, rgbColor: state.rgbColor.clone() };
    if (action.r !== undefined) {
      newState.rgbColor.r = action.r;
    }
    if (action.g !== undefined) {
      newState.rgbColor.g = action.g;
    }
    if (action.b !== undefined) {
      newState.rgbColor.b = action.b;
    }
    newState.rgbColor.getHSL(newState);
    return newState;
  } else if (action.h !== undefined) {
    return { ...state, h: action.h, rgbColor: new Color().setHSL(action.h, state.s, state.l) };
  } else if (action.s !== undefined) {
    return { ...state, s: action.s, rgbColor: new Color().setHSL(state.h, action.s, state.l) };
  } else if (action.l !== undefined) {
    return { ...state, l: action.l, rgbColor: new Color().setHSL(state.h, state.s, action.l) };
  }
  return state;
};

interface Props {
  name: string;
  value: Color;
  className?: string;
  onChange: (value: number) => void;
}

export const ColorEditor: FC<Props> = memo(({ className, name, value, onChange }) => {
  const [expanded, setExpanded] = useState(false);
  const [{ h, s, l, rgbColor }, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    dispatch({ r: value.r, g: value.g, b: value.b });
  }, [value]);

  const onToggleExpand = useCallback(() => {
    setExpanded(!expanded);
  }, [expanded]);

  useEffect(() => {
    const hexPrev = value.getHex();
    const hexNext = rgbColor.getHex();
    if (hexNext !== hexPrev) {
      onChange(hexNext);
    }
  }, [value, rgbColor, onChange]);

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
    () => [new Color().setHSL(h, 0, l).getStyle(), new Color().setHSL(h, 1, l).getStyle()],
    [h, l]
  );

  const lumGradient = useMemo(
    () => [
      new Color().setHSL(h, s, 0).getStyle(),
      new Color().setHSL(h, s, 0.5).getStyle(),
      new Color().setHSL(h, s, 1).getStyle(),
    ],
    [h, s]
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
                onChange={r => dispatch({ r })}
              />
              <ChannelValue>{Math.round(rgbColor.r * 256)}</ChannelValue>
            </Channel>
            <Channel>
              <ChannelName>G</ChannelName>
              <GradientSlider
                value={rgbColor.g}
                max={1}
                colors={greenGradient}
                onChange={g => dispatch({ g })}
              />
              <ChannelValue>{Math.round(rgbColor.g * 256)}</ChannelValue>
            </Channel>
            <Channel>
              <ChannelName>B</ChannelName>
              <GradientSlider
                value={rgbColor.b}
                max={1}
                colors={blueGradient}
                onChange={b => dispatch({ b })}
              />
              <ChannelValue>{Math.round(rgbColor.b)}</ChannelValue>
            </Channel>
            <Channel>
              <ChannelName>H</ChannelName>
              <GradientSlider
                value={h}
                max={1}
                colors={HUE_COLORS}
                onChange={h => dispatch({ h })}
              />
              <ChannelValue>{Math.round(h * 360)}</ChannelValue>
            </Channel>
            <Channel>
              <ChannelName>S</ChannelName>
              <GradientSlider
                value={s}
                max={1}
                colors={satGradient}
                onChange={s => dispatch({ s })}
              />
              <ChannelValue>{Math.round(s * 100) / 100}</ChannelValue>
            </Channel>
            <Channel>
              <ChannelName>L</ChannelName>
              <GradientSlider
                value={l}
                max={1}
                colors={lumGradient}
                onChange={l => dispatch({ l })}
              />
              <ChannelValue>{Math.round(l * 100) / 100}</ChannelValue>
            </Channel>
          </ColorChannels>
        </ColorDropdown>
      )}
    </ColorEditorElt>
  );
});
ColorEditor.displayName = 'ColorEditor';
