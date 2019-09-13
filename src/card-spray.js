import React from 'react';
import LeftHeaderButton from 'component-left-header-button';
import RightHeaderButton from 'component-right-header-button';
import results from 'plate-appearance-results';
import { normalize } from 'utils/functions';
import { setRoute } from 'actions/route';

const LOCATION_DENOMINATOR = 32767;
const BALL_FIELD_MAX_WIDTH = 500;

const Field = props => {
  const indicators = props.plateAppearances
    .map(value => {
      let x = -1;
      let y = -1;
      if (value.location) {
        x = value.location.x;
        y = value.location.y;
      }

      let new_x = Math.floor(
        normalize(
          x,
          0,
          LOCATION_DENOMINATOR,
          0,
          Math.min(window.innerWidth, BALL_FIELD_MAX_WIDTH)
        )
      );
      let new_y = Math.floor(
        normalize(
          y,
          0,
          LOCATION_DENOMINATOR,
          0,
          Math.min(window.innerWidth, BALL_FIELD_MAX_WIDTH)
        )
      );

      if (value.location && x && y) {
        let image = results.getNoHitResults().includes(value.result)
          ? '/server/assets/baseball-out.svg'
          : '/server/assets/baseball-hit.svg';
        let alt = results.getNoHitResults().includes(value.result)
          ? 'out'
          : 'hit';

        return (
          <img
            key={value.id}
            src={image}
            alt={alt}
            style={{
              position: 'absolute',
              width: '20px',
              left: new_x + 'px',
              top: new_y + 'px',
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
    </div>
  );
};

const CardSpray = props => (
  <div className="card" style={{ position: 'relative' }}>
    <div className="card-title">
      <LeftHeaderButton
        onClick={() => {
          if (props.backNavUrl) {
            setRoute(props.backNavUrl);
            return true;
          }
        }}
      />
      <div className="prevent-overflow card-title-text-with-arrow">
        {props.player.name}
      </div>
      <RightHeaderButton />
    </div>
    <div
      className="card-body"
      style={{ maxWidth: BALL_FIELD_MAX_WIDTH + 'px' }}
    >
      <Field plateAppearances={props.plateAppearances} />
    </div>
  </div>
);

CardSpray.defaultProps = {
  plateAppearances: [],
  player: {},
  backNavUrl: '',
};

export default CardSpray;
