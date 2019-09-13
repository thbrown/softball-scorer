import React from 'react';
import injectSheet from 'react-jss';
import state from 'state';
import dialog from 'dialog';
import Card from 'elements/card';
import FloatingInput from 'component-floating-input';
import CardSection from 'elements/card-section';
import { setRoute } from 'actions/route';

class CardTeamEdit extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      copiedNotificationVisible: false,
      // Doesn't deep copy "games" however those are not edited here (as of right now)
      teamEditing: { ...props.team },
    };

    const goBack = function() {
      setRoute('/teams');
    };

    this.homeOrBack = function() {
      if (props.isNew) {
        state.removeTeam(props.team.id);
      }
    };

    this.handleConfirmClick = function() {
      state.replaceTeam(props.team.id, this.state.teamEditing);
      goBack();
    }.bind(this);

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

    this.handleNameChange = function(value) {
      const newTeam = { ...this.state.teamEditing, name: value };
      this.setState({
        teamEditing: newTeam,
      });
    }.bind(this);

    this.handlePublicLinkEnabledClicked = function(ev) {
      const newTeam = {
        ...this.state.teamEditing,
        publicIdEnabled: !!ev.target.checked,
      };
      this.setState({
        teamEditing: newTeam,
      });
    }.bind(this);

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
      }, 2999);
      window.getSelection().removeAllRanges();
      copyText.blur();
    }.bind(this);
  }

  render() {
    const { classes } = this.props;
    const {
      teamEditing: { publicId, publicIdEnabled },
    } = this.state;
    const publicLink = `${window.location.host}/public-teams/${publicId}/stats`;

    return (
      <Card title="Edit Team">
        <CardSection>
          <FloatingInput
            id="teamName"
            maxLength="50"
            label="Team Name"
            onChange={this.handleNameChange}
            defaultValue={this.props.team.name}
          />
        </CardSection>
        {publicId && (
          <>
            <CardSection>
              <div className={classes.publicLinkLabelBox}>
                <label
                  htmlFor="publicIdEnabled"
                  className={classes.publicLinkLabel}
                >
                  Public Link
                </label>
                <input
                  id="publicIdEnabled"
                  type="checkbox"
                  checked={!!publicIdEnabled}
                  className={classes.publicLinkCheckbox}
                  onChange={this.handlePublicLinkEnabledClicked}
                />
                {this.state.copiedNotificationVisible && (
                  <span className={classes.publicLinkCopiedText + ' fade-out'}>
                    Link copied
                  </span>
                )}
              </div>
              {publicIdEnabled && (
                <div className={classes.publicLinkContainer}>
                  <div className={classes.publicLinkLineItem}>
                    <span>
                      <img
                        onClick={this.handleCopyClick}
                        className={classes.publicLinkCopyButton}
                        src="/server/assets/copy.svg"
                        alt="copy"
                      />
                    </span>
                  </div>
                  <input
                    id="publicLink"
                    readOnly
                    size={publicLink.length}
                    value={publicLink}
                    className={classes.publicLink}
                  />
                </div>
              )}
            </CardSection>
          </>
        )}
        <CardSection>
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
        </CardSection>
      </Card>
    );
  }
}

const styles = css => ({
  publicLink: {
    fontSize: css.typography.size.xSmall,
    padding: css.spacing.xxSmall,
    backgroundColor: css.colors.INVISIBLE,
    color: css.colors.TEXT_LIGHT,
    border: '0px',
    resize: 'none',
    whiteSpace: 'unset',
    overflowWrap: 'unset',
    overflow: 'hidden',
  },
  publicLinkLabelBox: {
    fontSize: css.typography.size.large,
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  publicLinkLabel: {
    paddingRight: css.spacing.xxSmall,
  },
  publicLinkLineItem: {
    padding: css.spacing.xxSmall,
  },
  publicLinkCopyButton: {
    width: css.sizes.ICON,
    cursor: 'pointer',
  },
  publicLinkCopiedText: {
    opacity: 1,
    transition: 'transition: all 0.5s ease-out',
  },
  publicLinkContainer: {
    backgroundColor: css.colors.PRIMARY_DARK,
    borderRadius: css.spacing.xSmall,
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: css.spacing.xxSmall,
    overflow: 'hidden',
  },
  publicLinkCheckbox: {
    width: '1rem',
    height: '1rem',
    marginRight: css.spacing.xSmall,
  },
});

export default injectSheet(styles)(CardTeamEdit);
