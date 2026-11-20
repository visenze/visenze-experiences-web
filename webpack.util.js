const fs = require('fs');
const path = require('path');

// Major version of the tailwind-merge copy that tailwind-variants itself resolves (undefined if it can't be found).
const getTailwindVariantsMergeMajor = () => {
  try {
    const entry = require.resolve('tailwind-merge', { paths: [path.dirname(require.resolve('tailwind-variants'))] });
    const marker = `${path.sep}tailwind-merge${path.sep}`;
    const packageDir = entry.slice(0, entry.lastIndexOf(marker) + marker.length);
    return Number(JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8')).version.split('.')[0]);
  } catch {
    return undefined;
  }
};

// HeroUI's tailwind-variants@0.1 depends on tailwind-merge@1 while @heroui/theme uses tailwind-merge@2, so both copies were
// bundled. Point tailwind-variants at the v2 copy through a small v1-API adapter to bundle only one.
// TODO: Written for tailwind-variants 0.1.20 (tailwind-merge 1.14) -> tailwind-merge 2.6. Once @heroui/* moves to a
// tailwind-variants built for tailwind-merge >= 2, this rule turns itself off (the check below); then remove it together
// with src/common/build-shims/tailwind-merge-v1-compat.ts.
const tailwindMergeDedupeRules = getTailwindVariantsMergeMajor() === 1
  ? [{
    // `resolve` on a rule applies to the requests made BY the matched module, i.e. tailwind-variants' own imports.
    test: /node_modules[\\/]tailwind-variants[\\/]dist[\\/]/,
    resolve: {
      alias: {
        'tailwind-merge$': path.resolve(__dirname, 'src/common/build-shims/tailwind-merge-v1-compat.ts'),
      },
    },
  }]
  : [];

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
      ...tailwindMergeDedupeRules,
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
