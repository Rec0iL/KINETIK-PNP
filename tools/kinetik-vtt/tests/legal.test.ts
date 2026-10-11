import { describe, expect, it } from 'vitest';
import { COPYRIGHT, reveal } from '../src/lib/legal';

describe('legal', () => {
  it('dekodiert Base64-Felder wieder in Klartext (auch Umlaute)', () => {
    expect(reveal(Buffer.from('kontakt@example.org').toString('base64'))).toBe('kontakt@example.org');
    expect(reveal(Buffer.from('Grüße ß', 'utf8').toString('base64'))).toBe('Grüße ß');
  });

  it('Copyright nennt Jahr und Inhaber', () => {
    expect(COPYRIGHT).toBe('© 2026 Alexander Freidzon (Rec0iL)');
  });
});
