import React from 'react';
import theme from './theme';

let ctr = 0;
const cache: Record<string, string> = {};

type StyleRules = Record<string, React.CSSProperties>;

const toCssCase = (value: string): string => {
  let ret = '';
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    const chL = ch.toLowerCase();
    if (ch === chL) {
      ret += ch;
    } else {
      ret += '-' + chL;
    }
  }
  return ret;
};

const toClassNames = (styles: StyleRules): Record<string, string> => {
  const ret: Record<string, string> = {};
  const style = document.createElement('style');
  style.type = 'text/css';
  let sheet = '';
  for (const name in styles) {
    const s = styles[name];
    // if a serialized version of these styles already exists, use that one instead.
    // there's probably a much better way to do this
    const serialized = JSON.stringify(s);
    const cacheVal = cache[serialized];
    if (cacheVal) {
      ret[name] = cacheVal;
      continue;
    }
    const className = name + '-' + ctr++;
    cache[serialized] = className;
    let rules = '';
    for (const styleKey in s) {
      rules += `${toCssCase(styleKey)}: ${(s as Record<string, string>)[styleKey]}; `;
    }
    sheet += `.${className} { ${rules}} `;
    ret[name] = className;
  }
  if (sheet) {
    style.innerHTML = sheet;
    document.getElementsByTagName('head')[0].appendChild(style);
  }

  return ret;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StyleFunc = (theme: typeof import('./theme').default, props?: any) => StyleRules;

export const makeStyles = (func: StyleFunc) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (props?: any) => {
    return {
      styles: func(theme, props),
      classes: toClassNames(func(theme, props)),
    };
  };
};

export interface WithStylesProps {
  classes: Record<string, string>;
  styles: StyleRules;
}

export const withStyles = (s: StyleFunc) => {
  const useStyles = makeStyles(s);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Element: React.ComponentType<any>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (props: any) => {
      const { classes, styles } = useStyles(props);
      return <Element classes={classes} styles={styles} {...props} />;
    };
  };
};
