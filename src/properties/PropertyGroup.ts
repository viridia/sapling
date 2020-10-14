import { ColorProperty } from './ColorProperty';
import { FloatProperty } from './FloatProperty';
import { IntegerProperty } from './IntegerProperty';
import { Property, SerializableGroup } from './Property';
import { RangeProperty, Range } from './RangeProperty';

type PropertyValue<T> = T extends IntegerProperty
  ? number
  : T extends FloatProperty
  ? number
  : T extends ColorProperty
  ? number
  : T extends RangeProperty
  ? Range
  : never;

export type GroupValues<T> = {
  readonly [P in keyof T]: PropertyValue<T[P]>;
};

export class PropertyGroup implements SerializableGroup {
  public get names(): string[] {
    return Object.getOwnPropertyNames(this);
  }

  public reset(): void {
    ColorProperty.syncColor = true;
    Object.getOwnPropertyNames(this).forEach(name => {
      const prop = (this as any)[name] as Property<any, any>;
      if (prop?.reset) {
        prop?.reset();
      }
    });
    ColorProperty.syncColor = false;
  }

  public toJson(): any {
    return this.values;
  }

  public fromJson(json: any): this {
    if (typeof json === 'object') {
      for (const propName in json) {
        const value = json[propName];
        const prop = (this as any)[propName] as Property<any, any>;
        switch (prop?.type) {
          case 'boolean': {
            if (typeof value === 'boolean') {
              prop.update(value);
            }
            break;
          }
          case 'float':
          case 'integer': {
            if (typeof value === 'number') {
              prop.update(value);
            }
            break;
          }
          case 'color': {
            if (typeof value === 'number') {
              ColorProperty.syncColor = true;
              prop.update(value);
              ColorProperty.syncColor = false;
            }
            break;
          }
          case 'range': {
            if (
              Array.isArray(value) &&
              value.length === 2 &&
              typeof value[0] === 'number' &&
              typeof value[1] === 'number'
            ) {
              prop.update(value);
            }
          }
        }
      }
    }
    return this;
  }

  public get values(): GroupValues<this> {
    const result: any = {};
    Object.getOwnPropertyNames(this).forEach(name => {
      result[name] = (this as any)[name].value;
    });
    return result;
  }
}

// export function getGroupValues<T extends PropertyGroup>(group: PropertyGroup): GroupValues<T> {
//   const result: any = {};
//   Object.getOwnPropertyNames(group).forEach(name => {
//     result[name] = group[name].value;
//   });
//   return result;
// }
