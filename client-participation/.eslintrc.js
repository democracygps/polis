module.exports = {
  env: {
    browser: true,
    commonjs: true,
    jquery: true
  },
  extends: [
    'eslint:recommended'
    // 'prettier'
  ],
  globals: {
    FB: true,
    gtag: true,
    preload: true,
    userObject: true
  },
  ignorePatterns: ['dist', 'js/3rdparty'],
  overrides: [
    {
      files: ['vis2/**/*.js'],
      env: {
        commonjs: false,
        es2022: true
      },
      extends: ['plugin:jsx-a11y/recommended', 'plugin:react/recommended'],
      parserOptions: {
        ecmaVersion: 2022,
        jsx: true,
        sourceType: 'module'
      },
      plugins: ['jsx-a11y', 'react'],
      rules: {
        'react/no-unknown-property': 'warn',
        'react/no-deprecated': 'warn',
        'react/prop-types': 'warn'
      },
      settings: {
        react: {
          version: 'detect'
        }
      }
    }, {
      files: ['webpack.*.js', 'writeHeadersJsonTask.js'],
      env: {
        browser: false,
        node: true
      }
    }
  ],
  parser: '@babel/eslint-parser',
  parserOptions: {
    ecmaVersion: 5,
    sourceType: 'script'
  },
  plugins: [/*, 'prettier'*/],
  rules: {
    'no-unused-vars': 'warn',
    // 'prettier/prettier': 'error'
  }
}
