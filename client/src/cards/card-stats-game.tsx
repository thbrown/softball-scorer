import React from 'react';
import Spray from 'components/spray';
import { sortObjectsByDate, toClientDate } from 'utils/functions';
import { convertPlateAppearanceListToPlayerPlateAppearanceList } from 'utils/plateAppearanceFilters';
import IconButton from 'elements/icon-button';
import InnerSection from 'elements/inner-section';
import FloatingSelect from 'elements/floating-select';
import { getGlobalState } from 'state';
import CardSection from 'elements/card-section';
import { Game, Team } from 'shared-lib/types/team';

interface CardStatsGameProps {
  game: Game | null;
  team: Team & { publicIdEnabled?: boolean; publicId?: string };
  showGame: (gameId: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputState?: any;
  isPublic?: boolean;
  backNavUrl?: string;
}


const CardStatsGame = ({
  game,
  team,
  showGame,
  inputState,
  isPublic,
  backNavUrl,
}: CardStatsGameProps) => {
  const [copiedNotificationVisible, setCopiedNotificationVisible] =
    React.useState(false);
  const publicLinkRef = React.useRef<HTMLInputElement>(null);
  const publicIdEnabled = team.publicIdEnabled;

  const games = sortObjectsByDate(team.games, { isAsc: false });
  if (!game) {
    return (
      <CardSection isCentered={true}>
        No games have been scored for this team yet!
      </CardSection>
    );
  }

  const publicLink = `${window.location.origin}/public-teams/${team.publicId}/stats/games/${game.id}`;

  const handleCopyClick = () => {
    const copyText = publicLinkRef.current!;
    copyText.select();
    document.execCommand('copy');
    setCopiedNotificationVisible(true);
    setTimeout(() => {
      setCopiedNotificationVisible(false);
    }, 2999);
    window.getSelection()?.removeAllRanges();
    copyText.blur();
  };

  const handleGameSelectChange = (gameId: string) => {
    showGame(gameId);
  };

  const playerPaList = convertPlateAppearanceListToPlayerPlateAppearanceList(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    game.plateAppearances as any
  );

  return (
    <div>
      <InnerSection>
        <FloatingSelect
          selectId="gameId"
          label="Game"
          initialValue={game.id}
          onChange={handleGameSelectChange}
          values={games.map((game: Game) => {
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
      <Spray
        decoratedPlateAppearances={getGlobalState().getDecoratedPlateAppearancesForGame(
          game,
          inputState
        )}
        hideFilter={true}
      />
      <InnerSection
        style={{
          marginBottom: 'var(--spacing-large)',
        }}
      >
        <div
          style={{
            marginLeft: 'var(--spacing-large)',
          }}
        >
          <h2>Results</h2>
          {playerPaList.map((player: { id: string; name: string; plateAppearances: { id: string; result: string | null }[] }) => {
            return (
              <div className="game-stats-row" key={player.id}>
                <div
                  className="game-stats-cell"
                  style={{
                    width: '120px',
                  }}
                >
                  {player.name}
                </div>
                {player.plateAppearances.map((pa: { id: string; result: string | null }) => {
                  return (
                    <div key={pa.id} className="game-stats-cell">
                      {pa.result}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </InnerSection>

      {/* Conditionally show the link*/}
      {!isPublic && publicIdEnabled ? (
        <>
          <InnerSection
            className="game-stats-description"
            style={{
              padding: '6px',
              fontSize: 'var(--typography-size-small)',
              color: 'var(--color-text-grey)',
            }}
          >
            Public link to this game:
          </InnerSection>

          <InnerSection>
            {copiedNotificationVisible && (
              <span className="game-stats-public-link-copied-text fade-out">
                Link copied
              </span>
            )}

            <div className="game-stats-public-link-container">
              <div className="game-stats-public-link-line-item">
                <span>
                  <IconButton
                    onClick={handleCopyClick}
                    className="game-stats-public-link-copy-button"
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
                className="game-stats-public-link"
              />
            </div>
          </InnerSection>
        </>
      ) : null}
    </div>
  );
};

export default CardStatsGame;
