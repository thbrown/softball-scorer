import React from 'react';
import InnerSection from 'elements/inner-section';

export const getUrlFilterState = () => {
  const search = new URLSearchParams(window.location.search);
  let abFilter = parseInt(search.get('ab'));
  if (isNaN(abFilter) || abFilter < 0) {
    abFilter = 4;
  }

  return {
    filterChecked: search.get('filter') === 'true',
    abFilter,
  };
};

const FilterLabel = (labelProps) => {
  return (
    <label
      {...labelProps}
      style={{
        ...(labelProps.style ?? {}),
        marginLeft: '8px',
      }}
    >
      {labelProps.children}
    </label>
  );
};

// should this reset every time or be stored in local storage?
let cachedFilterState = null;

export const FilterStats = ({ setFilterState }) => {
  const [filterState, setLocalFilterState] = React.useState(
    cachedFilterState ?? getUrlFilterState()
  );

  const handleEnableFilterChange = (ev) => {
    setLocalFilterState({
      ...filterState,
      filterChecked: ev.target.checked,
      filterStateChanged: true,
    });
  };

  const handleAbFilterChange = (ev) => {
    setLocalFilterState({
      ...filterState,
      abFilter: ev.target.value ?? 0,
      filterStateChanged: true,
    });
  };

  const handleApplyFilterClick = () => {
    const search = new URLSearchParams(window.location.search);
    search.set('filter', filterState.filterChecked);
    search.set('ab', filterState.abFilter);
    const searchInd = window.location.pathname.indexOf('?');
    const newUrl =
      window.location.protocol +
      '//' +
      window.location.host +
      window.location.pathname.slice(
        0,
        searchInd === -1 ? undefined : searchInd
      ) +
      '?' +
      search.toString();
    window.history.replaceState({ path: newUrl }, '', newUrl);
    const newFilterState = {
      ...filterState,
      filterStateChanged: false,
    };
    setFilterState(newFilterState);
    setLocalFilterState(newFilterState);
    cachedFilterState = newFilterState;
  };

  React.useEffect(() => {
    cachedFilterState = null;
  });

  return (
    <InnerSection
      style={{
        padding: '0px 8px',
      }}
    >
      <h2>Filtering</h2>
      <p>
        <input
          type="checkbox"
          id="enable-filter"
          name="enable-filter"
          checked={filterState.filterChecked}
          style={{
            transform: 'scale(1.5)',
            padding: '8px',
          }}
          onChange={handleEnableFilterChange}
        />
        <FilterLabel htmlFor="enable-filter">Enable filtering</FilterLabel>
        <br />
        <br />
        <input
          type="number"
          name="ab-filter"
          style={{
            width: '48px',
            padding: '8px',
          }}
          value={filterState.abFilter}
          disabled={!filterState.filterChecked}
          onChange={handleAbFilterChange}
        ></input>
        <FilterLabel htmlFor="ab-filter">Minimum # of ABs</FilterLabel>
        <br />
        <br />
        <button
          className="button primary-button"
          style={{
            marginLeft: '0px',
            opacity: filterState.filterStateChanged ? 1 : 0.5,
            pointerEvents: filterState.filterStateChanged ? 'auto' : 'none',
          }}
          disabled={filterState.filterStateChanged === false}
          onClick={handleApplyFilterClick}
        >
          {!filterState.filterChecked && filterState.filterStateChanged
            ? 'Remove Filter'
            : 'Apply Filter'}
        </button>
      </p>
    </InnerSection>
  );
};
