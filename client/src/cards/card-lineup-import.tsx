import React from 'react';
import { getGlobalState } from 'state';
import css from 'css';
import Card from 'elements/card';
import { makeStyles } from 'css/helpers';
import ListPicker from 'elements/list-picker';
import { sortObjectsByDate, toClientDate } from 'utils/functions';
import { Team, Game } from 'shared-lib/types/team';
import { TeamId, GameId, PlayerId } from 'types/branded-ids';

const useLineupListStyles = makeStyles((theme) => ({
  title: {
    position: 'sticky',
    left: '0px',
    fontSize: theme.typography.size.xLarge,
    textAlign: 'center',
    color: theme.colors.TEXT_DARK,
    padding: theme.spacing.xSmall,
    backgroundColor: theme.colors.BACKGROUND,
    // boxShadow: '0px 2px 5px 5px rgba(0,0,0,0.5)',
    marginBottom: theme.spacing.small,
  },
  itemCustom: {
    backgroundColor: theme.colors.PRIMARY_DARK,
    textAlign: 'center',
  },
  itemText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'pre',
  },
  actionButtonContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
  actionButton: {
    width: '180px',
  },
  vs: {
    color: theme.colors.TEXT_LIGHT,
    fontSize: theme.typography.size.medium,
  },
  chipContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xSmall,
  },
  chip: {
    padding: '15px',
    marginRight: theme.spacing.xxSmall,
    marginLeft: theme.spacing.xxSmall,
    color: theme.colors.TEXT_LIGHT,
    backgroundColor: theme.colors.PRIMARY_DARK,
    borderRadius: css.borderRadius.xLarge,
    fontSize: theme.typography.size.medium,
  },
}));

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
  const { classes } = useLineupListStyles();
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

  if (props.game) {
    return (
      <>
        <div className={classes.title}> Use this lineup? </div>
        <div className={classes.chipContainer}>
          <div className={classes.chip}>{props.team!.name}</div>
          <span className={classes.vs}> vs. </span>
          <div className={classes.chip}>{props.game.opponent}</div>
        </div>
        <ListPicker
          itemClassName={classes.itemCustom}
          textClassName={classes.itemText}
          items={props.game.lineup.map((playerId: string) => ({
            name: getGlobalState().getPlayer(playerId as PlayerId)!.name,
            id: getGlobalState().getPlayer(playerId as PlayerId)!.id,
          }))}
          onClick={() => {}}
        />
        <div className={classes.actionButtonContainer}>
          <div
            id="confirm"
            className={'button primary-button ' + classes.actionButton}
            onClick={function wrapper(ev) {
              return handleConfirmClick(ev, props.team!, props.game!);
            }}
          >
            Confirm
          </div>
        </div>
        <div className={classes.actionButtonContainer}>
          <div
            id="cancel"
            className={'button tertiary-button ' + classes.actionButton}
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
        <div className={classes.title}> Pick a game </div>
        <div className={classes.chipContainer}>
          <div className={classes.chip}>{props.team.name}</div>
        </div>
        <ListPicker
          textClassName={classes.itemText}
          items={sortObjectsByDate(toItems([...props.team.games]) as { date: number; id: string }[], {
            isAsc: false,
          })}
          onClick={handleGameItemClick}
        />
      </>
    );
  } else {
    return (
      <>
        <div className={classes.title}> Pick a team </div>
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
