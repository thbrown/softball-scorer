// Color Theme
// https://material.io/tools/color/#!/?view.left=0&view.right=0&primary.color=4caf50&secondary.color=775447

const theme = {
  colors: {
    PRIMARY: '#4caf50',
    PRIMARY_LIGHT: '#80e27e',
    PRIMARY_DARK: '#087f23',
    SECONDARY: '#795548',
    SECONDARY_LIGHT: '#a98274',
    SECONDARY_DARK: '#4b2c20',
    TEXT_LIGHT: '#FFFFFF',
    TEXT_GREY: 'rgba(0,0,0,.87)',
    TEXT_DARK: '#000000',
    WHITE: '#FFFFFF',
    INVISIBLE: 'rgba(0, 0, 0, 0)',
    DISABLED: '#aaa',
  },
  sizes: {
    ICON: '24px',
    'fixed-table-header-height': '28px',
    'fixed-table-col-width': '80px',
  },
  typography: {
    size: {
      xxSmall: '10px',
      xSmall: '12px',
      small: '14px',
      medium: '16px',
      large: '20px',
      xLarge: '32px',
    },
  },
  spacing: {
    xxSmall: '0.5rem',
    xSmall: '1rem',
    small: '1.5rem',
    medium: '2rem',
    large: '5rem',
    xLarge: '10rem',
  },
  sizing: {
    xxSmall: '1rem',
    xSmall: '2rem',
    small: '5rem',
    medium: '10rem',
    large: '20rem',
    xLarge: '30rem',
  },
  breakpoints: {
    sm: '320px',
  },
  config: {
    SYNC_DELAY: '10s',
  },
};

theme.classes = {
  listItem: {
    lineHeight: '20px',
    [`@media (max-width:${theme.breakpoints.sm})`]: {
      fontSize: '14px',
      lineHeight: '14px',
    },
  },
};
module.exports = theme;