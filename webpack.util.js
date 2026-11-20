const path = require('path');

module.exports = (widget, version, useTailwindStyleLoader = true) => {
  const widgetName = widget.toLowerCase();
  const tailwindStyleLoader = {
    loader: 'style-loader',
    options: {
      injectType: 'singletonStyleTag',
      insert: Function('element', `var styles = document.getElementById('vi_style__${widgetName}__${version}'); if (!styles) { const div = document.createElement('div'); div.id = 'vi_template__${widgetName}'; div.attachShadow({ mode: 'open' }); document.head.appendChild(div); element.id = 'vi_style__${widgetName}__${version}'; div.shadowRoot.appendChild(element); } else if (element.innerHTML) { styles.innerHTML = element.innerHTML; }`),
    },
  };
  const postCssLoader = {
    loader: 'postcss-loader',
    options: { postcssOptions: { plugins: ['autoprefixer'] } },
  };
  const cssModuleLoader = {
    loader: 'css-loader',
    options: { modules: { namedExport: false, localIdentName: 'vi_[name]__[local]' } },
  };
  const styleLoader = useTailwindStyleLoader ? tailwindStyleLoader : 'style-loader';

  return {
    rules: [
      {
        // HeroUI's tailwind-variants depends on tailwind-merge@1 while @heroui/theme uses tailwind-merge@2, so both copies
        // were bundled. Point tailwind-variants at the v2 copy through a small v1-API adapter to bundle only one.
        // `resolve` on a rule applies to the requests made BY the matched module, i.e. tailwind-variants' own imports.
        test: /node_modules[\\/]tailwind-variants[\\/]dist[\\/]/,
        resolve: {
          alias: {
            'tailwind-merge$': path.resolve(__dirname, 'src/common/build-shims/tailwind-merge-v1-compat.ts'),
          },
        },
      },
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: ['ts-loader'],
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
      {
        test: /\.s?css$/,
        exclude: /(\.module\.s?css$)/,
        use: [styleLoader, 'css-loader', postCssLoader, 'sass-loader'],
      },
      {
        test: /\.module\.s?css$/,
        use: [styleLoader, cssModuleLoader, postCssLoader, 'sass-loader'],
      },
      {test: /\.(jpe?g|gif)$/, use: ['file-loader']},
      {test: /\.(png|eot|svg|ttf|woff(2)?)(\?v=\d+\.\d+\.\d+)?/, use: ['url-loader']},
    ],
  };
};
