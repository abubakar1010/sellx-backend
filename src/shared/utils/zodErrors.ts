import { z, type ZodError } from 'zod';

type ZodIssue = z.core.$ZodRawIssue;

export interface FieldError {
    field: string;
    message: string;
}

export interface FormattedZodError {
    message: string;
    errors: FieldError[];
}

const ACRONYMS: Record<string, string> = { id: 'ID', ids: 'IDs', url: 'URL', otp: 'OTP' };

/** `listingDurationHours` -> "Listing duration hours", `category_id` -> "Category ID". */
export const humanizeFieldName = (key: string): string => {
    const words = key
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .map((word) => ACRONYMS[word] ?? word);

    const sentence = words.join(' ');
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
};

const labelFor = (path: readonly PropertyKey[] | undefined): string => {
    const segments = (path ?? []).filter((segment) => typeof segment !== 'symbol');
    if (segments.length === 0) {
        return 'Request data';
    }

    const last = segments[segments.length - 1];
    if (typeof last === 'number') {
        const parent = segments[segments.length - 2];
        const parentLabel = typeof parent === 'string' ? humanizeFieldName(parent) : 'List';
        return `${parentLabel} (item ${last + 1})`;
    }

    return humanizeFieldName(String(last));
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
    number: 'must be a number',
    int: 'must be a whole number',
    bigint: 'must be a whole number',
    string: 'must be text',
    boolean: 'must be true or false',
    array: 'must be a list',
    date: 'must be a valid date',
};

const FORMAT_DESCRIPTIONS: Record<string, string> = {
    url: 'must be a valid URL',
    uuid: 'must be a valid ID',
    guid: 'must be a valid ID',
    datetime: 'must be a valid date and time',
    date: 'must be a valid date',
    time: 'must be a valid time',
};

const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? '' : 's'}`;

const tooSmallMessage = (
    label: string,
    issue: Extract<ZodIssue, { code: 'too_small' }>,
): string => {
    const minimum = Number(issue.minimum);

    switch (issue.origin) {
        case 'string':
            return minimum <= 1
                ? `${label} cannot be empty.`
                : `${label} must be at least ${plural(minimum, 'character')}.`;
        case 'array':
        case 'set':
            return minimum <= 1
                ? `${label} must have at least one item.`
                : `${label} must have at least ${plural(minimum, 'item')}.`;
        case 'date':
            return `${label} is too early.`;
        case 'file':
            return 'The file is too small.';
        default:
            return issue.inclusive === false
                ? `${label} must be greater than ${minimum}.`
                : `${label} must be at least ${minimum}.`;
    }
};

const tooBigMessage = (label: string, issue: Extract<ZodIssue, { code: 'too_big' }>): string => {
    const maximum = Number(issue.maximum);

    switch (issue.origin) {
        case 'string':
            return `${label} must be at most ${plural(maximum, 'character')}.`;
        case 'array':
        case 'set':
            return `${label} can have at most ${plural(maximum, 'item')}.`;
        case 'date':
            return `${label} is too late.`;
        case 'file':
            return 'The file is too large.';
        default:
            return issue.inclusive === false
                ? `${label} must be less than ${maximum}.`
                : `${label} must be at most ${maximum}.`;
    }
};

/**
 * Plain-language replacement for Zod's default messages ("Invalid input: expected number,
 * received NaN"). It only fills in messages a schema did not set itself — a message passed to a
 * schema or check always wins.
 */
export const friendlyZodMessage = (issue: ZodIssue): string => {
    const label = labelFor(issue.path);

    switch (issue.code) {
        case 'invalid_type':
            if (issue.input === undefined || issue.input === null) {
                return `${label} is required.`;
            }
            return `${label} ${TYPE_DESCRIPTIONS[issue.expected] ?? 'is invalid'}.`;
        case 'too_small':
            return tooSmallMessage(label, issue);
        case 'too_big':
            return tooBigMessage(label, issue);
        case 'invalid_value': {
            const options = issue.values.map(String);
            return options.length === 1
                ? `${label} must be "${options[0]}".`
                : `${label} must be one of: ${options.join(', ')}.`;
        }
        case 'invalid_format':
            if (issue.format === 'email') {
                return 'Please enter a valid email address.';
            }
            return `${label} ${FORMAT_DESCRIPTIONS[issue.format] ?? 'has an invalid format'}.`;
        case 'not_multiple_of':
            return `${label} must be a multiple of ${String(issue.divisor)}.`;
        case 'unrecognized_keys':
            return issue.keys.length === 1
                ? `Unexpected field: ${issue.keys[0]}.`
                : `Unexpected fields: ${issue.keys.join(', ')}.`;
        case 'invalid_key':
        case 'invalid_element':
            return `${label} contains an invalid value.`;
        default:
            return `${label} is invalid.`;
    }
};

/** Installs {@link friendlyZodMessage} as the fallback message for every Zod schema. */
export const registerZodErrorMessages = (): void => {
    z.config({ customError: friendlyZodMessage });
};

export const formatZodError = (error: ZodError): FormattedZodError => {
    const errors = error.issues.map((issue) => ({
        field: issue.path.map(String).join('.'),
        message: issue.message,
    }));

    return {
        message: errors[0]?.message ?? 'Please check the information you entered.',
        errors,
    };
};
