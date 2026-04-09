import React from 'react';
import { getGlobalState } from 'state';
import Card from 'elements/card';
import Select from 'react-select';
import ListButton from 'elements/list-button';
import { goBack, setRoute } from 'actions/route';
import type { Player } from 'shared-lib';

interface PlayerSelectOption {
  value: string;
  label: string;
  gender: string;
}

interface CardPlayerSelectProps {
  players: Player[];
  selected: string[];
  onComplete: (playerIds: string[]) => void;
  onImportClick: () => void;
}

interface CardPlayerSelectState {
  selectedPlayers: PlayerSelectOption[];
  options: PlayerSelectOption[];
  startingValues: PlayerSelectOption[];
  typed: string;
  gender: string;
  menuIsOpen: boolean;
}

export default class CardPlayerSelect extends React.Component<
  CardPlayerSelectProps,
  CardPlayerSelectState
> {
  customStyles: Record<string, (base: any, state?: any) => any>;

  constructor(props: CardPlayerSelectProps) {
    super(props);

    const mapPlayersToEntry = (players: string[]): PlayerSelectOption[] => {
      return players
        .map((playerId) => getGlobalState().getPlayer(playerId))
        .filter((player): player is Player => player !== null)
        .map((player) => ({
          value: player.id,
          label: player.name,
          gender: player.gender,
        }));
    };

    const mapEntriesToPlayerId = (entries: PlayerSelectOption[]): string[] => {
      return entries.map((entry) => entry.value);
    };

    const options = mapPlayersToEntry(this.props.players.map((p) => p.id));
    const startingValues = mapPlayersToEntry(props.selected);

    this.state = {
      selectedPlayers: startingValues,
      options: options,
      startingValues: startingValues,
      typed: '',
      gender: 'M',
      menuIsOpen: false,
    };

    this.onInputChange = (inputValue: string): void => {
      this.adjustSpacerDivHeight();
      this.setState({
        typed: inputValue,
      });

      // Open menu if the user has type anything
      let menuIsOpen = false;
      if (inputValue) {
        menuIsOpen = true;
      }
      this.setState({
        menuIsOpen,
      });
    };

    this.handleRadioButtonChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
      this.setState({
        gender: event.target.value,
      });
    };

    this.handleConfirmClick = (): void => {
      props.onComplete(mapEntriesToPlayerId(this.state.selectedPlayers));
      goBack();
    };

    this.handleCancelClick = (): void => {
      goBack();
    };

    this.handleBackClick = (): void => {
      goBack();
    };

    this.handleBackOrHome = (): void => {
      props.onComplete(mapEntriesToPlayerId(this.state.selectedPlayers));
    };

    this.onChange = (selectedOptions: PlayerSelectOption[] | null): void => {
      if (selectedOptions) {
        this.setState({
          selectedPlayers: selectedOptions,
        });
      } else {
        this.setState({
          selectedPlayers: [],
        });
      }
    };

    // Lots of bad code in this method, see comments
    this.adjustSpacerDivHeight = (): void => {
      const adjust = (): void => {
        // Neither of these are good selectors, but I'm not sure how else to get the menu
        // height from inside the component
        //let menus = document.querySelectorAll('div[class$="-menu"]');
        //if (!menus) {
        // Idk why the '-menu' suffix is left off the css class for builds on some computers
        // but not for builds on others, here is an alternative selector
        const selectContainer = document.getElementById('select-container');
        let menus: Element[] = [];
        if (selectContainer?.children[0]?.children[2]) {
          menus = [selectContainer.children[0].children[2]];
        }
        //}
        let height = 10;
        if (menus.length === 1 && menus[0]) {
          height = (menus[0] as HTMLElement).clientHeight;
        }
        const spacer = document.getElementById('spacer');
        if (spacer) {
          spacer.style.height = `${height}px`; // inline style :(
        }
      };

      // Lame way to make sure this gets the height after it's been rendered (Maybe this
      // can go as a callback to setState instead?)
      setTimeout(adjust, 10);
    };

    this.onCreatePlayerClick = (): void => {
      const newPlayer = getGlobalState().addPlayer(
        this.state.typed,
        this.state.gender
      );

      // Duplicate options
      const optionsCopy: PlayerSelectOption[] = JSON.parse(JSON.stringify(this.state.options));
      optionsCopy.push({ label: newPlayer.name, value: newPlayer.id, gender: newPlayer.gender });
      this.setState({
        options: optionsCopy,
      });

      // Add the player to the selection list
      this.setState((prevState) => ({
        selectedPlayers: [
          ...prevState.selectedPlayers,
          {
            value: newPlayer.id,
            label: newPlayer.name,
            gender: newPlayer.gender,
          },
        ],
        typed: '',
      }));
    };

    this.noOptionsMessage = (): JSX.Element => {
      if (!this.state.typed) {
        return <div>Type a name to add a new player</div>;
      }
      return (
        <div>
          Add a new player: <br />
          First name: <b>{this.state.typed}</b>
          <br />
          <input
            type="radio"
            onClick={this.handleRadioButtonChange.bind(this)}
            name="gender"
            value="M"
          />{' '}
          Male
          <input
            type="radio"
            onClick={this.handleRadioButtonChange.bind(this)}
            name="gender"
            value="F"
          />{' '}
          Female <br />
          <button type="button" onClick={this.onCreatePlayerClick.bind(this)}>
            Create
          </button>
        </div>
      );
    };

    // https://react-select.com/styles
    this.customStyles = {
      option: (providedStyles: any): any => {
        const modifications = {
          padding: 15,
        };
        return Object.assign(providedStyles, modifications);
      },
      multiValue: (providedStyles: any, { data }: { data: PlayerSelectOption }): any => {
        const modifications: any = {
          padding: 8,
        };
        if (data.gender === 'M') {
          modifications.backgroundColor = '#ecf1f4';
        } else if (data.gender === 'F') {
          modifications.backgroundColor = '#f4ebee';
        }
        return Object.assign(providedStyles, modifications);
      },
      menu: (providedStyles: any): any => {
        const modifications = {
          padding: 1,
        };
        return Object.assign(providedStyles, modifications);
      },
    };
  }

  renderButtons = (): JSX.Element => {
    return (
      <div>
        <div id="spacer" style={{ transition: 'height .25s' }} />
        <div>
          <ListButton
            onClick={this.handleConfirmClick.bind(this)}
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

  renderPlayerSelection = (): JSX.Element => {
    return (
      <div id="select-container" className="buffer">
        <Select
          isMulti
          styles={this.customStyles}
          options={this.state.options}
          autosize={false}
          closeMenuOnSelect={false}
          blurInputOnSelect={false}
          backspaceRemovesValue={false}
          onMenuOpen={this.adjustSpacerDivHeight}
          onMenuClose={this.adjustSpacerDivHeight}
          onChange={this.onChange.bind(this)}
          onInputChange={this.onInputChange.bind(this)}
          noOptionsMessage={this.noOptionsMessage.bind(this)}
          defaultValue={this.state.startingValues}
          menuIsOpen={this.state.menuIsOpen}
          placeholder={"Type a player's name..."}
          value={this.state.selectedPlayers}
          inputValue={this.state.typed}
        />
      </div>
    );
  };

  onInputChange!: (inputValue: string) => void;
  handleRadioButtonChange!: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleConfirmClick!: () => void;
  handleCancelClick!: () => void;
  handleBackClick!: () => void;
  handleBackOrHome!: () => void;
  onChange!: (selectedOptions: PlayerSelectOption[] | null) => void;
  adjustSpacerDivHeight!: () => void;
  onCreatePlayerClick!: () => void;
  noOptionsMessage!: () => JSX.Element;

  render(): JSX.Element {
    return (
      <Card
        title="Add/Remove Players"
        leftHeaderProps={{
          onClick: this.handleBackClick,
        }}
      >
        {this.renderPlayerSelection()}
        {this.renderButtons()}
      </Card>
    );
  }
}
