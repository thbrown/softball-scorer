import React, { createRef } from 'react';
import injectSheet from 'react-jss';
import state from 'state';
import dialog from 'dialog';
import Card from 'elements/card';
import FloatingInput from 'elements/floating-input';
import CardSection from 'elements/card-section';
import { goBack, goHome } from 'actions/route';

class CardTeamEdit extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      ...props.team,
      copiedNotificationVisible: false,
    };

    this.publicLinkRef = createRef();
    this.isPristine = this.isNew ? false : true;

    this.homeOrBack = type => cb => {
      if (!this.isPristine) {
        dialog.show_confirm(
          props.isNew
            ? 'Are you sure you wish to discard this team?'
            : 'Are you sure you wish to discard changes to this team?',
          () => {
            if (props.isNew) {
              state.removeTeam(props.team.id);
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

    this.handleConfirmClick = () => {
      const newTeam = { ...this.state };
      delete newTeam.copiedNotificationVisible;
      state.replaceTeam(props.team.id, newTeam);
      goBack();
    };

    this.handleCancelClick = () => {
      this.homeOrBack('back')(goBack);
    };

    this.handleDeleteClick = () => {
      dialog.show_confirm(
        `Are you sure you want to delete the team ${props.team.name}?`,
        () => {
          // FIXME this causes a brief 404 to flash on the page
          goBack();
          state.removeTeam(props.team.id);
        }
      );
      return true;
    };

    this.handleNameChange = value => {
      this.isPristine = false;
      this.setState({
        name: value,
      });
    };

    this.handlePublicLinkEnabledClicked = ev => {
      this.isPristine = false;
      this.setState({
        publicIdEnabled: !!ev.target.checked,
      });
    };

    this.handleCopyClick = () => {
      const copyText = this.publicLinkRef.current;
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
    };
  }

  render() {
    const { classes } = this.props;
    const { publicId, publicIdEnabled } = this.state;
    const publicLink = `${window.location.host}/public-teams/${publicId}/stats`;

    return (
      <Card
        title="Edit Team"
        leftHeaderProps={{
          onClick: this.homeOrBack('back'),
        }}
        rightHeaderProps={{
          onClick: this.homeOrBack('home'),
        }}
      >
        <CardSection>
          <FloatingInput
            maxLength="50"
            label="Team Name"
            onChange={this.handleNameChange}
            defaultValue={this.props.team.name}
          />
        </CardSection>
        {publicId && state.isSessionValid() && (
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
                    ref={this.publicLinkRef}
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
            id="save"
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
            id="cancel"
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
              id="delete"
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
