import React, { FC, useCallback, useEffect, useState } from 'react';
import { Color } from 'three';
import { ColorEditor } from '../controls/ColorEditor';
import { ComboSlider } from '../controls/ComboSlider';
import { Property, useProperty } from './Property';

export const IntegerPropertyEdit: FC<{ name: string; property: Property }> = ({
  name,
  property,
}) => {
  const [value, setValue] = useProperty(property);

  return (
    <ComboSlider
      name={name}
      value={value}
      min={property.minVal}
      max={property.maxVal}
      precision={0}
      increment={1}
      onChange={setValue}
    />
  );
};

export const ScalarPropertyEdit: FC<{ name: string; property: Property }> = ({
  name,
  property,
}) => {
  const [value, setValue] = useProperty(property);

  return (
    <ComboSlider
      name={name}
      value={value}
      min={property.minVal}
      max={property.maxVal}
      precision={property.precision}
      increment={property.increment}
      onChange={setValue}
    />
  );
};

export const ColorPropertyEdit: FC<{ name: string; property: Property }> = ({ name, property }) => {
  const [color, setColor] = useState(() => new Color(property.value));

  // TODO: We need to come up with a way to update the color editor when the property
  // is reset from some source other than the color editor. If the color editor listens
  // to its own updates we get ugly precision loss.

  const onChange = useCallback(
    (value: number) => {
      color.setHex(value);
      property.update(value);
    },
    [color, property]
  );

  useEffect(
    () =>
      property.subscribe((prop, jump) => {
        color.setHex(property.value);
        if (jump) {
          setColor(new Color(color));
        }
      }),
    [color, property]
  );

  return <ColorEditor name={name} value={color} onChange={onChange} />;
};

export const PropertyEdit: FC<{ name: string; property: Property }> = ({ name, property }) => {
  switch (property.type) {
    case 'integer':
      return <IntegerPropertyEdit name={name} property={property} />;

    case 'float':
      return <ScalarPropertyEdit name={name} property={property} />;

    case 'rgb':
    case 'rgba':
      return <ColorPropertyEdit name={name} property={property} />;

    default:
      throw Error(`Invalid property type: ${property.type}`);
  }
};
