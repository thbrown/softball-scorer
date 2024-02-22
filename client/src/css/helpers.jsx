import theme from './theme';

let ctr = 0;
const cache = {};

const toCssCase = (value) => {
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

const toClassNames = (styles) => {
  const ret = {};
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
      rules += `${toCssCase(styleKey)}: ${s[styleKey]}; `;
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

export const makeStyles = (func) => {
  return (props) => {
    return {
      styles: func(theme, props),
      classes: toClassNames(func(theme, props)),
    };
  };
};

export const withStyles = (s) => {
  const useStyles = makeStyles(s);
  return (Element) => {
    return (props) => {
      const { classes, styles } = useStyles(props);
      return <Element classes={classes} styles={styles} {...props} />;
    };
  };
};
