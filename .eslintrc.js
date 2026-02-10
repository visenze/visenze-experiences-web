module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['plugin:react/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: ['react', 'react-hooks', '@typescript-eslint'],
  rules: {
    quotes: ['error', 'single', { avoidEscape: true }],
    'linebreak-style': ['error', 'unix'],
    semi: ['error', 'always'],
    'no-undef': 'off',

    'react/prop-types': 'off',
    'react/display-name': 'off',
    'react/react-in-jsx-scope': 'off',
    // very ineffective
    'react-hooks/exhaustive-deps': 'off',
    'no-restricted-syntax': 'off',
    'comma-dangle': ['error', 'always-multiline'],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  ignorePatterns: ['node_modules', 'dist', 'cjs', 'es', '*.test.*', 'stories', '*.json', '**/*.json'],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 12,
        sourceType: 'module',
      },
      extends: ['plugin:@typescript-eslint/recommended', 'plugin:@typescript-eslint/strict'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'error',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/member-delimiter-style': 'error',
      },
      settings: {
        react: {
          version: 'detect',
        },
      },
    },
    {
      files: ['src/**/*.tsx'],
      extends: ['airbnb-base', 'airbnb-typescript/base'],
      rules: {
        'max-len': ['error', { code: 180 }],
        'quotes': ['error', 'single', { 'avoidEscape': true, 'allowTemplateLiterals': true }],
        'jsx-quotes': ['error', 'prefer-single'],
        'object-curly-newline': ['error', {
          'ObjectExpression': { 'multiline': true, 'consistent': true },
          'ObjectPattern': { 'multiline': true, 'consistent': true },
          'ImportDeclaration': { 'multiline': true, 'consistent': true },
          'ExportDeclaration': { 'multiline': true, 'consistent': true },
        }],
        'import/order': ['error', {
          'groups': ['builtin', 'external', 'internal'],
          'alphabetize': { 'order': 'asc', 'caseInsensitive': true},
          'newlines-between': 'never',
        }],
        'sort-imports': ['error', {
          'ignoreDeclarationSort': true,
          'ignoreCase': true,
        }],
        'operator-linebreak': ['error', 'before', {
          'overrides': {
            '=': 'after',
            '+=': 'after',
            '-=': 'after',
            '*=': 'after',
            '/=': 'after',
          },
        }],
        'no-console': ['error', { 'allow': ['error', 'warn'] }],
        'no-param-reassign': ['error', { 'props': false }],
        'quote-props': ['error', 'consistent-as-needed'],
        'class-methods-use-this': 'off',
        'import/extensions': [
          'error',
          'ignorePackages',
          {
            '': 'never',
            js: 'never',
            jsx: 'never',
            ts: 'never',
            tsx: 'never',
          },
        ],
        'import/no-extraneous-dependencies': ['error', {
          devDependencies: [
            '**/*.spec.tsx',
            '**/*.spec.ts',
            '**/*.test.tsx',
            '**/*.test.ts',
            '**/test-utils/**',
            '**/mocks/**',
            'jest-setup.ts',
          ],
        }],
        // broken for any union type
        '@typescript-eslint/indent': 'off',
        // tailwind rules
        'tailwindcss/enforces-shorthand': 'error',
        'tailwindcss/no-contradicting-classname': 'error',
      },
      plugins: ['tailwindcss'],
    },
  ],
};
