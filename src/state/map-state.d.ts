import type { Grid, Legend } from '../types/game';

declare let map: Grid | null;

declare let cellLegend: Legend;

export function setMap(newMap: Grid): void;

export function getMap(): Grid | null;

export function setLegend(newLegend: Legend): void;

export function getLegend(): Legend;

export function hitWall(x: number, y: number): boolean;

export function getCellMaterial(xMap: number, yMap: number): string | number;
