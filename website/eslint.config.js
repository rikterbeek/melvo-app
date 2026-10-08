import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      complexity: ['error', 10],
      'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      'no-console': 'error',
    },
  },
  {
    files: ['src/**/*.test.{ts,tsx}'],
    rules: { 'max-lines-per-function': 'off', 'max-lines': 'off' },
  },
)
