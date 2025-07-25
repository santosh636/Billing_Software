// .eslintrc.js
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Ignore built files
    ignores: ['dist/*'],

    // Enable import plugin rules
    plugins: ['import'],

    // Add import-related configurations on top of Expo’s base
    extends: [
      'plugin:import/errors',
      'plugin:import/warnings',
      'plugin:import/typescript',
    ],

    settings: {
      'import/resolver': {
        // Leverage your tsconfig.json paths and extensions
        typescript: {
          project: './tsconfig.json',
        },
        // Fallback for non-TS imports
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        },
      },
    },

    rules: {
      // (optional) Turn off unresolved errors for @/* since TS handles it
      'import/no-unresolved': 'error',
      // you can customize other import rules here
    },
  },
]);
