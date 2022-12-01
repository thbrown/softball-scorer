import React from 'react';
import state from 'state';
import dialog from 'dialog';
import CardSection from 'elements/card-section';
import { goBack, goHome } from 'actions/route';
import { makeStyles } from 'css/helpers';
import IconButton from '../elements/icon-button';
import css from 'css';
import Loading from 'elements/loading';

const useStatsSharingStyles = makeStyles((css) => ({
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
    fontFamily: 'inherit',
  },
  publicLinkLabelBox: {
    fontSize: css.typography.size.medium,
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
    borderRadius: css.borderRadius.small,
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: css.spacing.xSmall,
    overflow: 'hidden',
  },
  publicLinkCheckbox: {
    width: '1rem',
    height: '1rem',
    marginRight: css.spacing.xSmall,
  },
  helpText: {
    color: css.colors.TEXT_GREY,
    fontSize: css.typography.size.small,
  },
}));

const CardStatsSharing = (props) => {
  const [team, setTeam] = React.useState(props.team);
  const [loading, setLoading] = React.useState(false);
  const [copiedNotificationVisible, setCopiedNotificationVisible] =
    React.useState(false);
  const publicLinkRef = React.useRef(null);

  const handlePublicLinkEnabledClicked = async (ev) => {
    // Show spinner
    setLoading(true);

    let body = {
      value: !!ev.target.checked ? true : false,
      teamId: props.team.id,
    };

    let response = await state.request(
      'POST',
      `server/team-stats/edit`,
      JSON.stringify(body)
    );
    if (response.status === 204) {
      await state.sync();
    } else {
      dialog.show_notification(
        `Error! We were not able to toggle this team's public visibility. Please try again later. ${
          response.body ? response.body.message : ''
        }`,
        function () {
          // Do nothing
        }
      );
    }

    // Hide spinner
    setLoading(false);
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

  const { styles } = useStatsSharingStyles();
  const { publicId, publicIdEnabled } = props.team;
  const publicLink = `${window.location.origin}/public-teams/${publicId}/stats`;

  // Checkbox or spinner
  let checkboxContent = '';
  if (loading) {
    // Show the loading page if there is no optimizer data
    checkboxContent = (
      <div style={{ height: '25px' }}>
        <div>
          <div style={{ opacity: 0.9, zIndex: 1 }}>
            <Loading style={{ width: '25px', height: '25px' }}></Loading>
          </div>
        </div>
      </div>
    );
  } else {
    // Otherwise show the selected optimizer's custom options
    checkboxContent = (
      <input
        id="publicIdEnabled"
        type="checkbox"
        checked={!!publicIdEnabled}
        style={styles.publicLinkCheckbox}
        onChange={handlePublicLinkEnabledClicked}
      />
    );
  }

  let content = null;
  if (state.isSessionValid()) {
    content = (
      <div className="auth-input-container">
        <div style={styles.publicLinkLabelBox}>
          <label htmlFor="publicIdEnabled" style={styles.publicLinkLabel}>
            Enable Public Link for Team Stats Sharing
          </label>
          {checkboxContent}
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
        <div>
          <div style={styles.helpText}>
            Generates a link you can share with others - teammates, fans, etc.
          </div>
          <div style={styles.helpText}>
            Anyone with the link can view this team's stats (updated live).
          </div>
          <div style={styles.helpText}>
            Team stats can be hidden at any time by unchecking the checkbox.
          </div>
        </div>
      </div>
    );
  } else {
    content = (
      <div
        style={{ padding: '1rem', display: 'flex', justifyContent: 'center' }}
      >
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
