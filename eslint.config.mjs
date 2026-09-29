import { eslintConfig as common } from '@gewis/eslint-config-typescript';
import { eslintConfig as react } from '@gewis/eslint-config-react';
import { eslintConfig as prettier } from '@gewis/prettier-config';

export default [
  ...common,
  ...react,
  prettier,
  {
    settings: {
      'import/resolver': {
        typescript: {
          project: ['./tsconfig.json', './tsconfig.server.json'],
          conditionNames: ['types', 'import', 'require', 'node', 'browser', 'default'],
        },
      },
    },
  },
  // typescript-eslint shares one project service, which only knows the client tsconfig.json:
  // the tests (excluded from the server build) use it as default-project files with the
  // server's compiler options; the server sources are linted against tsconfig.server.json.
  {
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ['src/server/*.test.ts'], defaultProject: './tsconfig.server.json' },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['src/server/**/*.ts'],
    ignores: ['src/server/**/*.test.ts'],
    languageOptions: {
      parserOptions: { projectService: false, project: './tsconfig.server.json' },
    },
  },
];
