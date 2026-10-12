import type { dice as dedice } from '../de/dice';

export const dice: Record<keyof typeof dedice, string> = {
  'dice.roller.twoD6': '2d6',
  'dice.roller.twoD6Table': '2d6 (table)',
  'dice.cube.aria': 'd6: {value}',
  'dice.face.title': 'd{sides}: {value}',
  'dice.face.sides': 'd{sides}',
  'dice.overlay.secret': 'secret',
};
