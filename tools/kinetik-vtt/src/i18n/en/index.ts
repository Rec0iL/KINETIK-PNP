// Alle englischen Texte. Der Typ verlangt genau die Schlüssel von de.
import type { Key } from '../de';
import { app } from './app';
import { pages } from './pages';
import { sheet } from './sheet';
import { gm } from './gm';
import { net } from './net';
import { wizard } from './wizard';
import { rules } from './rules';
import { model } from './model';
import { ui } from './ui';
import { rulebook } from './rulebook';
import { dice } from './dice';
import { map } from './map';
import { music } from './music';
import { legal } from './legal';

export const en: Record<Key, string> = {
  ...app,
  ...pages,
  ...sheet,
  ...gm,
  ...net,
  ...wizard,
  ...rules,
  ...model,
  ...ui,
  ...rulebook,
  ...dice,
  ...map,
  ...music,
  ...legal,
};
