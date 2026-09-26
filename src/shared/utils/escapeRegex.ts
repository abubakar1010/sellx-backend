/**
 * Escapes every regular-expression metacharacter in a string.
 *
 * Search terms reach MongoDB through `$regex`, where an unescaped term is both a
 * correctness bug (someone searching for "C++" matches nothing) and a denial of
 * service: a nested quantifier such as `(a+)+$` causes catastrophic backtracking
 * and pins a CPU core for the lifetime of the query.
 *
 * Always wrap user input with this before placing it in a `$regex`.
 */
export const escapeRegex = (value: string): string =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
