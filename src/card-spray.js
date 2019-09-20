import React from 'react';
import injectSheet from 'react-jss';
import Card from 'elements/card';
import CardSection from 'elements/card-section';
import results from 'plate-appearance-results';
import { normalize } from 'utils/functions';
import { setRoute } from 'actions/route';
import { compose, withState, withHandlers } from 'recompose';

const LOCATION_DENOMINATOR = 32767;
const BALL_FIELD_MAX_WIDTH = 500;

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

const SprayTooltip = injectSheet(theme => ({
  tooltip: {
    padding: theme.spacing.small,
    width: theme.sizing.small,
  },
}))(({ classes, theme, plateAppearance, game }) => {
  const { x, y } = getHitPosition(plateAppearance);
  return (
    <div
      id="spray-tooltip"
      className={classes.tooltip}
      style={{
        color: 'black',
        position: 'absolute',
        backgroundColor: 'white',
        width: '100px',
        left: x + 'px',
        top: `calc(${y}px - 75px)`,
      }}
    >
      Result: {plateAppearance.result}
    </div>
  );
});
const enhance = compose(
  withState('paTooltip', 'setTooltip', null),
  withHandlers({
    handlePAClick: props => pa => () => {
      props.setTooltip(pa);
    },
    turnOffTooltip: props => () => {
      props.setTooltip(null);
    },
  })
);

const Field = enhance(props => {
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
            onClick={props.handlePAClick(value)}
            key={value.id}
            src={image}
            alt={alt}
            style={{
              position: 'absolute',
              width: '20px',
              left: x + 'px',
              top: y + 'px',
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

const CardSpray = props => (
  <Card
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
    <CardSection>
      <div
        className="card-body"
        style={{ maxWidth: BALL_FIELD_MAX_WIDTH + 'px' }}
      >
        <Field plateAppearances={props.plateAppearances} />
      </div>
    </CardSection>
  </Card>
);

CardSpray.defaultProps = {
  game: null,
  plateAppearances: [],
  player: {},
  backNavUrl: '',
};

export default enhance(CardSpray);
