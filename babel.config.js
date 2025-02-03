module.exports = (args) => {
  const isES = args.env('es');
  const isTest = args.env('test');

  return {
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
};
