export const reactRules = JSON.stringify({
  'style/jsx-quotes': ['error', 'prefer-double'],
  'react/no-duplicate-jsx-props': 'error',
  'style/jsx-closing-bracket-location': [1, 'line-aligned'],
  'style/jsx-closing-tag-location': [1, 'line-aligned'],
  'style/jsx-one-expression-per-line': [
    'error',
    {
      allow: 'non-jsx',
    },
  ],
  'react/prefer-shorthand-boolean': 'error',
  'react/no-array-index-key': 'error',
  'react/no-children-prop': 'error',
  'react/no-implicit-key': 'error',
  'react/no-useless-fragment': 'error',
  'react-dom/no-unknown-property': 'error',
  'react-hooks-extra/no-unnecessary-use-callback': 'error',
  'react-hooks-extra/no-unnecessary-use-memo': 'error',
  'react-refresh/only-export-components': 'off',
  'style/jsx-max-props-per-line': [
    'error',
    {
      maximum: 1,
      when: 'always',
    },
  ],
})
