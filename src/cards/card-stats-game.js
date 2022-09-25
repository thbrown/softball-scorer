import React from 'react';
import Spray from 'components/spray';
import { makeStyles } from 'css/helpers';
import { sortObjectsByDate, toClientDate } from 'utils/functions';
import { convertPlateAppearanceListToPlayerPlateAppearanceList } from 'utils/plateAppearanceFilters';
import IconButton from 'elements/icon-button';
import theme from 'css/theme';
import InnerSection from 'elements/inner-section';
import FloatingSelect from 'elements/floating-select';
import state from 'state';
import CardSection from 'elements/card-section';

const useStyles = makeStyles((css) => {
  return {
    headingRow: {
      textAlign: 'center',
      margin: '8px',
      textTransform: 'uppercase',
      fontSize: '1rem',
    },
    statRow: {
      display: 'flex',
    },
    statCell: {
      marginRight: '0.5rem',
      width: '40px',
      whiteSpace: 'pre',
      textOverflow: 'ellipsis',
      overflow: 'hidden',
    },
    publicLink: {
      fontSize: css.typography.size.xSmall,
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
      marginBottom: css.spacing.xxSmall,
      overflow: 'hidden',
      paddingRight: css.spacing.xxSmall,
    },
    description: {
      padding: '1rem',
      textAlign: 'center',
      color: theme.colors.TEXT_GREY,
    },
  };
});

const CardStatsGame = ({
  game,
  team,
  showGame,
  inputState,
  isPublic,
  backNavUrl,
}) => {
  const { classes, styles } = useStyles({});
  const [copiedNotificationVisible, setCopiedNotificationVisible] =
    React.useState(false);
  const publicLinkRef = React.useRef(null);
  const publicIdEnabled = team.publicIdEnabled;
  const publicLink = `${window.location.origin}/public-teams/${team.publicId}/stats/games/${game.id}`;

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

  const handleGameSelectChange = (gameId) => {
    showGame(gameId);
  };

  const playerPaList = convertPlateAppearanceListToPlayerPlateAppearanceList(
    game.plateAppearances,
    inputState
  );

  const games = sortObjectsByDate(team.games, { isAsc: false });

  if (!game) {
    return (
      <CardSection isCentered={true}>
        No games have been scored for this team yet!
      </CardSection>
    );
  }

  return (
    <div>
      <InnerSection>
        <FloatingSelect
          selectId="gameId"
          label="Game"
          initialValue={game.id}
          onChange={handleGameSelectChange}
          values={games.map((game) => {
            return {
              label: `Vs. ${game.opponent}, ${toClientDate(game.date)}`,
              value: game.id,
            };
          })}
          selectStyle={{
            width: '100%',
          }}
        />
      </InnerSection>

      <InnerSection className={classes.description}>
        Tap a location to see information about the plate appearance.
      </InnerSection>
      <Spray
        decoratedPlateAppearances={state.getDecoratedPlateAppearancesForGame(
          game,
          inputState
        )}
        hideFilter={true}
      />
      <InnerSection
        style={{
          marginBottom: '16px',
        }}
      >
        <h2>Results</h2>
        {playerPaList.map((player) => {
          return (
            <div className={classes.statRow} key={player.id}>
              <div
                className={classes.statCell}
                style={{
                  width: '120px',
                }}
              >
                {player.name}
              </div>
              {player.plateAppearances.map((pa) => {
                return (
                  <div key={pa.id} className={classes.statCell}>
                    {pa.result}
                  </div>
                );
              })}
            </div>
          );
        })}
      </InnerSection>

      {/* Conditionally show the link*/}
      {!isPublic && publicIdEnabled ? (
        <>
          <InnerSection
            className={classes.description}
            style={{
              padding: '6px',
              color: theme.colors.TEXT_GREY,
            }}
          >
            Public link to this game!
          </InnerSection>

          <InnerSection>
            {copiedNotificationVisible && (
              <span style={styles.publicLinkCopiedText} className="fade-out">
                Link copied
              </span>
            )}

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
          </InnerSection>
        </>
      ) : null}
    </div>
  );
};

export default CardStatsGame;
