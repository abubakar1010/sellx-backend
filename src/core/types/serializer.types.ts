/**
 * Generic serializer contract.
 * Every module serializer implements specific methods,
 * but they all follow this pattern:
 *   input = internal document/entity
 *   output = plain object safe for API response
 */
export type SerializerFn<TInput, TOutput> = (input: TInput) => TOutput;

export type ListSerializerFn<TInput, TOutput> = (input: TInput[]) => TOutput[];
