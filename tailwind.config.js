const { heroui } = require('@heroui/theme');
const defaultTheme = require('tailwindcss/defaultTheme');
const widgetType = process.env.widget_dir;

// Here, the HeroUI packages needed by different widget types are specified
// so that unused packages are not unnecessarily included and increasing bundle size.
// skeleton is needed everywhere as it is part of product card.
const herouiPackagesForOfficialWidgets = {
  'official-widgets/camera-search': 'input|listbox|skeleton',
  'official-widgets/similar-search': 'input|listbox|skeleton',
  'official-widgets/search-results-page': 'button|input|listbox|skeleton',
  'official-widgets/shopping-assistant': 'input|skeleton',
  'official-widgets/recommend-me': 'input|skeleton',
  'official-widgets/more-like-this': 'skeleton',
  'official-widgets/shop-the-look': 'skeleton',
  'official-widgets/embedded-grid': 'skeleton',
  'official-widgets/shoppable-lookbook': 'skeleton',
  'official-widgets/shoppable-gallery': 'skeleton|spinner',
  'official-widgets/icon-triggered-grid': 'skeleton',
  'official-widgets/search-bar': 'button|input|listbox|skeleton',
  'official-widgets/embedded-search-results': 'accordion|checkbox|input|skeleton|slider|spinner',
};

const herouiPackagesForWidget = herouiPackagesForOfficialWidgets[widgetType]
  // If not found, bundle all available packages as fallback.
  || 'accordion|button|checkbox|input|listbox|skeleton|slider|spinner';

const getFontObj = (configName) => {
  const deviceTypes = ['mobile', 'tablet', 'desktop'];
  const targetElements = ['heading', 'body', 'productCardTitle', 'productCardSecondaryTitle', 'productCardPrice', 'productCardOriginalPrice'];
  const fontSizeObj = {};

  deviceTypes.forEach(deviceType => {
    targetElements.forEach(targetElement => {
      fontSizeObj[`${deviceType}-${targetElement}`] = `var(--wigmix-${deviceType}-${targetElement}-${configName})`;
    });
  });

  return fontSizeObj;
};

const getColorObj = (configName) => {
  const colorNames = ['primary', 'buttonPrimary', 'buttonSecondary'];
  const colorObj = {};

  colorNames.forEach(colorName => {
    colorObj[`${colorName}`] = `var(--wigmix-${configName}-${colorName})`;
  });

  return colorObj;
};

// Convert all rem units to px units
function remToPx(input, fontSize = 16) {
  if (input == null) {
    return input;
  }
  switch (typeof input) {
    case 'object':
      if (Array.isArray(input)) {
        return input.map((val) => remToPx(val, fontSize));
      }
      const ret = {};
      for (const key in input) {
        ret[key] = remToPx(input[key], fontSize);
      }
      return ret;
    case 'string':
      return input.replace(
        /(\d*\.?\d+)rem$/,
        (_, val) => `${parseFloat(val) * fontSize}px`,
      );
    case 'function':
      return eval(input.toString().replace(
        /(\d*\.?\d+)rem/g,
        (_, val) => `${parseFloat(val) * fontSize}px`,
      ));
    default:
      return input;
  }
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,js,ts,jsx,tsx}',
    `./node_modules/@heroui/theme/dist/components/(${herouiPackagesForWidget}).js`,
  ],
  theme: {
    ...remToPx(defaultTheme),
    extend: {
      textColor: getColorObj('text'),
      backgroundColor: getColorObj('background'),
      fontSize: getFontObj('fontSize'),
      fontWeight: getFontObj('fontWeight'),
      height: {
        108: '432px',
      },
      spacing: {
        '19/20': '95%',
        '9/10': '90%',
        '7/10': '70%',
        '13/20': '65%',
        '11/20': '55%',
        '7/20': '35%',
        '3/10': '30%',
        '1/5': '20%',
        '3/20': '15%',
        '1/8': '12.5%',
      },
      boxShadow: {
        'around': '0 0 2000px 2000px rgba(0, 0, 0, 0.25)',
      },
    },
  },
  darkMode: 'class',
  plugins: [heroui()],
};
