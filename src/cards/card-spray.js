import React from 'react';
import Card from 'elements/card';
import { setRoute } from 'actions/route';
import Spray from '../components/spray';

export default class CardSpray extends React.Component {
  constructor(props) {
    super(props);
  }

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
        <Spray
          team={this.props.team}
          player={this.props.player}
          plateAppearances={this.props.plateAppearances}
        ></Spray>
      </Card>
    );
  }
}
