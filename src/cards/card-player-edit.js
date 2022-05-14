import React from 'react';
import dialog from 'dialog';
import state from 'state';
import FloatingInput from 'elements/floating-input';
import WalkupSong from 'component-walkup-song';
import Card from 'elements/card';
import ListButton from 'elements/list-button';
import { goBack, goHome } from 'actions/route';
import network from 'network';
import FloatingReactAsyncCreatableSelect from 'elements/floating-react-async-creatable-select';
import IconButton from 'elements/icon-button';

export default class CardPlayerEdit extends React.Component {
  constructor(props) {
    super(props);

    this.isNew = props.isNew;

    this.state = {
      playerGender: props.player.gender,
      playerName: props.player.name,
      playerSongLink: props.player.song_link,
      playerSongStart: props.player.song_start,
      youTubeKey: 0, // Used as a react 'key' so we can reset the floating label when an a youtube search changes the field
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
      console.log('YoutubeResults', results);
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
                position: 'absolute',
                top: '50%',
                msTransform: 'translateY(-50%)',
                transform: 'translateY(-50%)',
                wordWrap: 'break-word',
                marginLeft: '125px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: 'black',
                height: '87px',
              }}
            >
              {label}
            </div>
          </div>
        );
      }
    };

    this.onYouTubeSelect = function () {
      let timeout;
      return async function (query) {
        if (query.length === 0) {
          return new Promise((resolve) => {
            resolve([]);
          });
        }

        // Don't call the API if the query is less than 4 characters
        if (query.length <= 3) {
          return new Promise((resolve) => {
            resolve([
              {
                label: 'Enter more than 3 characters to search',
                value: undefined,
                thumbnail: '/server/assets/alert.svg',
              },
            ]);
          });
        }

        // Don't call the API if the user entered a valid YouTube link
        if (this.isValidYouTubeVideoLink(query)) {
          return new Promise((resolve) => {
            resolve([
              {
                label: 'Link: ' + query,
                value: query,
                thumbnail: '/server/assets/link.svg',
              },
            ]);
          });
        }

        // Debounced Query
        return new Promise((resolve) => {
          let args = arguments;

          // Define the function we will be debouncing
          let later = async function () {
            timeout = null;
            let result = await this.queryYouTube.apply(this, args);
            resolve(result);
          }.bind(this);

          // Clear the timeout if there is one
          if (timeout) {
            clearTimeout(timeout);
          }

          // Set a new timeout
          timeout = setTimeout(later, 2000);
        });
      }.bind(this);
    }.bind(this);

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

    this.handleYouTubeSelection = function (selectedOption) {
      this.isPristine = false;
      let newValue = selectedOption.value;
      if (this.isValidYouTubeVideoLink(newValue)) {
        // This is a link, extract the video id
        let dataArray = newValue.split(/\/|\?|=|%3D|&/);
        for (let i = 0; i < dataArray.length; i++) {
          let results = dataArray[i].match(/[0-9a-zA-Z-_]{11}/);
          if (results && results.length === 1) {
            this.setState({
              playerSongLink: results[0],
              youTubeKey: this.state.youtubeKey + 1, // force select to update
            });
          }
        }
      } else {
        // Not a link, search populated a video id, set state directly
        this.setState({
          playerSongLink: newValue,
          youTubeKey: this.state.youtubeKey + 1, // force select to update
        });
      }
    }.bind(this);

    this.isValidYouTubeVideoLink = function (url) {
      let result = url.match(
        /(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch|v|embed)(?:\.php)?(?:\?.*v=|\/))([a-zA-Z0-9_-]{11})/
      );
      return result == null ? false : true;
    };

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
  }

  componentDidMount() {
    // TODO: can we use defaultChecked instead?
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
            <FloatingReactAsyncCreatableSelect
              defaultValue={{
                label: this.state.playerSongLink
                  ? `https://youtu.be/${this.state.playerSongLink}`
                  : '',
                value: this.state.playerSongLink,
              }}
              label={'Search YouTube / Paste YouTube Link'}
              loadOptions={this.onYouTubeSelect()}
              formatOptionLabel={this.formatOptionLabel}
              onChange={this.handleYouTubeSelection}
              isValidNewOption={() => {
                return false;
              }}
              key={this.state.youTubeKey}
            />
            <FloatingInput
              inputId="songStart"
              label="Start time in seconds"
              type="number"
              min="0"
              step="1"
              maxLength="50"
              onChange={this.handleSongStartChange}
              defaultValue={this.state.playerSongStart || ''}
            />
            <div id="songLabel" className="song-label">
              Preview
            </div>
            <div id="songWrapper" className="song-preview-container">
              <WalkupSong
                songLink={this.state.playerSongLink}
                songStart={this.state.playerSongStart || ''}
                width={128}
                height={128}
              ></WalkupSong>
              <IconButton
                alt="help"
                className="help-icon"
                src="/server/assets/help.svg"
                onClick={this.handleSongHelpClick}
                invert
              />
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
          <ListButton type="primary-button" onClick={this.handleConfirmClick}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <IconButton src="/server/assets/check.svg" alt="save" />
              <span
                style={{
                  marginLeft: '4px',
                }}
              >
                Save
              </span>
            </div>
          </ListButton>
          <ListButton type="edit-button" onClick={this.handleCancelClick}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <IconButton src="/server/assets/cancel.svg" alt="cancel" invert />
              <span
                style={{
                  marginLeft: '4px',
                }}
              >
                Cancel
              </span>
            </div>
          </ListButton>
          {this.props.isNew ? null : (
            <ListButton type="delete-button" onClick={this.handleDeleteClick}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <IconButton src="/server/assets/delete.svg" alt="delete" />
                <span
                  style={{
                    marginLeft: '4px',
                  }}
                >
                  Delete
                </span>
              </div>
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
