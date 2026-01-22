import React from 'react';

const HeaderTabs = ({
  tab,
  tabNames,
  handleTabClick,
  invert,
  style,
  tabStyle,
}) => {
  // HACK: this is brutal
  const selectedClass = invert ? 'header-tab-unselected' : 'header-tab-selected';
  const unselectedClass = invert ? 'header-tab-selected' : 'header-tab-unselected';

  return (
    <div className="tab-container" style={style}>
      {tabNames.map(({ value, label }) => {
        return (
          <div
            key={value}
            className={`${tab === value ? selectedClass : unselectedClass} header-tab`}
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
