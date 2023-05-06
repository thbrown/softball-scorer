import React from 'react';
import Card from 'elements/card';
import { setRoute } from 'actions/route';
import Spray from '../components/spray';
import css from 'css/theme';

export default class CardSpray extends React.Component {
  render() {
    return (
      <Card
        title={this.props.player.name}
        leftHeaderProps={{
          onClick: () => {
            if (this.props.backNavUrl) {
              setRoute(this.props.backNavUrl);
              return true;
            }
          },
        }}
      >
        <div
          style={{
            margin: 'auto',
            maxWidth: '500px',
            padding: '0.75rem',
            textAlign: 'center',
            color: css.colors.TEXT_GREY,
          }}
        >
          Tap a location to see information about the plate appearance.
        </div>
        <Spray
          team={this.props.team}
          player={this.props.player}
          decoratedPlateAppearances={this.props.decoratedPlateAppearances}
        ></Spray>
      </Card>
    );
  }
}
