import React from 'react';
import { getGlobalState } from 'state';
import Card from 'elements/card';
import ListButton from 'elements/list-button';
import IconButton from 'elements/icon-button';
import Modal from 'elements/modal';
import { goBack } from 'actions/route';
import type { Player } from 'shared-lib';
import { PlayerId } from 'types/branded-ids';

interface SelectedPlayer {
  id: string;
  name: string;
  gender: string;
}

interface CardPlayerSelectProps {
  players: Player[];
  selected: string[];
  onComplete: (playerIds: string[]) => void;
  onImportClick: () => void;
}

interface CardPlayerSelectState {
  selectedPlayers: SelectedPlayer[];
  search: string;
  searchOpen: boolean;
  createModalOpen: boolean;
  newPlayerName: string;
  newPlayerGender: string;
}

const GENDER_COLORS: Record<string, string> = {
  M: '#ecf1f4',
  F: '#f4ebee',
};

function mapPlayerIdsToSelected(players: string[]): SelectedPlayer[] {
  return players
    .map((playerId) => getGlobalState().getPlayer(playerId as PlayerId))
    .filter((player): player is Player => player !== null)
    .map((player) => ({
      id: player.id,
      name: player.name,
      gender: player.gender,
    }));
}

export default class CardPlayerSelect extends React.Component<
  CardPlayerSelectProps,
  CardPlayerSelectState
> {
  searchContainerRef: React.RefObject<HTMLDivElement>;
  handleDocumentMouseDown: (event: MouseEvent) => void;

  constructor(props: CardPlayerSelectProps) {
    super(props);

    this.searchContainerRef = React.createRef();

    this.state = {
      selectedPlayers: mapPlayerIdsToSelected(props.selected),
      search: '',
      searchOpen: false,
      createModalOpen: false,
      newPlayerName: '',
      newPlayerGender: 'M',
    };

    this.handleDocumentMouseDown = (event: MouseEvent) => {
      if (
        this.state.searchOpen &&
        this.searchContainerRef.current &&
        !this.searchContainerRef.current.contains(event.target as Node)
      ) {
        this.setState({ searchOpen: false });
      }
    };
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleDocumentMouseDown);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleDocumentMouseDown);
  }

  getSelectedPlayerIds = (): string[] => {
    return this.state.selectedPlayers.map((player) => player.id);
  };

  getSearchResults = (): Player[] => {
    const selectedIds = new Set(this.getSelectedPlayerIds());
    const search = this.state.search.trim().toLowerCase();

    if (!search) {
      return [];
    }

    return getGlobalState()
      .getAllPlayersAlphabetically()
      .filter((player) => {
        return (
          !selectedIds.has(player.id) &&
          player.name.toLowerCase().includes(search)
        );
      });
  };

  handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const search = event.target.value;
    this.setState({
      search,
      searchOpen: search.trim().length > 0,
    });
  };

  handleSearchFocus = () => {
    if (this.state.search.trim()) {
      this.setState({ searchOpen: true });
    }
  };

  handleClearSearch = () => {
    this.setState({
      search: '',
      searchOpen: false,
    });
  };

  handlePlayerSelect = (player: Player) => {
    this.setState((prevState) => ({
      selectedPlayers: [
        ...prevState.selectedPlayers,
        {
          id: player.id,
          name: player.name,
          gender: player.gender,
        },
      ],
      search: '',
      searchOpen: false,
    }));
  };

  handleRemovePlayer = (playerId: string) => {
    this.setState((prevState) => ({
      selectedPlayers: prevState.selectedPlayers.filter(
        (player) => player.id !== playerId
      ),
    }));
  };

  handleOpenCreateModal = () => {
    this.setState({
      createModalOpen: true,
      newPlayerName: '',
      newPlayerGender: 'M',
      searchOpen: false,
    });
  };

  handleCloseCreateModal = () => {
    this.setState({
      createModalOpen: false,
      newPlayerName: '',
      newPlayerGender: 'M',
    });
  };

  handleNewPlayerNameChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    this.setState({ newPlayerName: event.target.value });
  };

  handleNewPlayerGenderChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    this.setState({ newPlayerGender: event.target.value });
  };

  handleCreatePlayer = () => {
    const newPlayer = getGlobalState().addPlayer(
      this.state.newPlayerName.trim(),
      this.state.newPlayerGender
    );

    this.setState((prevState) => ({
      selectedPlayers: [
        ...prevState.selectedPlayers,
        {
          id: newPlayer.id,
          name: newPlayer.name,
          gender: newPlayer.gender,
        },
      ],
      createModalOpen: false,
      newPlayerName: '',
      newPlayerGender: 'M',
    }));
  };

  handleConfirmClick = () => {
    this.props.onComplete(this.getSelectedPlayerIds());
    goBack();
  };

  handleCancelClick = () => {
    goBack();
  };

  handleBackClick = () => {
    goBack();
  };

  renderSearchPopover = (): JSX.Element | null => {
    if (!this.state.searchOpen || !this.state.search.trim()) {
      return null;
    }

    const results = this.getSearchResults();

    return (
      <div
        id="player-search-results"
        style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          backgroundColor: 'var(--color-white)',
          border: 'var(--border)',
          borderRadius: 'var(--border-radius-small)',
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 2,
          maxHeight: '240px',
          overflowY: 'auto',
        }}
      >
        {results.length === 0 ? (
          <div style={{ padding: '12px 16px', color: 'var(--color-text-dark)' }}>
            No matching players found
          </div>
        ) : (
          results.map((player) => (
            <div
              key={player.id}
              id={`player-search-result-${player.id}`}
              className="hover"
              onClick={() => this.handlePlayerSelect(player)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                backgroundColor: GENDER_COLORS[player.gender] ?? '#fff',
              }}
            >
              {player.name}
            </div>
          ))
        )}
      </div>
    );
  };

  renderCreatePlayerModal = (): JSX.Element | null => {
    if (!this.state.createModalOpen) {
      return null;
    }

    return (
      <Modal
        open={true}
        title="Create New Player"
        confirmText="Create"
        cancelText="Cancel"
        maxWidth="360px"
        onConfirm={this.handleCreatePlayer}
        onCancel={this.handleCloseCreateModal}
        body={
          <div>
            <label
              htmlFor="new-player-name"
              style={{ display: 'block', marginBottom: '8px' }}
            >
              Name
            </label>
            <input
              id="new-player-name"
              type="text"
              className="page-width-input"
              value={this.state.newPlayerName}
              onChange={this.handleNewPlayerNameChange}
              autoFocus
              style={{ margin: 0, width: '100%' }}
            />
            <div style={{ marginTop: '16px' }}>
              <div style={{ marginBottom: '8px' }}>Gender</div>
              <label style={{ marginRight: '16px' }}>
                <input
                  type="radio"
                  name="new-player-gender"
                  value="M"
                  checked={this.state.newPlayerGender === 'M'}
                  onChange={this.handleNewPlayerGenderChange}
                />{' '}
                Male
              </label>
              <label>
                <input
                  type="radio"
                  name="new-player-gender"
                  value="F"
                  checked={this.state.newPlayerGender === 'F'}
                  onChange={this.handleNewPlayerGenderChange}
                />{' '}
                Female
              </label>
            </div>
          </div>
        }
      />
    );
  };

  renderSelectedPlayers = (): JSX.Element => {
    if (this.state.selectedPlayers.length === 0) {
      return (
        <div
          style={{
            margin: '10px',
            textAlign: 'center',
            color: 'var(--color-text-dark)',
          }}
        >
          No players added yet
        </div>
      );
    }

    return (
      <div id="selected-players-list" style={{ marginTop: '8px' }}>
        {this.state.selectedPlayers.map((player, index) => (
          <div
            key={player.id}
            id={`selected-player-${player.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: GENDER_COLORS[player.gender] ?? '#fff',
              border: 'var(--border)',
              borderRadius: 'var(--border-radius-small)',
              margin: '5px 10px',
              padding: '8px 4px 8px 12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flex: 1,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: '28px',
                  flexShrink: 0,
                  fontWeight: 'bold',
                }}
              >
                {index + 1}.
              </span>
              <span className="prevent-overflow">{player.name}</span>
            </div>
            <img
              id={'remove-' + player.id}
              src="/assets/remove.svg"
              alt="remove"
              className="lineup-row-button"
              style={{
                filter: 'invert(1)',
                flexShrink: 0,
              }}
              onClick={() => this.handleRemovePlayer(player.id)}
            />
          </div>
        ))}
      </div>
    );
  };

  renderButtons = (): JSX.Element => {
    return (
      <div>
        <div>
          <ListButton
            onClick={this.handleConfirmClick}
            type="primary-button"
          >
            Confirm Selection
          </ListButton>
        </div>
        <div>
          <ListButton onClick={this.handleCancelClick}>Cancel</ListButton>
        </div>
        <ListButton id="import" onClick={this.props.onImportClick}>
          Import From Another Game
        </ListButton>
      </div>
    );
  };

  render(): JSX.Element {
    return (
      <Card
        title="Add/Remove Players"
        leftHeaderProps={{
          onClick: this.handleBackClick,
        }}
      >
        <div id="player-select" className="buffer">
          <div
            ref={this.searchContainerRef}
            style={{
              position: 'relative',
              margin: '10px',
            }}
          >
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                id="player-search"
                name="player-search"
                placeholder="Search Players"
                className="page-width-input"
                value={this.state.search}
                onChange={this.handleSearchChange}
                onFocus={this.handleSearchFocus}
                style={{
                  margin: 0,
                  width: '100%',
                  paddingRight: this.state.search ? '48px' : undefined,
                }}
              />
              {this.state.search ? (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconButton
                    id="player-search-clear"
                    src="/assets/cancel.svg"
                    alt="clear search"
                    invert
                    onClick={this.handleClearSearch}
                  />
                </div>
              ) : null}
            </div>
            {this.renderSearchPopover()}
          </div>

          <ListButton
            id="newPlayer"
            onClick={this.handleOpenCreateModal}
          >
            <div className="prevent-overflow">+ Add New Player</div>
          </ListButton>

          {this.renderSelectedPlayers()}
        </div>
        {this.renderButtons()}
        {this.renderCreatePlayerModal()}
      </Card>
    );
  }
}
