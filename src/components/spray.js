import React from 'react';
import results from 'plate-appearance-results';
import { normalize } from 'utils/functions';
import { compose, withState, withHandlers } from 'recompose';
import css from 'css';
import { withStyles } from 'css/helpers';
import NoSelect from 'elements/no-select';
import {
  HIT_TYPE_FILTERS,
  filterByHitType,
  filterByLastGames,
} from 'utils/plateAppearanceFilters';
import BallFieldSvg from './ball-field-svg';
import state from 'state';

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

const SprayTooltip = withStyles((theme) => ({
  tooltip: {
    position: 'absolute',
    color: theme.colors.TEXT_DARK,
    backgroundColor: theme.colors.BACKGROUND,
    border: '1px solid ' + theme.colors.SECONDARY_LIGHT,
    borderRadius: theme.borderRadius.small,
    padding: TOOLTIP_PADDING + 'px',
    width: TOOLTIP_WIDTH + 'px',
    lineHeight: TOOLTIP_ROW_HEIGHT + 'px',
    '& div:last-child': {
      borderBottom: '0px',
    },
  },
  tooltipRow: {
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'space-between',
    maxWidth: TOOLTIP_WIDTH + 'px',
    overflow: 'hidden',
    borderBottom: '1px solid ' + theme.colors.SECONDARY_LIGHT,
  },
  tooltipLabel: {
    fontWeight: 'bold',
    marginRight: theme.spacing.xSmall,
  },
  tooltipOff: {
    position: 'fixed',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
  },
}))(({ classes, plateAppearance }) => {
  const rows = [];
  const game = plateAppearance.game;

  const player = state.getPlayer(plateAppearance.playerId);

  rows.push(
    <div key="result" className={classes.tooltipRow}>
      <span className={classes.tooltipLabel}>Result:</span>
      {plateAppearance.result}
    </div>
  );

  if (player) {
    rows.push(
      <div key="player" className={classes.tooltipRow}>
        <span className={classes.tooltipLabel}>Player:</span> {player.name}
      </div>
    );
  }

  if (game) {
    rows.push(
      <div key="vs" className={classes.tooltipRow}>
        <span className={classes.tooltipLabel}>Against:</span> {game.opponent}
      </div>
    );
    rows.push(
      <div key="date" className={classes.tooltipRow}>
        <span className={classes.tooltipLabel}>Date:</span>
        {new Date(game.date * 1000).toISOString().substring(0, 10)}
      </div>
    );
  }

  return (
    <div
      id="spray-tooltip"
      className={classes.tooltip}
      style={getTooltipPosition(getHitPosition(plateAppearance), rows.length)}
    >
      {rows}
    </div>
  );
});
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
  }),
  withStyles((theme) => ({
    ball: {
      position: 'absolute',
      width: BALL_SIZE + 'px',
      boxSizing: 'border-box',
    },
  }))
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
            className={props.classes.ball}
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
        borderTop: '1px solid white',
        borderBottom: '1px solid white',
        width: Math.min(window.innerWidth, BALL_FIELD_MAX_WIDTH) + 'px',
        height: Math.min(window.innerWidth, BALL_FIELD_MAX_WIDTH) + 'px',
        overflow: 'hidden',
      }}
    >
      {/* HACK: The spray field indicators for the 2023 season are offset by 19px
      because of a visual bug on the PA page. Should we move them up? */}
      <div
        style={{
          height: '19px',
        }}
      ></div>
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
  }),
  withStyles((theme) => ({
    sprayBody: {
      marginTop: css.spacing.xSmall,
      maxWidth: BALL_FIELD_MAX_WIDTH + 'px',
      margin: 'auto',
    },
    filterArea: {
      backgroundColor: theme.colors.PRIMARY_DARK,
      color: theme.colors.TEXT_LIGHT,
      padding: theme.spacing.medium,
      marginTop: theme.spacing.xxSmall,
      borderRadius: theme.borderRadius.medium,
    },
    title: {
      textAlign: 'center',
      fontSize: theme.typography.size.xLarge,
      marginBottom: theme.spacing.small,
    },
    subtitle: {
      fontSize: theme.typography.size.medium,
    },
    filterGroup: {
      marginTop: theme.spacing.xSmall,
      marginBottom: theme.spacing.xSmall,
      display: 'flex',
      justifyContent: 'flex-start',
    },
    filterButton: {
      '-webkitTapHighlightColor': 'rgba(0,0,0,0)',
      cursor: 'pointer',
      backgroundColor: theme.colors.PRIMARY,
      paddingTop: theme.spacing.large,
      paddingBottom: theme.spacing.large,
      paddingLeft: theme.spacing.medium,
      paddingRight: theme.spacing.medium,
      fontSize: theme.typography.size.small,
      borderRadius: theme.borderRadius.medium,
      marginRight: theme.spacing.xSmall,
      '&:hover': {
        filter: 'brightness(80%)',
      },
      opacity: 1,
    },
    filterButtonActive: {
      '-webkitTapHighlightColor': 'rgba(0,0,0,0)',
      cursor: 'pointer',
      backgroundColor: theme.colors.PRIMARY_LIGHT,
      paddingTop: theme.spacing.large,
      paddingBottom: theme.spacing.large,
      paddingLeft: theme.spacing.medium,
      paddingRight: theme.spacing.medium,
      fontSize: theme.typography.size.small,
      borderRadius: theme.borderRadius.medium,
      marginRight: theme.spacing.xSmall,
      '&:hover': {
        filter: 'brightness(100%)',
      },
    },
  }))
);

const Spray = ({
  classes,
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
    <div className={'sprayBody ' + classes.sprayBody}>
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
        <div className={classes.filterArea}>
          <div className={classes.subtitle}>Hits</div>
          <div className={classes.filterGroup}>
            <div
              id="filter-hits"
              className={
                filter.plateAppearanceType === HIT_TYPE_FILTERS.HITS
                  ? classes.filterButtonActive
                  : classes.filterButton
              }
              onClick={setPlateAppearanceTypeFilter(HIT_TYPE_FILTERS.HITS)}
            >
              <NoSelect> Only Hits </NoSelect>
            </div>
            <div
              id="filter-extra-hits"
              className={
                filter.plateAppearanceType === HIT_TYPE_FILTERS.EXTRA_BASE_HITS
                  ? classes.filterButtonActive
                  : classes.filterButton
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
                  ? classes.filterButtonActive
                  : classes.filterButton
              }
              onClick={setPlateAppearanceTypeFilter(HIT_TYPE_FILTERS.OUTS)}
            >
              <NoSelect> Only Outs </NoSelect>
            </div>
          </div>
          <div className={classes.subtitle}>Games</div>
          <div className={classes.filterGroup}>
            <div
              id="filter-past3"
              className={
                filter.pastGames === 3
                  ? classes.filterButtonActive
                  : classes.filterButton
              }
              onClick={setPastGamesFilter(3)}
            >
              <NoSelect> Past 3 Games </NoSelect>
            </div>
            <div
              id="filter-past5"
              className={
                filter.pastGames === 5
                  ? classes.filterButtonActive
                  : classes.filterButton
              }
              onClick={setPastGamesFilter(5)}
            >
              <NoSelect> Past 5 Games </NoSelect>
            </div>
            <div
              id="filter-past10"
              className={
                filter.pastGames === 10
                  ? classes.filterButtonActive
                  : classes.filterButton
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
