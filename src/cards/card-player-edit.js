import React from 'react';
import dialog from 'dialog';
import state from 'state';
import FloatingInput from 'elements/floating-input';
import WalkupSong from 'component-walkup-song';
import Card from 'elements/card';
import ListButton from 'elements/list-button';
import { goBack, goHome } from 'actions/route';
import network from 'network';
import AsyncSelect from 'react-select/async';

export default class CardPlayerEdit extends React.Component {
  constructor(props) {
    super(props);

    this.isNew = props.isNew;

    this.state = {
      playerGender: props.player.gender,
      playerName: props.player.name,
      playerSongLink: props.player.song_link,
      playerSongStart: props.player.song_start,
      youtubeDialogSelection: undefined,
      walkupSongChangeDetector: 0, // Used as a react 'key' so we can reset the floating label when an a youtube search changes the field
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

    this.queryYouTube = async function (query) {
      if (query.length <= 3) {
        return [];
      }
      // Do the query
      const searchTerms = encodeURIComponent(query);
      const url = `server/youtube?q=${searchTerms}`;
      let response = await network.request('GET', url);

      const listOfVideos = response.body.items;

      // Filter so we just get what we want
      let results = [];
      for (let i = 0; i < listOfVideos.length; i++) {
        results.push({
          label: listOfVideos[i].snippet.title,
          value: listOfVideos[i].id.videoId,
          thumbnail: listOfVideos[i].snippet.thumbnails.default.url,
        });
      }
      return results;
    };

    this.formatOptionLabel = ({ value, label, thumbnail }, { context }) => {
      if (context === 'value') {
        return <div>{label}</div>;
      } else {
        // 'menu'
        return (
          <div style={{ display: 'flex', position: 'relative' }}>
            <div>
              <img src={thumbnail} alt={''} width="120" height="90"></img>
            </div>
            <div
              style={{
                margin: 0,
                position: 'absolute',
                top: '50%',
                msTransform: 'translateY(-50%)',
                transform: 'translateY(-50%)',
                wordWrap: 'break-word',
                paddingLeft: '125px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {label}
            </div>
          </div>
        );
      }
    };

    this.debounce = function (func, wait) {
      let timeout;
      return async function () {
        return new Promise((resolve) => {
          let args = arguments;

          // Define the function we will be debouncing
          let later = async function () {
            timeout = null;
            let result = await func.apply(this, args);
            resolve(result);
          };

          // Clear the timeout if there is one
          if (timeout) {
            clearTimeout(timeout);
          }

          // Set a new timeout
          timeout = setTimeout(later, wait);
        });
      }.bind(this);
    };

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
      let newValue = document.getElementById('songLink').value; // TODO: just get value from event?
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
        <div>
          <b>Walkup Song</b>
          <div style={{ margin: '1rem' }}>
            Clips can be played from the player's plate appearance page.
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img
              alt="Plate appearance scoring screenshot"
              src="/server/assets/help-walkup.svg"
            ></img>
          </div>
        </div>,
        undefined
      );
    };

    this.handleYoutubeSearchClick = function () {
      dialog.show_confirm(
        <div>
          <div style={{ padding: '5px' }}>Search YouTube</div>
          <div>
            <AsyncSelect
              cacheOptions
              defaultOptions
              loadOptions={this.debounce(this.queryYouTube, 2000, false)}
              formatOptionLabel={this.formatOptionLabel}
              onChange={this.handleYoutubeVideoSelect}
            />
          </div>
          <div style={{ padding: '5px', paddingTop: '35px' }}>
            Do you want to use the selected video?
          </div>
        </div>,
        this.handleYoutubeDialogConfirm
      );
    }.bind(this);

    this.handleYoutubeVideoSelect = function (selectedOption) {
      this.setState({
        youtubeDialogSelection: selectedOption.value,
      });
    }.bind(this);

    this.handleYoutubeDialogConfirm = async function () {
      if (this.state.youtubeDialogSelection) {
        //document.getElementById('songLink').value = this.state.youtubeSelect;
        this.setState(
          {
            playerSongLink: this.state.youtubeDialogSelection,
            youtubeSelect: undefined,
            walkupSongChangeDetector: this.state.walkupSongChangeDetector + 1,
          },
          this.handleSongLinkChange()
        );
      }
    }.bind(this);
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
            <fieldset className="group">
              <legend className="group-legend">Gender</legend>
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
          <fieldset style={{ padding: '5px' }} className="group">
            <legend className="group-legend">Walk Up Song (Optional)</legend>
            <div style={{ display: 'flex' }}>
              <div style={{ width: '100%' }}>
                <FloatingInput
                  inputId="songLink"
                  label="Walk up song YouTube link"
                  onChange={this.handleSongLinkChange}
                  defaultValue={
                    this.state.playerSongLink
                      ? `https://youtu.be/${this.state.playerSongLink}`
                      : ''
                  }
                  key={this.state.walkupSongChangeDetector}
                />
              </div>
              <div className="icon-button">
                <img
                  alt="search YouYube"
                  className="help-icon"
                  src="/server/assets/search.svg"
                  onClick={this.handleYoutubeSearchClick}
                />
              </div>
            </div>
            <FloatingInput
              inputId="songStart"
              label="Song start time in seconds"
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
                width={128}
                height={128}
              ></WalkupSong>
              <div className="icon-button">
                <img
                  alt="help"
                  className="help-icon"
                  src="/server/assets/help.svg"
                  onClick={this.handleSongHelpClick}
                />
              </div>
            </div>
          </fieldset>
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
