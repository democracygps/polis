module.exports = {
  env: {
    node: true,
    es2022: true
  },
  extends: [
    'eslint:recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:react/recommended',
    'prettier'
  ],
  globals: {
    FB: 'readonly'
  },
  ignorePatterns: ['build'],
  overrides: [
    {
      files: ['src/**/*.js'],
      env: {
        browser: true,
        jquery: true
      }
    }
  ],
  parser: '@babel/eslint-parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['jsx-a11y', 'react', 'prettier'],
  rules: {
    camelcase: 'off',
    'jsx-a11y/no-static-element-interactions': 'warn',
    'jsx-a11y/tabindex-no-positive': 'warn',
    'react/no-unknown-property': ['error', { ignore: ['sx'] }],
    'prettier/prettier': 'error'
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
}
