import React from 'react';
import { makeStyles } from 'css/helpers';

const useHeaderTabsStyles = makeStyles((css) => ({
  tabContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    textAlign: 'center',
  },
  headerTab: {
    width: '45%',
    transition: 'border 0.25s',
    height: '42px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  selected: {
    borderBottom: '5px solid ' + css.colors.TEXT_LIGHT,
  },
  unselected: {
    borderBottom: '5px solid ' + css.colors.PRIMARY_DARK,
  },
}));

const HeaderTabs = ({
  tab,
  tabNames,
  handleTabClick,
  invert,
  style,
  tabStyle,
}) => {
  const { classes } = useHeaderTabsStyles();

  // HACK: this is brutal
  const selectedClass = invert ? classes.unselected : classes.selected;
  const unselectedClass = invert ? classes.selected : classes.unselected;

  return (
    <div className={classes.tabContainer} style={style}>
      {tabNames.map(({ value, label }) => {
        return (
          <div
            key={value}
            className={`${tab === value ? selectedClass : unselectedClass} ${
              classes.headerTab
            }`}
            onClick={() => handleTabClick(value)}
            style={tabStyle}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
};

export default HeaderTabs;
