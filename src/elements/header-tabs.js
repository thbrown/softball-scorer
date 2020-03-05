import React from 'react';
import { makeStyles } from 'css/helpers';

const useHeaderTabsStyles = makeStyles(css => ({
  tabContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    minWidth: '200px',
  },
  headerTab: {
    transition: 'border 0.25s',
    height: '42px',
    borderBottom: '5px solid ' + css.colors.PRIMARY_DARK,
  },
  headerTabSelected: {
    transition: 'border 0.25s',
    height: '42px',
    borderBottom: '5px solid ' + css.colors.TEXT_LIGHT,
    borderRadius: '4px',
  },
}));

const HeaderTabs = ({ tab, tabNames, handleTabClick }) => {
  const { classes } = useHeaderTabsStyles();
  return (
    <div className={classes.tabContainer}>
      {tabNames.map(({ value, label }) => {
        return (
          <div
            key={value}
            className={
              tab === value ? classes.headerTabSelected : classes.headerTab
            }
            onClick={() => handleTabClick(value)}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
};

export default HeaderTabs;
