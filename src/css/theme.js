// Color Theme
// https://material.io/tools/color/#!/?view.left=0&view.right=0&primary.color=4caf50&secondary.color=775447

const theme = {
  // e8e8e8 - grey
  // 0a7f23 - dark green
  // 164c09 - darker green
  colors: {
    PRIMARY: '#388e3c',
    PRIMARY_LIGHT: '#6abf69',
    PRIMARY_DARK: '#00600f',
    SECONDARY: '#757575',
    SECONDARY_LIGHT: '#a4a4a4',
    SECONDARY_DARK: '#494949',
    BACKGROUND: '#F5F5F5',
    TEXT_LIGHT: '#FFFFFF',
    TEXT_GREY: '#A4A4A4',
    TEXT_DARK: '#000000',
    CANCEL: '#B72A2A',
    DELETE: '#B72A2A',
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
  borderRadius: {
    small: '5px',
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
  boxShadow: {
    paper: '0 0 4px rgba(0, 0, 0, 0.14), 0 4px 8px rgba(0, 0, 0, 0.28);',
  },
};

module.exports = theme;
