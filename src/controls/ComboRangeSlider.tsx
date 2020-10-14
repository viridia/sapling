import React, { FC, useCallback, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import styled from '@emotion/styled';
import { DragMethods, usePointerDrag } from './usePointerDrag';
import { MomentaryButton } from './MomentaryButton';
import { colors, linearGradient } from '../styles';
import { Range } from '../properties';
import { ControlName, ControlValue } from './Controls';

type DragMode = 'low' | 'high' | null;

const ComboRangeSliderElt = styled.div`
  display: inline-flex;
  position: relative;
  align-items: stretch;
  position: relative;
  border: 1px solid ${colors.comboBorder};
  border-top: none;
  height: 24px;
  min-width: 64px;
  overflow: hidden;
  user-select: none;
  cursor: ew-resize;

  &.textActive > .center {
    > .name,
    > .value {
      display: none;
    }

    > input {
      display: block;
    }
  }
`;

const ArrowButton = styled(MomentaryButton)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 25px;

  &:after {
    position: relative;
    font-size: 12px;
    line-height: 24px;
    color: ${colors.comboArrow};
  }

  &.active:after {
    color: #000;
  }

  &:hover:after {
    color: ${colors.comboArrowBgHover};
  }
`;

const ArrowButtonLeft = styled(ArrowButton)`
  &:after {
    content: '\\25c0';
  }
`;

const ArrowButtonRight = styled(ArrowButton)`
  &:after {
    content: '\\25b6';
  }
`;

const SliderContainer = styled.div`
  display: flex;
  position: relative;
  align-items: center;
  justify-content: flex-start;
  flex: 1;
  font-size: 14px;
  vertical-align: middle;
  line-height: calc(100%);
`;

const Input = styled.input`
  display: none;
  background-color: transparent;
  color: ${colors.comboTextEdit};
  position: absolute;
  text-align: center;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  width: 100%;
  border: none;
`;

const TrackContainer = styled.div`
  align-items: stretch;
  background-color: ${colors.comboSliderTrack};
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  right: 0;
`;

const Track = styled.div`
  height: 7px;
`;

function makeTrackGradient(low: number, high: number) {
  const cst = colors.comboSliderTrack;
  const cs = colors.comboSlider;
  const csr = colors.comboSliderRange;
  const p0 = `${low}%`;
  const p1 = `${high}%`;
  return linearGradient('to right', [
    [cs, 0],
    [cs, p0],
    [csr, p0],
    [csr, p1],
    [cst, p1],
    [cst, '100%'],
  ]);
}

interface Props {
  name: string;
  value: Range;
  min?: number;
  max: number;
  precision?: number; // 0 = integer, undefined == unlimited
  increment?: number;
  logScale?: boolean;
  className?: string;
  onChange: (value: Range) => void;
}

export const ComboRangeSlider: FC<Props> = ({
  name,
  value,
  min = 0,
  max,
  precision = 1,
  increment = 1,
  logScale = false,
  className,
  onChange,
}) => {
  const element = useRef<HTMLDivElement>(null);
  const inputEl = useRef<HTMLInputElement>(null);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragOrigin, setDragOrigin] = useState(0);
  const [dragValue, setDragValue] = useState(0);
  const [dragOtherValue, setDragOtherValue] = useState(0);
  const [textActive, setTextActive] = useState(false);

  const quantize = useCallback(
    (value: number) => {
      if (precision !== undefined) {
        const mag = 10 ** precision;
        return Math.round(value * mag) / mag;
      }
      return value;
    },
    [precision]
  );

  const setValue = useCallback(
    (value: Range) => {
      let [lo, hi] = value;
      lo = clamp(quantize(lo), min, max);
      hi = clamp(quantize(hi), lo, max);
      onChange([lo, hi]);
    },
    [max, min, onChange, quantize]
  );

  const buttonMethods = useMemo(() => {
    function update(amount: number) {
      if (amount > 0) {
        const inc = Math.min(amount, max - value[1]);
        setValue([value[0] + inc, value[1] + inc]);
      } else if (amount < 0) {
        const inc = Math.max(amount, min - value[0]);
        setValue([value[0] + inc, value[1] + inc]);
      }
    }
    return {
      onLeftChange(active: boolean) {
        if (active) {
          update(-increment);
        }
      },

      onLeftHeld() {
        update(-increment);
      },

      onRightChange(active: boolean) {
        if (active) {
          update(increment);
        }
      },

      onRightHeld() {
        update(increment);
      },
    };
  }, [increment, setValue, value, min, max]);

  const dragCallbacks = useMemo<DragMethods<HTMLElement>>(() => {
    function valueFromX(dx: number): number {
      let newValue = dragValue;
      if (logScale) {
        newValue = 2 ** (Math.log2(newValue) + dx * Math.log2(max - min + 1));
      } else {
        newValue += dx * (max - min);
      }
      return newValue;
    }

    return {
      onDragStart(ds) {
        const mode: DragMode = ds.y < 12 ? 'low' : 'high';
        setDragOrigin(ds.x);
        setDragMode(mode);
        setDragValue(mode === 'low' ? value[0] : value[1]);
        setDragOtherValue(mode === 'low' ? value[1] : value[0]);
      },

      onDragMove(ds) {
        if (element.current) {
          const v = valueFromX((ds.x - dragOrigin) / element.current.offsetWidth);
          if (dragMode === 'low') {
            setValue([v, dragOtherValue]);
          } else {
            setValue([Math.min(dragOtherValue, v), v]);
          }
        }
      },
    };
  }, [dragValue, logScale, max, min, value, dragOrigin, dragMode, setValue, dragOtherValue]);

  const dragMethods = usePointerDrag(dragCallbacks);

  const onDoubleClick = useCallback(() => {
    if (inputEl.current) {
      inputEl.current.value = formatRange(value, precision);
      inputEl.current.select();
      setTextActive(true);
      window.setTimeout(() => {
        inputEl.current?.focus();
      }, 5);
    }
  }, [precision, value]);

  const onBlurInput = useCallback(() => {
    if (inputEl.current) {
      setTextActive(false);
      const newValue = parseRange(inputEl.current.value);
      if (newValue) {
        setValue(newValue);
      }
    }
  }, [setValue]);

  const onInputKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && inputEl.current) {
        e.preventDefault();
        const newValue = parseRange(inputEl.current.value);
        if (newValue) {
          setValue(newValue);
          setTextActive(false);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (inputEl.current) {
          inputEl.current.value = formatRange(value, precision);
        }
        setTextActive(false);
      }
    },
    [setValue, value, precision]
  );

  function toPercent(value: number) {
    if (logScale) {
      return (Math.log2(value - min + 1) / Math.log2(max - min + 1)) * 100;
    } else {
      return ((value - min) / (max - min)) * 100;
    }
  }

  const percent0 = toPercent(value[0]);
  const percent1 = toPercent(value[1]);
  const grad0 = makeTrackGradient(percent0, percent0);
  const grad1 = makeTrackGradient(percent0, percent1);
  const displayVal = formatRange(value, precision);

  return (
    <ComboRangeSliderElt
      className={clsx('control', 'combo-slider', className, { textActive })}
      ref={element}
    >
      <TrackContainer>
        <Track style={{ backgroundImage: grad0 }} />
        <Track style={{ backgroundImage: grad1 }} />
      </TrackContainer>
      <ArrowButtonLeft
        className="left"
        onChange={buttonMethods.onLeftChange}
        onHeld={buttonMethods.onLeftHeld}
      />
      <SliderContainer {...dragMethods} className="center" onDoubleClick={onDoubleClick}>
        <ControlName className="name">{name}</ControlName>
        <ControlValue className="value">{displayVal}</ControlValue>
        <Input
          type="text"
          autoFocus={true}
          onKeyDown={onInputKey}
          onBlur={onBlurInput}
          ref={inputEl}
        />
      </SliderContainer>
      <ArrowButtonRight
        className="right"
        onChange={buttonMethods.onRightChange}
        onHeld={buttonMethods.onRightHeld}
      />
    </ComboRangeSliderElt>
  );
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatRange(value: Range, precision: number): string {
  return `${roundToPrecision(value[0], precision)} : ${roundToPrecision(value[1], precision)}`;
}

function parseRange(input: string): Range | null {
  const m = /^([\d\\.]+)\s+:\s+([\d\\.]+)$/.exec(input.trim());
  if (m) {
    const low = parseFloat(m[1]);
    const high = parseFloat(m[2]);
    if (!isNaN(low) && !isNaN(high)) {
      return [low, high];
    }
  }
  const m2 = /^[\d\\.]+$/.exec(input.trim());
  if (m2) {
    const val = parseFloat(m2[0]);
    if (!isNaN(val)) {
      return [val, val];
    }
  }
  return null;
}

function roundToPrecision(value: number, precision: number): number {
  const mag = 10 ** precision;
  return Math.round(value * mag) / mag;
}
