import React from 'react';
import { getGlobalState } from 'state';
import dialog from 'dialog';
import IconButton from '../elements/icon-button';
import Loading from 'elements/loading';

const CardStatsSharing = (props) => {
  const [loading, setLoading] = React.useState(false);
  const [copiedNotificationVisible, setCopiedNotificationVisible] =
    React.useState(false);
  const publicLinkRef = React.useRef(null);

  const handlePublicLinkEnabledClicked = async (ev) => {
    // Show spinner
    setLoading(true);

    let body = {
      value: ev.target.checked ? true : false,
      teamId: props.team.id,
    };

    let response = await getGlobalState().requestAuth(
      'POST',
      `server/team-stats/edit`,
      JSON.stringify(body)
    );
    if (response.status === 204) {
      await getGlobalState().sync();
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

  const { publicId, publicIdEnabled } = props.team;
  const publicLink = `${window.location.origin}/public-teams/${publicId}/stats`;

  // Checkbox or spinner
  let checkboxContent = '';
  if (loading) {
    // Show the loading page if there is no optimizer data
    checkboxContent = (
      <div>
        <div>
          <div style={{ opacity: 0.9, zIndex: 1 }}>
            <Loading style={{ width: '18px' }}></Loading>
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
        className="public-link-checkbox"
        onChange={handlePublicLinkEnabledClicked}
      />
    );
  }

  let content = null;
  if (getGlobalState().isSessionValid()) {
    content = (
      <div className="auth-input-container">
        <div className="public-link-label-box">
          <label htmlFor="publicIdEnabled" className="public-link-label">
            Enable Public Link for Team Stats Sharing
          </label>
          {checkboxContent}
          {copiedNotificationVisible && (
            <span className="public-link-copied-text fade-out">
              Link copied
            </span>
          )}
        </div>
        <div>
          <div className="stats-sharing-help-text" style={{ margin: '1rem 0px' }}>
            A public link is one you can share with others - teammates, fans,
            etc. Anyone with the link can view this team's stats (updated live).
            Team stats can be hidden at any time by unchecking the checkbox.
          </div>
          <div className="stats-sharing-help-text" style={{ margin: '1rem 0px' }}></div>
        </div>
        {publicIdEnabled && (
          <div className="public-link-container">
            <div className="public-link-line-item">
              <span>
                <IconButton
                  onClick={handleCopyClick}
                  className="public-link-copy-button"
                  src="/assets/copy.svg"
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
              className="public-link"
            />
          </div>
        )}
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
        margin: '0px var(--spacing-xx-small)',
      }}
    >
      {content}
    </div>
  );
};

export default CardStatsSharing;
