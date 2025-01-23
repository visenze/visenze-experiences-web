const {nextui} = require('@nextui-org/theme');
const defaultTheme = require('tailwindcss/defaultTheme');

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

const getColourObj = (configName) => {
  const colourNames = ['primary', 'buttonPrimary', 'buttonSecondary'];
  const colourObj = {};

  colourNames.forEach(colourName => {
    colourObj[`${colourName}`] = `var(--wigmix-${configName}-${colourName})`;
  });

  return colourObj;
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
    './node_modules/@nextui-org/theme/dist/components/(button|card|chip|image|input|listbox|pagination|popover|spacer|skeleton|accordion|checkbox|radio|spinner|slider).js',
  ],
  theme: {
    ...remToPx(defaultTheme),
    extend: {
      textColor: getColourObj('text'),
      backgroundColor: getColourObj('background'),
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
  plugins: [nextui()],
};
