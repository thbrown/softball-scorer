import React from 'react';
import { getGlobalState } from 'state';
import { setRoute } from 'actions/route';
import Card from 'elements/card';
import ListButton from 'elements/list-button';
import IconButton from 'elements/icon-button';
import type { Player } from 'shared-lib';

interface CardPlayerListState {
  search: string | undefined;
}

class CardPlayerList extends React.Component<Record<string, never>, CardPlayerListState> {
  handlePlayerClick: (player: Player) => void;
  handleEditClick: (player: Player) => void;
  handleCreateClick: () => void;
  handleSearch: (v: React.ChangeEvent<HTMLInputElement>) => void;

  constructor(props: Record<string, never>) {
    super(props);
    this.state = {
      search: undefined,
    };

    this.handlePlayerClick = function (player: Player) {
      setRoute(`/players/${player.id}`);
    };

    this.handleEditClick = function (player: Player) {
      setRoute(`/players/${player.id}/edit`);
    };

    this.handleCreateClick = function () {
      const player = getGlobalState().addPlayer('', 'M');
      setRoute(`/players/${player.id}/edit?isNew=true`);
    };

    this.handleSearch = function (v: React.ChangeEvent<HTMLInputElement>) {
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
        {getGlobalState()
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
                      onClick={(ev: React.MouseEvent) => {
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
