import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tsEslint from 'typescript-eslint';

export default tsEslint.config(
    {
        // docs/** holds generated reference material for the client, not app source.
        ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'docs/**'],
    },
    js.configs.recommended,
    ...tsEslint.configs.recommended,
    {
        files: ['**/*.ts'],
        rules: {
            '@typescript-eslint/consistent-type-imports': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            'no-console': ['warn', { allow: ['error', 'warn'] }],
        },
    },
    eslintConfigPrettier,
);
