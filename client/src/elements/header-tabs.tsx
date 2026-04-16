import React from 'react';

interface TabName {
  value: string;
  label: string;
}

interface HeaderTabsProps {
  tab: string;
  tabNames: TabName[];
  handleTabClick: (value: string) => void;
  invert?: boolean;
  style?: React.CSSProperties;
  tabStyle?: React.CSSProperties;
}

const HeaderTabs = ({
  tab,
  tabNames,
  handleTabClick,
  invert,
  style,
  tabStyle,
}: HeaderTabsProps) => {
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
