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
    TEXT_DESC: 'rgba(0, 0, 0, 0.75)',
    CANCEL: '#B72A2A',
    DELETE: '#B72A2A',
    WHITE: '#FFFFFF',
    BLACK: '#000000',
    INVISIBLE: 'rgba(0, 0, 0, 0)',
    DISABLED: '#aaa',
    SEMI_TRANSPARENT: 'rgba(0, 0, 0, 0.25)',
  },
  sizes: {
    ICON: '24px',
    'fixed-table-header-height': '28px',
    'fixed-table-col-width': '80px',
  },
  // 16px base body font
  // 2px -> 0.125rem
  // 4px -> 0.25rem
  // 8px -> 0.5rem
  // 12px -> 0.75rem
  // 16px -> 1rem
  // 20px -> 1.25rem
  // 24px -> 1.5rem
  // 32px -> 2rem
  typography: {
    size: {
      xxSmall: '0.625rem',
      xSmall: '0.75rem',
      small: '0.875rem',
      medium: '1rem',
      large: '1.25rem',
      xLarge: '1.5rem',
    },
  },
  border: '2px solid rgba(0, 0, 0, 0.10)',
  borderRadius: {
    small: '0.25rem',
    medium: '0.5rem',
    large: '0.75rem',
    xLarge: '1rem',
  },
  spacing: {
    xxSmall: '0.125rem',
    xSmall: '0.25rem',
    small: '0.5rem',
    medium: '0.75rem',
    large: '1rem',
    xLarge: '2rem',
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

export default theme;
