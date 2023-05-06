import React from 'react';
import state from 'state';
import { setRoute } from 'actions/route';
import Card from 'elements/card';
import ListButton from 'elements/list-button';
import IconButton from 'elements/icon-button';

class CardPlayerList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      search: undefined,
    };

    this.handlePlayerClick = function (player) {
      setRoute(`/players/${player.id}`);
    };

    this.handleEditClick = function (player) {
      setRoute(`/players/${player.id}/edit`);
    };

    this.handleCreateClick = function () {
      const player = state.addPlayer('', 'M');
      setRoute(`/players/${player.id}/edit?isNew=true`);
    };

    this.handleSearch = function (v) {
      this.setState({ search: v.target.value });
    }.bind(this);
  }

  renderPlayerList() {
    return (
      <>
        <ListButton
          id="newPlayer"
          key="newPlayer"
          type="primary-button"
          onClick={this.handleCreateClick}
        >
          <div className="prevent-overflow">+ Add New Player</div>
        </ListButton>
        <input
          type="text"
          name="search"
          id="search"
          placeholder="Search Players"
          className="page-width-input"
          onChange={this.handleSearch}
          style={{
            width: 'calc(100% - 41px)',
            marginLeft: '11px',
            padding: '0px',
            paddingLeft: '10px',
          }}
        />
        {state
          .getAllPlayersAlphabetically()
          .slice()
          .filter((player) => {
            return (
              this.state.search === undefined ||
              player.name
                .toLowerCase()
                .includes(this.state.search.toLowerCase())
            );
          })
          .map((player) => {
            return (
              <ListButton
                id={'player-' + player.id}
                key={'player-' + player.id}
                onClick={this.handlePlayerClick.bind(this, player)}
              >
                <div className="centered-row">
                  <div className="prevent-overflow">{player.name}</div>
                  <div style={{ display: 'flex' }}>
                    <IconButton
                      src="/assets/edit.svg"
                      alt="edit"
                      id={'player-' + player.id + '-edit'}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        this.handleEditClick.bind(this, player)();
                      }}
                      invert
                    />
                  </div>
                </div>
              </ListButton>
            );
          })}
      </>
    );
  }

  render() {
    return <Card title="Players">{this.renderPlayerList()}</Card>;
  }
}

export default CardPlayerList;
