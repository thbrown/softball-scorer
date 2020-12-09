import React from 'react';
import dialog from 'dialog';
import state from 'state';
import FloatingInput from 'elements/floating-input';
import WalkupSong from 'component-walkup-song';
import Card from 'elements/card';
import ListButton from 'elements/list-button';
import { goBack, goHome } from 'actions/route';

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

    const buildPlayer = () => {
      const player = JSON.parse(JSON.stringify(props.player));
      player.name = this.state.playerName;
      player.gender = this.state.playerGender;
      player.song_link = this.state.playerSongLink;
      player.song_start = this.state.playerSongStart;
      return player;
    };

    this.isPristine = props.isNew ? false : true;

    this.homeOrBack = (type) => (cb) => {
      if (!this.isPristine) {
        dialog.show_confirm(
          props.isNew
            ? 'Are you sure you wish to discard this player?'
            : 'Are you sure you wish to discard changes to this player?',
          () => {
            if (props.isNew) {
              state.removePlayer(props.player.id);
            }
            if (type === 'home') {
              goHome();
            } else {
              goBack();
            }
          }
        );
        return true;
      }
      if (cb) {
        cb();
      }
    };

    this.handleConfirmClick = function () {
      state.replacePlayer(props.player.id, buildPlayer());
      goBack();
    };

    this.handleCancelClick = () => {
      this.homeOrBack('back')(goBack);
    };

    this.handleDeleteClick = function () {
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

    this.handlePlayerNameChange = (value) => {
      this.isPristine = false;
      this.setState({
        playerName: value,
      });
    };

    this.handleGenderChange = function (ev) {
      this.isPristine = false;
      this.setState({
        playerGender: ev.target.value,
      });
    }.bind(this);

    this.handleSongLinkChange = function () {
      this.isPristine = false;
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

    this.handleSongStartChange = function () {
      this.isPristine = false;
      this.setState({
        playerSongStart: document.getElementById('songStart').value,
      });
    }.bind(this);

    this.handleSongHelpClick = function () {
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
    return (
      <>
        <div className="auth-input-container">
          <FloatingInput
            inputId="playerName"
            label="Player Name"
            onChange={this.handlePlayerNameChange}
            defaultValue={this.state.playerName}
          />
          <div className="radio-button">
            <fieldset className="radio-button-fieldset">
              <legend className="radio-button-legend">Gender</legend>
              <div className="radio-button-option">
                <input
                  type="radio"
                  name="gender"
                  value="M"
                  id="maleGenderChoice"
                  onChange={this.handleGenderChange}
                />
                <label htmlFor="maleGenderChoice">Male</label>
              </div>
              <div className="radio-button-option">
                <input
                  type="radio"
                  name="gender"
                  value="F"
                  id="femaleGenderChoice"
                  onChange={this.handleGenderChange}
                />
                <label htmlFor="femaleGenderChoice">Female</label>
              </div>
            </fieldset>
          </div>
          <FloatingInput
            inputId="songLink"
            label="Walk up song YouTube link (Optional)"
            onChange={this.handleSongLinkChange}
            defaultValue={
              this.state.playerSongLink
                ? `https://youtu.be/${this.state.playerSongLink}`
                : ''
            }
          />
          <FloatingInput
            inputId="songStart"
            label="Song start time in seconds (Optional)"
            type="number"
            min="0"
            step="1"
            maxLength="50"
            onChange={this.handleSongStartChange}
            defaultValue={this.state.playerSongStart || ''}
          />
          <div id="songLabel" className="song-label">
            Song Preview
          </div>
          <div id="songWrapper" className="song-preview-container">
            <WalkupSong
              songLink={this.state.playerSongLink}
              songStart={this.state.playerSongStart || ''}
              width={48}
              height={48}
            ></WalkupSong>
            <div className="help-container">
              <img
                alt="help"
                className="help-icon"
                src="/server/assets/help.svg"
                onClick={this.handleSongHelpClick}
              />
            </div>
          </div>
        </div>
        {this.renderSaveOptions()}
      </>
    );
  }

  renderSaveOptions() {
    return (
      <>
        <>
          <ListButton id="save" onClick={this.handleConfirmClick}>
            <img
              className="edit-button-icon"
              src="/server/assets/check.svg"
              alt="save"
            />
            <span className="edit-button-icon">Save</span>
          </ListButton>
          <ListButton id="cancel" onClick={this.handleCancelClick}>
            <img
              className="edit-button-icon"
              src="/server/assets/cancel.svg"
              alt="cancel"
            />
            <span className="edit-button-icon">Cancel</span>
          </ListButton>
          {this.props.isNew ? null : (
            <ListButton id="delete" onClick={this.handleDeleteClick}>
              <img
                className="edit-button-icon"
                src="/server/assets/delete.svg"
                alt="delete"
              />
              <span className="edit-button-icon">Delete</span>
            </ListButton>
          )}
        </>
      </>
    );
  }

  render() {
    return (
      <Card
        title="Edit Player"
        leftHeaderProps={{ onClick: this.homeOrBack('back') }}
        rightHeaderProps={{ onClick: this.homeOrBack('home') }}
      >
        {this.renderPlayerEdit()}
      </Card>
    );
  }
}
