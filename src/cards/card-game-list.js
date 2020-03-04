import React from 'react';
import state from 'state';
import { setRoute } from 'actions/route';
import injectSheet from 'react-jss';
import { toClientDate } from 'utils/functions';

class CardGameList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};

    this.handleGameClick = function(game) {
      setRoute(`/teams/${props.team.id}/games/${game.id}`); // TODO: always back to lineup?
    };

    this.handleEditClick = function(game) {
      setRoute(`/teams/${props.team.id}/games/${game.id}/edit`);
    };

    this.handleCreateClick = function() {
      const game = state.addGame(props.team.id, '');
      setRoute(`/teams/${props.team.id}/games/${game.id}/edit?isNew=true`);
    };
  }

  renderGameList() {
    const elems = [...this.props.team.games].reverse().map(game => {
      return (
        <div
          key={'game-' + game.id}
          id={'game-' + game.id}
          className={'list-item'}
          onClick={this.handleGameClick.bind(this, game)}
        >
          <img
            src="/server/assets/edit.svg"
            alt="edit"
            className={'list-button'}
            style={{
              float: 'right',
            }}
            id={'game-' + game.id + '-edit'}
            onClick={ev => {
              this.handleEditClick(game);
              ev.preventDefault();
              ev.stopPropagation();
            }}
          />
          <div className={this.props.classes.dateText}>
            {toClientDate(game.date)}
          </div>
          <div className="prevent-overflow">{'Vs. ' + game.opponent}</div>
        </div>
      );
    });

    elems.unshift(
      <div
        id="newGame"
        key="newGame"
        className={'list-item add-list-item'}
        onClick={this.handleCreateClick}
      >
        + Add New Game
      </div>
    );

    return <>{elems}</>;
  }

  render() {
    return (
      <div className="card">
        <div className="card-body">{this.renderGameList()}</div>
      </div>
    );
  }
}

export default injectSheet(theme => ({
  dateText: {
    float: 'right',
    marginRight: '32px',
    fontSize: '12px',
  },
}))(CardGameList);
