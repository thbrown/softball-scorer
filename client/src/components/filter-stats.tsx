import React from 'react';
import InnerSection from 'elements/inner-section';
import IconButton from 'elements/icon-button';
import { useModal } from 'hooks';

interface FilterState {
  filterChecked: boolean;
  abFilter: number;
  filterStateChanged?: boolean;
}

export const getUrlFilterState = (): FilterState => {
  const search = new URLSearchParams(window.location.search);
  let abFilter = parseInt(search.get('ab') || '');
  if (isNaN(abFilter) || abFilter < 0) {
    abFilter = 4;
  }

  return {
    filterChecked: search.get('filter') === 'true',
    abFilter,
  };
};

const FilterLabel = (labelProps: React.LabelHTMLAttributes<HTMLLabelElement>) => {
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
let cachedFilterState: FilterState | null = null;

interface FilterStatsProps {
  setFilterState: (state: FilterState) => void;
  setLocalFilterState: (state: FilterState) => void;
  filterState: FilterState;
}

const FilterStats = ({ setFilterState, setLocalFilterState, filterState }: FilterStatsProps) => {
  const handleEnableFilterChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setLocalFilterState({
      ...filterState,
      filterChecked: ev.target.checked,
      filterStateChanged: true,
    });
  };

  const handleAbFilterChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setLocalFilterState({
      ...filterState,
      abFilter: parseInt(ev.target.value) || 0,
      filterStateChanged: true,
    });
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
    </InnerSection>
  );
};

interface FilterStatsModalProps {
  setFilterState: (state: FilterState) => void;
}

export const FilterStatsModal = ({ setFilterState }: FilterStatsModalProps) => {
  const [filterState, setLocalFilterState] = React.useState<FilterState>(
    cachedFilterState ?? getUrlFilterState()
  );

  const { modal, open, setOpen } = useModal({
    title: 'Filter Stats',
    body: (
      <FilterStats
        filterState={filterState}
        setFilterState={setFilterState}
        setLocalFilterState={setLocalFilterState}
      />
    ),
    onConfirm: () => {
      const search = new URLSearchParams(window.location.search);
      search.set('filter', String(filterState.filterChecked));
      search.set('ab', String(filterState.abFilter));
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
      const newFilterState: FilterState = {
        ...filterState,
        filterStateChanged: false,
      };
      setFilterState(newFilterState);
      setLocalFilterState(newFilterState);
      cachedFilterState = newFilterState;
    },
    onCancel: () => void 0,
  });

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          textDecoration: 'underline',
          userSelect: 'none',
          cursor: 'pointer',
          justifyContent: 'center',
        }}
        onClick={() => setOpen(true)}
      >
        <span
          style={{
            textDecoration: 'underline',
          }}
        >
          Apply Filters
        </span>
      </div>
      {open && modal}
    </>
  );
};
