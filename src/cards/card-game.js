import React from 'react';
import expose from 'expose';
import DOM from 'react-dom-factories';
import css from 'css';
import CardLineup from 'cards/card-lineup';
import CardScorer from 'cards/card-scorer';
import LeftHeaderButton from 'component-left-header-button';
import RightHeaderButton from 'component-right-header-button';
import { setRoute } from 'actions/route';

const defaultTab = 'lineup';

export default class CardGame extends expose.Component {
  constructor(props) {
    super(props);
    this.exposeOverwrite('game');

    this.handleTabClick = function(newTab) {
      setRoute(
        `/teams/${this.props.team.id}/games/${this.props.game.id}/${newTab}`
      );
    }.bind(this);
  }

  render() {
    let tab = this.props.tab || defaultTab;
    let subcard = '';
    if (tab === 'lineup') {
      subcard = React.createElement(CardLineup, {
        team: this.props.team,
        game: this.props.game,
      });
    } else if (tab === 'scorer') {
      subcard = React.createElement(CardScorer, {
        team: this.props.team,
        game: this.props.game,
      });
    }

    return DOM.div(
      {
        style: {
          className: 'card',
        },
      },
      DOM.div(
        {
          className: 'card-title',
        },
        React.createElement(LeftHeaderButton, {}),
        DOM.div(
          {
            className: 'card-title-tab-container',
          },
          DOM.div(
            {
              onClick: this.handleTabClick.bind(this, 'lineup'),
              style: {
                width: '50%',
                borderBottom:
                  tab === 'lineup'
                    ? '5px solid ' + css.colors.TEXT_LIGHT
                    : 'none',
              },
            },
            'Lineup'
          ),
          DOM.div(
            {
              onClick: this.handleTabClick.bind(this, 'scorer'),
              style: {
                width: '50%',
                borderBottom:
                  tab === 'scorer'
                    ? '5px solid ' + css.colors.TEXT_LIGHT
                    : 'none',
              },
            },
            'Scorer'
          )
        ),
        React.createElement(RightHeaderButton, {})
      ),
      subcard
    );
  }
}
