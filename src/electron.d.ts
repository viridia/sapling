import Electron from 'electron';
import fs from 'fs';
import path from 'path';

declare global {
  interface Window {
    require(moduleSpecifier: 'electron'): typeof Electron;
    require(moduleSpecifier: 'fs'): typeof fs;
    require(moduleSpecifier: 'path'): typeof path;
  }
}
