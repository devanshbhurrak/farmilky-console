/**
 * Typed wrapper for zodResolver that works correctly with Zod v4.
 *
 * Zod v4 changed the input type inference for coerced fields (e.g.
 * `z.coerce.number()` now has `input: unknown`), which causes a type mismatch
 * when `zodResolver` is paired with `useForm<OutputType>`. This helper casts
 * the resolver to the output type so TypeScript is satisfied without any loss
 * of runtime correctness.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import type { Resolver, FieldValues } from 'react-hook-form';
import type { ZodType } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function typedZodResolver<T extends FieldValues>(schema: ZodType<T, any, any>): Resolver<T> {
  return zodResolver(schema) as unknown as Resolver<T>;
}
