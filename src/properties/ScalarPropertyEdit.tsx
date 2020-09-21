import React, { FC } from 'react';
import { ComboSlider } from '../controls/ComboSlider';
import { Property, useProperty } from './Property';

export const ScalarPropertyEdit: FC<{ name: string; property: Property }> = ({ name, property }) => {
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
