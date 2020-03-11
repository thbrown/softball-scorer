import React from 'react';
import state from 'state';
import dialog from 'dialog';
import Card from 'elements/card';
import FloatingInput from 'elements/floating-input';
import CardSection from 'elements/card-section';
import ListButton from 'elements/list-button';
import { goBack, goHome } from 'actions/route';
import { makeStyles } from 'css/helpers';

const useCardTeamEditStyles = makeStyles(css => ({
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
}));

const CardTeamEdit = props => {
  const [team, setTeam] = React.useState(props.team);
  const [
    copiedNotificationVisible,
    setCopiedNotificationVisible,
  ] = React.useState(false);
  const publicLinkRef = React.useRef(null);
  let isPristine = props.isNew ? false : true;

  const homeOrBack = (type, cb) => {
    if (!isPristine) {
      dialog.show_confirm(
        props.isNew
          ? 'Are you sure you wish to discard team?'
          : 'Are you sure you wish to discard changes to team?',
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

  const handleConfirmClick = () => {
    const newTeam = { ...team };
    delete newTeam.copiedNotificationVisible;
    state.replaceTeam(props.team.id, newTeam);
    goBack();
  };

  const handleCancelClick = () => {
    homeOrBack('back', goBack);
  };

  const handleDeleteClick = () => {
    dialog.show_confirm(
      `Are you sure you want to delete the team ${props.team.name}?`,
      () => {
        // FIXME causes a brief 404 to flash on the page
        goBack();
        state.removeTeam(props.team.id);
      }
    );
    return true;
  };

  const handleNameChange = value => {
    isPristine = false;
    setTeam({
      ...team,
      name: value,
    });
  };

  const handlePublicLinkEnabledClicked = ev => {
    setTeam({
      ...team,
      publicIdEnabled: !!ev.target.checked,
    });
  };

  const handleCopyClick = () => {
    const copyText = publicLinkRef.current;
    copyText.select();
    document.execCommand('copy');
    setCopiedNotificationVisible(true);
    setTimeout(() => {
      setCopiedNotificationVisible(false);
    }, 2999);
    window.getSelection().removeAllRanges();
    copyText.blur();
  };

  const { styles } = useCardTeamEditStyles();
  const { publicId, publicIdEnabled } = team;
  const publicLink = `${window.location.host}/public-teams/${publicId}/stats`;

  return (
    <Card
      title="Edit Team"
      leftHeaderProps={{
        onClick: () => homeOrBack('back'),
      }}
      rightHeaderProps={{
        onClick: () => homeOrBack('home'),
      }}
    >
      <div className="auth-input-container">
        <FloatingInput
          maxLength="50"
          label="Team Name"
          onChange={handleNameChange}
          defaultValue={props.team.name}
        />
      </div>
      {publicId && state.isSessionValid() && (
        <>
          <CardSection>
            <div className="auth-input-container">
              <div style={styles.publicLinkLabelBox}>
                <label htmlFor="publicIdEnabled" style={styles.publicLinkLabel}>
                  Public Link
                </label>
                <input
                  id="publicIdEnabled"
                  type="checkbox"
                  checked={!!publicIdEnabled}
                  style={styles.publicLinkCheckbox}
                  onChange={handlePublicLinkEnabledClicked}
                />
                {copiedNotificationVisible && (
                  <span
                    style={styles.publicLinkCopiedText}
                    className="fade-out"
                  >
                    Link copied
                  </span>
                )}
              </div>
              {publicIdEnabled && (
                <div style={styles.publicLinkContainer}>
                  <div style={styles.publicLinkLineItem}>
                    <span>
                      <img
                        onClick={handleCopyClick}
                        style={styles.publicLinkCopyButton}
                        src="/server/assets/copy.svg"
                        alt="copy"
                      />
                    </span>
                  </div>
                  <input
                    id="publicLink"
                    ref={publicLinkRef}
                    readOnly
                    size={publicLink.length}
                    value={publicLink}
                    style={styles.publicLink}
                  />
                </div>
              )}
            </div>
          </CardSection>
        </>
      )}
      <ListButton id="save" onClick={handleConfirmClick}>
        <img
          className="edit-button-icon"
          src="/server/assets/check.svg"
          alt=""
        />
        <span className="edit-button-icon"> Save </span>
      </ListButton>
      <ListButton
        id="cancel"
        className="edit-button button cancel-button"
        onClick={handleCancelClick}
      >
        <img
          className="edit-button-icon"
          src="/server/assets/cancel.svg"
          alt=""
        />
        <span className="edit-button-icon"> Cancel </span>
      </ListButton>
      {!props.isNew && (
        <ListButton id="delete" onClick={handleDeleteClick}>
          <img
            className="edit-button-icon"
            src="/server/assets/delete.svg"
            alt=""
          />
          <span className="edit-button-icon"> Delete </span>
        </ListButton>
      )}
    </Card>
  );
};

export default CardTeamEdit;
