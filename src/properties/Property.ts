import { useCallback, useEffect, useState } from 'react';

/** Property metadata for editing. */
export interface PropertyDefn {
  type: 'integer' | 'float';
  init?: number;
  minVal?: number;
  maxVal?: number;
  increment?: number;
  precision?: number; // 0 = integer, undefined == unlimited
  logScale?: boolean;
  enumVals?: string[];
}

export type UnsubscribeCallback = () => void;

/** An editable property that notifies listeners. */
export class Property {
  private data: number;
  private listeners = new Set<(value: number) => void>();

  constructor(private defn: PropertyDefn) {
    this.data = defn.init || 0;
  }

  /** Update the value of the property. */
  public update(value: number) {
    if (this.data !== value) {
      this.data = value;
      this.emit();
    }
  }

  /** Return the current value of the property. */
  public get value(): number {
    return this.data;
  }

  public emit() {
    this.listeners.forEach(listener => listener(this.data));
    globalListeners.forEach(listener => listener(this));
  }

  public subscribe(callback: (value: number) => void): UnsubscribeCallback {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public reset() {
    this.update(this.defn.init || 0);
  }

  public get type() {
    return this.defn.type;
  }

  public get minVal(): number {
    return this.defn.minVal ?? 0;
  }

  public get maxVal(): number {
    return this.defn.maxVal ?? this.defn.init ?? 1;
  }

  public get precision(): number {
    return this.defn.type === 'integer' ? 0 : this.defn.precision ?? 2;
  }

  public get increment(): number {
    return this.defn.increment ?? (this.maxVal - this.minVal) / 100;
  }
}

export interface PropertyGroup {
  [key: string]: Property;
}

export interface PropertyMap {
  [key: string]: PropertyGroup;
}

/** React hook that automatically subscribes to the value. */
export function usePropertyValue<T>(prop: Property): number {
  const [, updateState] = useState({});

  useEffect(() => {
    const disconnect = prop.subscribe(() => updateState({}));
    return () => disconnect();
  }, [prop]);

  return prop.value;
}

/** React hook that automatically subscribes to the value and allows updates. */
export function useProperty<T>(prop: Property): [number, (value: number) => void] {
  const value = usePropertyValue(prop);
  return [value, useCallback(newVal => prop.update(newVal), [prop])];
}

const globalListeners = new Set<(prop: Property) => void>();

export function addGlobalListener(callback: (value: Property) => void): UnsubscribeCallback {
  globalListeners.add(callback);
  return () => globalListeners.delete(callback);
}
