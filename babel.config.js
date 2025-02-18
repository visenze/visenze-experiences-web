module.exports = (args) => {
  const isES = args.env('es');
  const isUnitTest = process.env.unit_test === 'true';
  const isStaging = process.env.build === 'staging';

  const out = {
    presets: [
      '@babel/preset-env',
      [
        '@babel/preset-react',
        {
          runtime: 'automatic',
        },
      ],
      '@babel/preset-typescript',
    ],
    plugins: [
      '@babel/plugin-transform-class-properties',
      [
        '@babel/plugin-transform-runtime',
        {
          useESModules: isES,
        },
      ],
    ],
  };
  if (!isUnitTest) {
    if (isStaging) {
      out.plugins.push('babel-plugin-jsx-remove-data-test-id');
    } else {
      out.plugins.push([
        'babel-plugin-jsx-remove-data-test-id',
        {
          attributes: ['data-testid', 'data-pw'],
        },
      ]);
    }
  }
  return out;
};
