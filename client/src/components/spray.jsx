import React from 'react';
import results from 'plate-appearance-results';
import { normalize } from 'utils/functions';
import { compose, withState, withHandlers } from 'recompose';
import css from 'css';
import NoSelect from 'elements/no-select';
import {
  HIT_TYPE_FILTERS,
  filterByHitType,
  filterByLastGames,
} from 'utils/plateAppearanceFilters';
import BallFieldSvg from './ball-field-svg';
import { getGlobalState } from 'state';

const LOCATION_DENOMINATOR = 32767;
const BALL_FIELD_MAX_WIDTH = 500;
const BALL_SIZE = 20;
// TODO responsively size this so it is affected when resizing screen
const TOOLTIP_WIDTH = window.innerWidth < 400 ? 125 : 175;
const TOOLTIP_ROW_HEIGHT = 21;
const TOOLTIP_PADDING = 10;

const getHitPosition = (pa) => {
  const x = pa?.location?.x || 0;
  const y = pa?.location?.y || 0;
  const newX = Math.floor(
    normalize(
      x,
      0,
      LOCATION_DENOMINATOR,
      0,
      Math.min(window.innerWidth, BALL_FIELD_MAX_WIDTH)
    )
  );
  const newY = Math.floor(
    normalize(
      y,
      0,
      LOCATION_DENOMINATOR,
      0,
      Math.min(window.innerWidth, BALL_FIELD_MAX_WIDTH)
    )
  );

  return { x: newX, y: newY };
};

const getTooltipPosition = ({ x, y }, tooltipRows) => {
  const tooltipHeight = tooltipRows * TOOLTIP_ROW_HEIGHT + TOOLTIP_PADDING * 2;
  let positionX = 'Left';
  let positionY = 'Bottom';
  if (x + BALL_SIZE > window.innerWidth / 2) {
    positionX = 'Right';
    x -= TOOLTIP_WIDTH + TOOLTIP_PADDING * 2;
  } else {
    x += BALL_SIZE;
  }
  if (y < 100) {
    positionY = 'Top';
    y += BALL_SIZE;
  } else {
    y -= tooltipHeight;
  }

  return {
    left: `${x}px`,
    top: `${y}px`,
    [`border${positionY}${positionX}Radius`]: '0px',
  };
};

const SprayTooltip = ({ plateAppearance }) => {
  const rows = [];
  const game = plateAppearance.game;

  const player = getGlobalState().getPlayer(plateAppearance.playerId);

  rows.push(
    <div key="result" className="spray-tooltip-row">
      <span className="spray-tooltip-label">Result:</span>
      {plateAppearance.result}
    </div>
  );

  if (player) {
    rows.push(
      <div key="player" className="spray-tooltip-row">
        <span className="spray-tooltip-label">Player:</span> {player.name}
      </div>
    );
  }

  if (game) {
    rows.push(
      <div key="vs" className="spray-tooltip-row">
        <span className="spray-tooltip-label">Against:</span> {game.opponent}
      </div>
    );
    rows.push(
      <div key="date" className="spray-tooltip-row">
        <span className="spray-tooltip-label">Date:</span>
        {new Date(game.date * 1000).toISOString().substring(0, 10)}
      </div>
    );
  }

  return (
    <div
      id="spray-tooltip"
      className="spray-tooltip"
      style={getTooltipPosition(getHitPosition(plateAppearance), rows.length)}
    >
      {rows}
    </div>
  );
};
const enhanceField = compose(
  withState('paTooltip', 'setTooltip', null),
  withHandlers({
    showTooltip: (props) => (pa) => (ev) => {
      props.setTooltip(pa);
      ev.stopPropagation();
    },
    hideTooltip: (props) => () => {
      props.setTooltip(null);
    },
  })
);

const Field = enhanceField((props) => {
  const indicators = props.decoratedPlateAppearances
    .map((plateAppearance) => {
      const { x, y } = getHitPosition(plateAppearance);
      if (plateAppearance.location && x && y) {
        const image = results.getNoHitResults().includes(plateAppearance.result)
          ? '/assets/baseball-out.svg'
          : '/assets/baseball-hit.svg';
        const alt = results.getNoHitResults().includes(plateAppearance.result)
          ? 'out'
          : 'hit';

        return (
          <img
            id={'pa-' + plateAppearance.id}
            onClick={props.showTooltip(plateAppearance)}
            key={plateAppearance.id}
            src={image}
            alt={alt}
            className="spray-ball"
            style={{
              left: x + 'px',
              top: y + 'px',
              border:
                plateAppearance === props.paTooltip
                  ? `1px solid ${css.colors.TEXT_LIGHT}`
                  : null,
            }}
          />
        );
      } else {
        return null;
      }
    })
    .filter((component) => {
      return !!component;
    });

  return (
    <div
      id="spray-field"
      onClick={() => {
        if (props.paTooltip) {
          props.hideTooltip();
        }
      }}
      style={{
        position: 'relative',
        width: Math.min(window.innerWidth, BALL_FIELD_MAX_WIDTH) + 'px',
        height: Math.min(window.innerWidth, BALL_FIELD_MAX_WIDTH) + 'px',
      }}
    >
      <BallFieldSvg />
      {indicators}
      {props.paTooltip ? (
        <SprayTooltip plateAppearance={props.paTooltip} />
      ) : null}
    </div>
  );
});

const enhance = compose(
  withState('filter', 'setFilter', {
    pastGames: null,
    plateAppearanceType: null,
  }),
  withHandlers({
    setPastGamesFilter: (props) => (value) => (ev) => {
      props.setFilter({
        plateAppearanceType: props.filter.plateAppearanceType,
        pastGames: value === props.filter.pastGames ? null : value,
      });
      ev.preventDefault();
    },
    setPlateAppearanceTypeFilter: (props) => (value) => (ev) => {
      props.setFilter({
        plateAppearanceType:
          value === props.filter.plateAppearanceType ? null : value,
        pastGames: props.filter.pastGames,
      });
      ev.preventDefault();
    },
  })
);

const Spray = ({
  setPastGamesFilter,
  setPlateAppearanceTypeFilter,
  filter,
  decoratedPlateAppearances,
  hideFilter,
}) => {
  if (!hideFilter && filter.pastGames) {
    decoratedPlateAppearances = filterByLastGames(
      decoratedPlateAppearances,
      filter.pastGames
    );
  }
  if (!hideFilter && filter.plateAppearanceType) {
    decoratedPlateAppearances = filterByHitType(
      decoratedPlateAppearances,
      filter.plateAppearanceType
    );
  }

  return (
    <div className="spray-body">
      <Field decoratedPlateAppearances={decoratedPlateAppearances} />
      <div
        style={{
          margin: 'auto',
          maxWidth: '500px',
          padding: css.spacing.xSmall,
          textAlign: 'center',
          fontSize: css.typography.size.small,
          color: css.colors.TEXT_GREY,
        }}
      >
        Tap a ball to see info about the plate appearance.
      </div>

      {hideFilter ? null : (
        <div className="spray-filter-area">
          <div className="spray-subtitle">Hits</div>
          <div className="spray-filter-group">
            <div
              id="filter-hits"
              className={
                filter.plateAppearanceType === HIT_TYPE_FILTERS.HITS
                  ? 'spray-filter-button-active'
                  : 'spray-filter-button'
              }
              onClick={setPlateAppearanceTypeFilter(HIT_TYPE_FILTERS.HITS)}
            >
              <NoSelect> Only Hits </NoSelect>
            </div>
            <div
              id="filter-extra-hits"
              className={
                filter.plateAppearanceType === HIT_TYPE_FILTERS.EXTRA_BASE_HITS
                  ? 'spray-filter-button-active'
                  : 'spray-filter-button'
              }
              onClick={setPlateAppearanceTypeFilter(
                HIT_TYPE_FILTERS.EXTRA_BASE_HITS
              )}
            >
              <NoSelect> Only Extra Base Hits </NoSelect>
            </div>
            <div
              id="filter-outs"
              className={
                filter.plateAppearanceType === HIT_TYPE_FILTERS.OUTS
                  ? 'spray-filter-button-active'
                  : 'spray-filter-button'
              }
              onClick={setPlateAppearanceTypeFilter(HIT_TYPE_FILTERS.OUTS)}
            >
              <NoSelect> Only Outs </NoSelect>
            </div>
          </div>
          <div className="spray-subtitle">Games</div>
          <div className="spray-filter-group">
            <div
              id="filter-past3"
              className={
                filter.pastGames === 3
                  ? 'spray-filter-button-active'
                  : 'spray-filter-button'
              }
              onClick={setPastGamesFilter(3)}
            >
              <NoSelect> Past 3 Games </NoSelect>
            </div>
            <div
              id="filter-past5"
              className={
                filter.pastGames === 5
                  ? 'spray-filter-button-active'
                  : 'spray-filter-button'
              }
              onClick={setPastGamesFilter(5)}
            >
              <NoSelect> Past 5 Games </NoSelect>
            </div>
            <div
              id="filter-past10"
              className={
                filter.pastGames === 10
                  ? 'spray-filter-button-active'
                  : 'spray-filter-button'
              }
              onClick={setPastGamesFilter(10)}
            >
              <NoSelect> Past 10 Games </NoSelect>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

Spray.defaultProps = {
  decoratedPlateAppearances: [],
  backNavUrl: '',
};

export default enhance(Spray);
