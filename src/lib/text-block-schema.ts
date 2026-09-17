import { z } from 'zod';
import { replacementFonts } from './pro-types';
const number = z.number().finite();
const id = z.string().min(1).max(128);
const color = z.string().regex(/^#[\da-f]{6}$/i);
export const textBlockSchema = z.object({
  id,
  page: z.number().int().min(0).max(99),
  objectIndex: z.number().int().nonnegative(),
  objectPath: z.array(z.number().int().min(0).max(30000)).min(2).max(17).optional(),
  text: z.string().max(10000),
  font: z.string().max(256),
  fontWeight: number.min(0).max(1000).optional(),
  fontItalic: z.boolean().optional(),
  fontCharacters: z.string().max(1024).optional(),
  fontCategory: z.enum(['sans', 'serif', 'mono']).optional(),
  replacementFont: z.enum(replacementFonts),
  size: number,
  color,
  paint: z
    .object({
      coords: z.array(number.min(-1e6).max(1e6)).length(4),
      colors: z.array(color).min(2).max(65),
    })
    .optional(),
  bounds: z.tuple([number, number, number, number]),
  matrix: z.array(number).length(6).optional(),
});
