import React from 'react';
import { getGlobalState } from 'state';
import { setRoute } from 'actions/route';
import Card from 'elements/card';
import ListButton from 'elements/list-button';
import IconButton from 'elements/icon-button';
import type { Player } from 'shared-lib';

const PLAYER_LIST_SEARCH_PARAM = 'q';

function getPlayerListSearchFromUrl(): string | undefined {
  const q = new URLSearchParams(window.location.search).get(
    PLAYER_LIST_SEARCH_PARAM
  );
  return q || undefined;
}

function setPlayerListSearchInUrl(search: string | undefined) {
  const params = new URLSearchParams(window.location.search);
  if (search) {
    params.set(PLAYER_LIST_SEARCH_PARAM, search);
  } else {
    params.delete(PLAYER_LIST_SEARCH_PARAM);
  }
  const queryString = params.toString();
  window.history.replaceState(
    {},
    '',
    window.location.pathname + (queryString ? `?${queryString}` : '')
  );
}

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
      search: getPlayerListSearchFromUrl(),
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
      const search = v.target.value || undefined;
      setPlayerListSearchInUrl(search);
      this.setState({ search });
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
          value={this.state.search ?? ''}
          onChange={this.handleSearch}
          style={{
            marginLeft: '11px',
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
