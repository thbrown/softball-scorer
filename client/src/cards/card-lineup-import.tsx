import React from 'react';
import { getGlobalState } from 'state';
import Card from 'elements/card';
import ListPicker from 'elements/list-picker';
import { sortObjectsByDate, toClientDate } from 'utils/functions';
import { Team, Game } from 'shared-lib/types/team';
import { TeamId, GameId, PlayerId } from 'types/branded-ids';

interface ListItem {
  name: string;
  id: string;
  floatName?: string;
  date?: number;
}

const toItems = (list: Array<{ name?: string; opponent?: string; id: string; date?: number }>): ListItem[] =>
  list.map((obj) => ({
    name: obj.name || obj.opponent || '',
    id: obj.id,
    floatName: obj.date ? toClientDate(obj.date) : undefined,
    date: obj.date,
  }));

interface LineupListProps {
  team: Team | null;
  setTeam: (team: Team | null) => void;
  game: Game | null;
  setGame: (game: Game | null) => void;
  handleConfirmClick: (ev: React.MouseEvent, team: Team, game: Game) => void;
  handleCancelClick: () => void;
}

const LineupList = (props: LineupListProps) => {
  const handleTeamItemClick = (item: ListItem) => {
    props.setTeam(getGlobalState().getTeam(item.id as TeamId) ?? null);
    window.scroll(0, 0);
  };
  const handleGameItemClick = (item: ListItem) => {
    props.setGame(getGlobalState().getGame(item.id as GameId) ?? null);
    window.scroll(0, 0);
  };

  const handleConfirmClick = props.handleConfirmClick;
  const handleCancelClick = props.handleCancelClick;

  if (props.game && props.team) {
    const team = props.team;
    const game = props.game;
    return (
      <>
        <div className="lineup-import-title"> Use this lineup? </div>
        <div className="lineup-import-chip-container">
          <div className="lineup-import-chip">{team.name}</div>
          <span className="lineup-import-vs"> vs. </span>
          <div className="lineup-import-chip">{game.opponent}</div>
        </div>
        <ListPicker
          itemClassName="lineup-import-item-custom"
          textClassName="lineup-import-item-text"
          items={game.lineup
            .map((playerId: string) => getGlobalState().getPlayer(playerId as PlayerId))
            .filter((p): p is NonNullable<typeof p> => p !== undefined)
            .map((player) => ({ name: player.name, id: player.id }))}
          onClick={() => {}}
        />
        <div className="lineup-import-action-button-container">
          <div
            id="confirm"
            className="button primary-button lineup-import-action-button"
            onClick={(ev) => handleConfirmClick(ev, team, game)}
          >
            Confirm
          </div>
        </div>
        <div className="lineup-import-action-button-container">
          <div
            id="cancel"
            className="button tertiary-button lineup-import-action-button"
            onClick={handleCancelClick}
          >
            Cancel
          </div>
        </div>
      </>
    );
  } else if (props.team) {
    return (
      <>
        <div className="lineup-import-title"> Pick a game </div>
        <div className="lineup-import-chip-container">
          <div className="lineup-import-chip">{props.team.name}</div>
        </div>
        <ListPicker
          textClassName="lineup-import-item-text"
          items={sortObjectsByDate(toItems([...props.team.games]), {
            isAsc: false,
          })}
          onClick={handleGameItemClick}
        />
      </>
    );
  } else {
    return (
      <>
        <div className="lineup-import-title"> Pick a team </div>
        <ListPicker
          items={toItems([...getGlobalState().getLocalState().teams].reverse())}
          onClick={handleTeamItemClick}
        />
      </>
    );
  }
};

interface CardLineupImportProps {
  handleConfirmClick: (ev: React.MouseEvent, team: Team, game: Game) => void;
  handleCancelClick: () => void;
}

const CardImport = (props: CardLineupImportProps) => {
  const [team, setTeam] = React.useState<Team | null>(null);
  const [game, setGame] = React.useState<Game | null>(null);

  const handleBackClick = () => () => {
    // Back means different things in each stage of the import wizard
    let skipDefaultBack = false;
    if (game) {
      setGame(null);
      skipDefaultBack = true;
    } else if (team) {
      setTeam(null);
      skipDefaultBack = true;
    }
    return skipDefaultBack;
  };

  return (
    <Card
      title="Import Lineup"
      leftHeaderProps={{
        onClick: handleBackClick,
      }}
    >
      <LineupList
        {...props}
        team={team}
        setTeam={setTeam}
        game={game}
        setGame={setGame}
      />
    </Card>
  );
};

export default CardImport;
