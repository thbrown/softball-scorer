import React from 'react';
import expose from './expose';
import css from 'css';
import state from 'state';
import dialog from 'dialog';
import Card from 'elements/card';
import FloatingInput from 'component-floating-input';
import Textbox from 'elements/Textbox';

export default class CardTeamEdit extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();

    this.state = {
      copiedNotificationVisible: false,
    };

    const teamCopy = JSON.parse(JSON.stringify(props.team));

    const goBack = function() {
      window.history.back();
    };

    this.homeOrBack = function() {
      if (props.isNew) {
        state.removeTeam(props.team.id);
      }
    };

    this.handleConfirmClick = function() {
      state.replaceTeam(props.team.id, teamCopy);
      goBack();
    };

    this.handleCancelClick = function() {
      if (props.isNew) {
        state.removeTeam(props.team.id);
      }
      goBack();
    };

    this.handleDeleteClick = function() {
      dialog.show_confirm(
        `Are you sure you want to delete the team ${props.team.name}?`,
        () => {
          state.removeTeam(props.team.id);
          goBack();
        }
      );
    };

    this.handleNameChange = function() {
      let newValue = document.getElementById('teamName').value;
      teamCopy.name = newValue;
    };

    this.handleCopyClick = function() {
      const copyText = document.getElementById('publicLink');
      copyText.select();
      document.execCommand('copy');
      this.setState({
        copiedNotificationVisible: true,
      });
      setTimeout(() => {
        this.setState({
          copiedNotificationVisible: false,
        });
      }, 5000);
    }.bind(this);
  }

  render() {
    console.log('RENDER TEAM EDIT WITH PROPS', this.props);
    const {
      team: { publicId, publicIdEnabled },
    } = this.props;
    return (
      <Card title="Edit Team">
        <div className="auth-input-container">
          <FloatingInput
            id="teamName"
            maxLength="50"
            label="Team Name"
            onChange={this.handleNameChange}
            defaultValue={this.props.team.name}
          />
          {publicId && (
            <>
              <Textbox>
                <div>
                  <div
                    style={{
                      fontSize: css.typography.size.large,
                    }}
                  >
                    Public Link:
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      padding: css.spacing.xxSmall,
                    }}
                  >
                    <span>
                      <img
                        onClick={this.handleCopyClick}
                        style={{
                          width: css.sizes.ICON,
                          cursor: 'pointer',
                        }}
                        src="/server/assets/copy.svg"
                        alt="copy"
                      />
                    </span>
                  </div>
                  <input
                    id="publicLink"
                    readOnly
                    style={{
                      fontSize: css.typography.size.small,
                      padding: css.spacing.xxSmall,
                      backgroundColor: 'rgba(0, 0, 0, 0)',
                      color: css.colors.TEXT_LIGHT,
                      border: '0px',
                      resize: 'none',
                      whiteSpace: 'unset',
                      overflowWrap: 'unset',
                      minWidth: '50%',
                    }}
                    value={`softball.app/stats/${publicId}`}
                  />
                  <div
                    style={{
                      padding: css.spacing.xxSmall,
                    }}
                  >
                    {this.state.copiedNotificationVisible && (
                      <span className="fade-out"> Link copied </span>
                    )}
                  </div>
                </div>
              </Textbox>
            </>
          )}

          <div
            className="edit-button button confirm-button"
            onClick={this.handleConfirmClick}
          >
            <img
              className="edit-button-icon"
              src="/server/assets/check.svg"
              alt=""
            />
            <span className="edit-button-icon"> Save </span>
          </div>
          <div
            className="edit-button button cancel-button"
            onClick={this.handleCancelClick}
          >
            <img
              className="edit-button-icon"
              src="/server/assets/cancel.svg"
              alt=""
            />
            <span className="edit-button-icon"> Cancel </span>
          </div>
          {!this.props.isNew && (
            <div
              className="edit-button button cancel-button"
              onClick={this.handleDeleteClick}
            >
              <img
                className="edit-button-icon"
                src="/server/assets/delete.svg"
                alt=""
              />
              <span className="edit-button-icon"> Delete </span>
            </div>
          )}
        </div>
      </Card>
    );
  }
}
