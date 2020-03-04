import theme from './theme';

export const makeStyles = func => {
  return props => {
    return {
      styles: func(theme, props),
    };
  };
};
