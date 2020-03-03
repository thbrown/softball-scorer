import React from 'react';
import DOM from 'react-dom-factories';
import dialog from 'dialog';
import state from 'state';
import LeftHeaderButton from 'component-left-header-button';
import RightHeaderButton from 'component-right-header-button';
import FloatingInput from 'elements/floating-input';
import WalkupSong from 'component-walkup-song';
import { goBack } from 'actions/route';

export default class CardPlayerEdit extends React.Component {
  constructor(props) {
    super(props);

    this.isNew = props.isNew;

    this.state = {
      playerGender: props.player.gender,
      playerName: props.player.name,
      playerSongLink: props.player.song_link,
      playerSongStart: props.player.song_start,
    };

    let buildPlayer = function() {
      let player = JSON.parse(JSON.stringify(props.player));
      player.name = this.state.playerName;
      player.gender = this.state.playerGender;
      player.song_link = this.state.playerSongLink;
      player.song_start = this.state.playerSongStart;
      return player;
    }.bind(this);

    this.homeOrBack = function() {
      let newPlayer = buildPlayer();
      if (
        props.isNew &&
        JSON.stringify(newPlayer) === JSON.stringify(props.player)
      ) {
        state.removePlayer(props.player.id);
      } else {
        state.replacePlayer(props.player.id, newPlayer);
      }
    };

    this.handleConfirmClick = function() {
      state.replacePlayer(props.player.id, buildPlayer());
      goBack();
    };

    this.handleCancelClick = function() {
      if (props.isNew) {
        state.removePlayer(props.player.id);
      }
      goBack();
    };

    this.handleDeleteClick = function() {
      dialog.show_confirm(
        'Are you sure you want to delete the player "' +
          this.state.playerName +
          '"?',
        () => {
          if (state.removePlayer(props.player.id)) {
            goBack();
          } else {
            dialog.show_notification(
              `Unable to delete player ${this.state.playerName}. This player either has existing plate appearances and/or is listed on at least one game's lineup.`
            );
          }
        }
      );
    }.bind(this);

    this.handlePlayerNameChange = function() {
      this.setState({
        playerName: document.getElementById('playerName').value,
      });
    }.bind(this);

    this.handleGenderChange = function(event) {
      this.setState({
        playerGender: event.target.value,
      });
    }.bind(this);

    this.handleSongLinkChange = function() {
      let newValue = document.getElementById('songLink').value;
      let dataArray = newValue.split(/\/|\?|=|%3D|&/);
      for (let i = 0; i < dataArray.length; i++) {
        let results = dataArray[i].match(/[0-9a-zA-Z-_]{11}/);
        if (results && results.length === 1) {
          this.setState({
            playerSongLink: results[0],
          });
        }
      }
    }.bind(this);

    this.handleSongStartChange = function() {
      this.setState({
        playerSongStart: document.getElementById('songStart').value,
      });
    }.bind(this);

    this.handleSongHelpClick = function() {
      dialog.show_notification(
        // TODO - Read this from a file so the format isn't dependent on indent spaces.
        `**Walkup Song**

Clips can be played from the player's plate appearance page

![Plate appearance scoring screenshot](/server/assets/help-walkup.svg)`,
        undefined
      );
    };
  }

  componentDidMount() {
    if (this.state.playerGender === 'F') {
      document.getElementById('femaleGenderChoice').checked = true;
    } else {
      document.getElementById('maleGenderChoice').checked = true;
    }
  }

  renderPlayerEdit() {
    return DOM.div(
      {
        className: 'auth-input-container',
      },
      [
        React.createElement(FloatingInput, {
          key: 'playerName',
          inputId: 'playerName',
          label: 'Player name',
          onChange: this.handlePlayerNameChange.bind(this),
          defaultValue: this.state.playerName,
        }),
        DOM.div(
          {
            key: 'genderPanel',
            className: 'radio-button',
          },
          DOM.fieldset(
            {
              className: 'radio-button-fieldset',
            },
            DOM.legend(
              {
                className: 'radio-button-legend',
              },
              'Gender'
            ),
            DOM.div(
              {
                className: 'radio-button-option',
              },
              DOM.input({
                type: 'radio',
                name: 'gender',
                value: 'M',
                id: 'maleGenderChoice',
                onChange: this.handleGenderChange,
              }),
              DOM.label(
                {
                  htmlFor: 'maleGenderChoice',
                },
                'Male'
              )
            ),
            DOM.div(
              {
                className: 'radio-button-option',
              },
              DOM.input({
                type: 'radio',
                name: 'gender',
                value: 'F',
                id: 'femaleGenderChoice',
                onChange: this.handleGenderChange,
              }),
              DOM.label(
                {
                  htmlFor: 'femaleGenderChoice',
                },
                'Female'
              )
            )
          )
        ),
        React.createElement(FloatingInput, {
          key: 'songLink',
          inputId: 'songLink',
          label: 'Walk up song YouTube link (Optional)',
          onChange: this.handleSongLinkChange.bind(this),
          defaultValue: this.state.playerSongLink
            ? `https://youtu.be/${this.state.playerSongLink}`
            : '',
        }),
        React.createElement(FloatingInput, {
          key: 'songStart',
          inputId: 'songStart',
          label: 'Song start time in seconds (Optional)',
          type: 'number',
          min: '0',
          step: '1',
          maxLength: '50',
          onChange: this.handleSongStartChange.bind(this),
          defaultValue: this.state.playerSongStart,
        }),

        DOM.div(
          {
            key: 'songLabel',
            id: 'songLabel',
            className: 'song-label',
          },
          'Song Preview'
        ),
        DOM.div(
          {
            key: 'songWrapper',
            id: 'songWrapper',
            className: 'song-preview-container',
          },
          React.createElement(WalkupSong, {
            songLink: this.state.playerSongLink,
            songStart: this.state.playerSongStart,
            width: 48,
            height: 48,
          }),
          DOM.div(
            { className: 'help-container' },
            DOM.img({
              className: 'help-icon',
              src: '/server/assets/help.svg',
              onClick: this.handleSongHelpClick,
            })
          )
        ),
      ],
      this.renderSaveOptions()
    );
  }

  renderSaveOptions() {
    let buttons = [];

    buttons.push(
      DOM.div(
        {
          key: 'confirm',
          className: 'edit-button button confirm-button',
          // TODO - Make this a component and fix the style there with CSS.
          style: {
            marginLeft: '0',
            marginRight: '0',
          },
          onClick: this.handleConfirmClick,
        },
        DOM.img({
          className: 'edit-button-icon',
          src: '/server/assets/check.svg',
        }),
        'Save'
      )
    );

    buttons.push(
      DOM.div(
        {
          key: 'cancel',
          className: 'edit-button button cancel-button',
          // TODO - Make this a component and fix the style there with CSS.
          style: {
            marginLeft: '0',
            marginRight: '0',
          },
          onClick: this.handleCancelClick,
        },
        DOM.img({
          className: 'edit-button-icon',
          src: '/server/assets/cancel.svg',
        }),
        'Cancel'
      )
    );

    if (!this.isNew) {
      buttons.push(
        DOM.div(
          {
            key: 'delete',
            className: 'edit-button button cancel-button',
            // TODO - Make this a component and fix the style there with CSS.
            style: {
              marginLeft: '0',
              marginRight: '0',
            },
            onClick: this.handleDeleteClick,
          },
          DOM.img({
            className: 'edit-button-icon',
            src: '/server/assets/delete.svg',
          }),
          'Delete'
        )
      );
    }

    return DOM.div(
      {
        key: 'saveOptions',
      },
      buttons
    );
  }

  render() {
    return DOM.div(
      {
        className: 'card',
        style: {},
      },
      DOM.div(
        {
          className: 'card-title',
        },
        React.createElement(LeftHeaderButton, {
          onPress: this.homeOrBack,
        }),
        DOM.div(
          {
            className: 'card-title-text-with-arrow',
          },
          'Edit Player'
        ),
        React.createElement(RightHeaderButton, {
          onPress: this.homeOrBack,
        })
      ),
      DOM.div(
        {
          className: 'card-body',
        },
        this.renderPlayerEdit()
      )
    );
  }
}
