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
    borderBottom: '5px solid ' + css.colors.PRIMARY_DARK,
  },
  headerTabSelected: {
    width: '45%',
    transition: 'border 0.25s',
    height: '42px',
    borderBottom: '5px solid ' + css.colors.TEXT_LIGHT,
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
