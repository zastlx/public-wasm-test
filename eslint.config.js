import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
    { languageOptions: { globals: globals.node } },
    pluginJs.configs.recommended,
    {
        rules: {
            'block-scoped-var': 'error',
            'camelcase': 'error',
            'curly': 'error',
            'no-implicit-globals': 'error',
            'no-lonely-if': 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            'require-await': 'warn'
        }
    }
];