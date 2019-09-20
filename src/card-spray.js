import React from 'react';
import injectSheet from 'react-jss';
import Card from 'elements/card';
import results from 'plate-appearance-results';
import { normalize } from 'utils/functions';
import { setRoute } from 'actions/route';
import { compose, withState, withHandlers } from 'recompose';
import css from 'css';

const LOCATION_DENOMINATOR = 32767;
const BALL_FIELD_MAX_WIDTH = 500;
const BALL_SIZE = 20;
// TODO responsively size this so it is affected when resizing screen
const TOOLTIP_WIDTH = window.innerWidth < 400 ? 125 : 200;
const TOOLTIP_ROW_HEIGHT = 30;
const TOOLTIP_PADDING = 10;

const getHitPosition = pa => {
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
  if (x > window.innerWidth / 2) {
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

const SprayTooltip = injectSheet(theme => ({
  tooltip: {
    position: 'absolute',
    color: theme.colors.TEXT_DARK,
    backgroundColor: theme.colors.PRIMARY_LIGHT,
    border: '1px solid ' + theme.colors.SECONDARY_LIGHT,
    borderRadius: theme.spacing.medium,
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
    borderBottom: '1px solid ' + theme.colors.PRIMARY,
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

  rows.push(
    <div key="result" className={classes.tooltipRow}>
      <span className={classes.tooltipLabel}>Result:</span>
      {plateAppearance.result}
    </div>
  );

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
    <>
      <div
        id="spray-tooltip"
        className={classes.tooltip}
        style={getTooltipPosition(getHitPosition(plateAppearance), rows.length)}
      >
        {rows}
      </div>
    </>
  );
});
const enhanceField = compose(
  withState('paTooltip', 'setTooltip', null),
  withHandlers({
    showTooltip: props => pa => ev => {
      props.setTooltip(pa);
      ev.stopPropagation();
    },
    hideTooltip: props => () => {
      props.setTooltip(null);
    },
  }),
  injectSheet(theme => ({
    ball: {
      position: 'absolute',
      width: BALL_SIZE + 'px',
      boxSizing: 'border-box',
    },
  }))
);

const Field = enhanceField(props => {
  const indicators = props.plateAppearances
    .map(value => {
      const { x, y } = getHitPosition(value);
      if (value.location && x && y) {
        const image = results.getNoHitResults().includes(value.result)
          ? '/server/assets/baseball-out.svg'
          : '/server/assets/baseball-hit.svg';
        const alt = results.getNoHitResults().includes(value.result)
          ? 'out'
          : 'hit';

        return (
          <img
            onClick={props.showTooltip(value)}
            key={value.id}
            src={image}
            alt={alt}
            className={props.classes.ball}
            style={{
              left: x + 'px',
              top: y + 'px',
              border:
                value === props.paTooltip
                  ? `1px solid ${css.colors.TEXT_LIGHT}`
                  : null,
            }}
          />
        );
      } else {
        return null;
      }
    })
    .filter(component => {
      return !!component;
    });

  return (
    <div
      id="ball-field"
      onClick={() => {
        if (props.paTooltip) {
          props.hideTooltip();
        }
      }}
      style={{
        position: 'relative',
        width: Math.min(window.innerWidth, BALL_FIELD_MAX_WIDTH) + 'px',
        height: Math.min(window.innerWidth, BALL_FIELD_MAX_WIDTH) + 'px',
        overflow: 'hidden',
      }}
    >
      <img
        draggable={true}
        src="/server/assets/ballfield2.png"
        style={{ width: '100%' }}
        alt=""
      />
      {indicators}
      {props.paTooltip ? (
        <SprayTooltip plateAppearance={props.paTooltip} />
      ) : null}
    </div>
  );
});

const enhance = compose(
  injectSheet(theme => ({
    title: {
      fontSize: theme.typography.size.large,
    },
    filterArea: {
      backgroundColor: theme.colors.SECONDARY,
      color: theme.colors.TEXT_LIGHT,
    },
  }))
);

const CardSpray = props => (
  <Card
    log={console.log('WHAT', props)}
    title={props.player.name}
    leftHeaderProps={{
      onClick: () => {
        if (props.backNavUrl) {
          setRoute(props.backNavUrl);
          return true;
        }
      },
    }}
  >
    <div style={{ maxWidth: BALL_FIELD_MAX_WIDTH + 'px' }}>
      <Field plateAppearances={props.plateAppearances} />
    </div>
    <div className={props.classes.filterArea}>
      <span className={props.classes.title}>Filter</span>
    </div>
  </Card>
);

CardSpray.defaultProps = {
  game: null,
  plateAppearances: [],
  player: {},
  backNavUrl: '',
};

export default enhance(CardSpray);
