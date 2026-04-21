import eslint from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import eslintPluginImportX from 'eslint-plugin-import-x'
import eslintPluginLit from 'eslint-plugin-lit'
import eslintPluginWc from 'eslint-plugin-wc'
import eslintPluginLitA11y from 'eslint-plugin-lit-a11y'
import eslintPluginN from 'eslint-plugin-n'
import eslintPluginPromise from 'eslint-plugin-promise'
import eslintPluginNoOnlyTests from 'eslint-plugin-no-only-tests'
import globals from 'globals'

const productionFiles = ['src/**/*.js', 'src/**/*.ts']
const testFiles = ['test/**/*.js']

const config = [
  // Ignore build artifacts and dependencies
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      '*.min.js',
      '**/*.min.js',
    ],
  },
  // Rollup config file (uses Node.js globals)
  {
    files: ['rollup.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      ecmaVersion: 2023,
      sourceType: 'module',
    },
  },
  // Main production source files
  {
    files: productionFiles,
    plugins: {
      'import-x': eslintPluginImportX,
      lit: eslintPluginLit,
      wc: eslintPluginWc,
      'lit-a11y': eslintPluginLitA11y,
      n: eslintPluginN,
      promise: eslintPluginPromise,
      'no-only-tests': eslintPluginNoOnlyTests,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      ...eslintPluginLit.configs.recommended.rules,
      ...eslintPluginWc.configs.recommended.rules,
      ...eslintPluginLitA11y.configs.recommended.rules,
      'no-only-tests/no-only-tests': 'error',
      'class-methods-use-this': 'error',
      eqeqeq: 'error',
      'no-alert': 'error',
      'no-await-in-loop': 'error',
      'no-param-reassign': 'error',
      'prefer-const': 'error',
    },
  },

  // Import rules from import-x
  {
    files: productionFiles,
    ...eslintPluginImportX.configs['flat/recommended'],
  },

  // Node.js rules from eslint-plugin-n
  {
    files: productionFiles,
    plugins: {
      n: eslintPluginN,
    },
    rules: {
      'n/handle-callback-err': ['error', '^(err|error)$'],
      'n/no-callback-literal': 'error',
      'n/no-deprecated-api': 'error',
      'n/no-exports-assign': 'error',
      'n/no-new-require': 'error',
      'n/no-path-concat': 'error',
      'n/process-exit-as-throw': 'error',
    },
  },

  // Promise rules
  {
    files: productionFiles,
    plugins: {
      promise: eslintPluginPromise,
    },
    rules: {
      'promise/param-names': 'error',
    },
  },

  // Test files
  {
    files: testFiles,
    plugins: {
      'import-x': eslintPluginImportX,
      'no-only-tests': eslintPluginNoOnlyTests,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
      },
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      'import-x/no-extraneous-dependencies': ['error', {devDependencies: true}],
      'no-unused-expressions': 'off',
      'no-only-tests/no-only-tests': 'error',
    },
  },

  // Vitest config file
  {
    files: ['vitest.config.js'],
    plugins: {
      'import-x': eslintPluginImportX,
    },
    languageOptions: {
      globals: {
        ...globals.node,
      },
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      'import-x/no-unresolved': 'off',
    },
  },

  // TypeScript files
  {
    files: ['**/*.ts'],
    plugins: {
      'import-x': eslintPluginImportX,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      'no-undef': 'off',
    },
  },

  // ESLint recommended rules (must be last to allow overrides)
  eslint.configs.recommended,

  // no-unused-vars: allow unused variables in destructuring with rest operator
  // This mirrors the behavior of eslint-config-standard which did not flag
  // patterns like {extended, profile, ...rest} where the individual keys are
  // intentionally discarded and only the rest is used.
  {
    files: productionFiles,
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  // Prettier must be last to disable conflicting rules
  eslintConfigPrettier,
]

export default config
