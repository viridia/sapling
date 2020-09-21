import React, { FC } from 'react';
import { Property } from './Property';
import { ScalarPropertyEdit } from './ScalarPropertyEdit';

export const PropertyEdit: FC<{ name: string; property: Property }> = ({ name, property }) => {
  switch (property.type) {
    case 'integer':
    case 'float': {
      return <ScalarPropertyEdit name={name} property={property} />;
    }

    default:
      throw Error(`Invalid property type: ${property.type}`);
  }
};
