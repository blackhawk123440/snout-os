/**
 * ESLint rules for Control Surface components
 * 
 * Enforces component contract: no raw hex, no raw shadows, no raw px values
 */

module.exports = {
  overrides: [
    {
      files: ['src/components/control-surface/**/*.tsx', 'src/components/control-surface/**/*.ts'],
      rules: {
        // Warn about common patterns that violate the contract
        'no-restricted-syntax': [
          'error',
          {
            selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
            message: 'Raw hex colors are forbidden. Use controlSurface.colors tokens instead.',
          },
          {
            selector: 'Literal[value=/rgba?\\(/]',
            message: 'Raw color functions are forbidden. Use controlSurface.colors tokens instead.',
          },
          {
            selector: 'TemplateLiteral[expressions.length=0] > TemplateElement[value.raw=/px|rem|em/]',
            message: 'Raw spacing values are forbidden. Use controlSurface.spacing tokens instead.',
          },
        ],
        'no-restricted-properties': [
          'error',
          {
            object: 'style',
            property: 'boxShadow',
            message: 'Raw boxShadow values are forbidden. Use controlSurface.spatial.elevation tokens instead.',
          },
        ],
      },
    },
  ],
};

