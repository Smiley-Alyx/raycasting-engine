import type { Player } from '../types/game';

export type AddRotToAngle = (rot: number, angle: number) => number;

export type DrawRay = (dist: number, x: number, offset: number, img: string | number) => void;

export function castRays(args: {
  player: Player;
  getViewWidth: () => number;
  addRotToAngle: AddRotToAngle;
  drawRay: DrawRay;
}): void;
