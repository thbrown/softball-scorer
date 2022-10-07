import React from 'react';
import state from 'state';
import dialog from 'dialog';
import CardSection from 'elements/card-section';
import { goBack, goHome } from 'actions/route';
import { makeStyles } from 'css/helpers';
import IconButton from '../elements/icon-button';
import css from 'css';

const useCardTeamEditStyles = makeStyles((css) => ({
  publicLink: {
    fontSize: css.typography.size.xSmall,
    padding: css.spacing.xxSmall,
    backgroundColor: css.colors.INVISIBLE,
    color: css.colors.TEXT_DARK,
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
    color: css.colors.TEXT_DARK,
    backgroundColor: css.colors.BACKGROUND,
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

const CardStatsSharing = (props) => {
  const [team, setTeam] = React.useState(props.team);
  const [copiedNotificationVisible, setCopiedNotificationVisible] =
    React.useState(false);
  const publicLinkRef = React.useRef(null);

  const handlePublicLinkEnabledClicked = (ev) => {
    setTeam({
      ...team,
      publicIdEnabled: !!ev.target.checked,
    });
    state.setTeamPublicIdEnabled(team.id, !!ev.target.checked);
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
  const publicLink = `${window.location.origin}/public-teams/${publicId}/stats`;

  let content = null;
  if (publicId && state.isSessionValid()) {
    content = (
      <div className="auth-input-container">
        <div
          style={{
            textAlign: 'left',
            fontSize: css.typography.size.medium,
            marginBottom: '32px',
          }}
        >
          <p
            style={{
              textTransform: 'uppercase',
              fontWeight: 'unset',
            }}
          >
            Share team stats with others
          </p>
          <p
            style={{
              color: css.colors.TEXT_DESC,
            }}
          >
            Check the "Public Link" checkbox below to generate link you can
            share with others (teammates, fans, etc...) that will allow them to
            view team statistics. Public page is updated live and can be hidden
            at any time by unchecking the checkbox below.
          </p>
        </div>
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
            <span style={styles.publicLinkCopiedText} className="fade-out">
              Link copied
            </span>
          )}
        </div>
        {publicIdEnabled && (
          <div style={styles.publicLinkContainer}>
            <div style={styles.publicLinkLineItem}>
              <span>
                <IconButton
                  onClick={handleCopyClick}
                  style={styles.publicLinkCopyButton}
                  src="/server/assets/copy.svg"
                  alt="copy"
                  invert
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
    );
  } else {
    content = (
      <div>
        Your session has expired. Login from the main menu to change stats
        sharing settings.
      </div>
    );
  }

  return (
    <div
      style={{
        margin: '0px ' + css.spacing.xxSmall,
      }}
    >
      {content}
    </div>
  );
};

export default CardStatsSharing;
