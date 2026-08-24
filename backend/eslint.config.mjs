// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
  {
    // Jest mock functions (jest.fn()) aren't real bound class methods, so
    // `expect(mock.method).toHaveBeenCalledWith(...)` — a completely
    // standard assertion — false-positives this rule in every spec file.
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    // Architectural fence (plan §6.3): every read/write goes through
    // StoredProcedureRunner. No TypeORM entities/repositories/query
    // builder anywhere else in the app.
    files: ['src/**/*.ts'],
    ignores: ['src/database/**', 'src/common/database/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'typeorm',
              importNames: ['Repository', 'EntityManager', 'getRepository', 'getManager'],
              message: 'Only src/common/database (StoredProcedureRunner) may touch TypeORM repositories/entity managers — use StoredProcedureRunner instead.',
            },
            {
              name: '@nestjs/typeorm',
              importNames: ['InjectRepository'],
              message: 'Only src/common/database (StoredProcedureRunner) may inject a TypeORM repository — use StoredProcedureRunner instead.',
            },
          ],
        },
      ],
    },
  },
);
