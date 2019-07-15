import React from 'react';
import Card from 'elements/card';
import { setRoute } from 'actions/route';
import { compose, withHandlers } from 'recompose';

const enhanced = compose(
  withHandlers({
    handleTeamClick: props => (state, team) => event => {
      setRoute(`/stats/${state.statsId}/teams/${team.id}`);
    },
  })
);

const CardTeamListStats = ({ handleTeamClick, state }) => {
  return (
    <Card title="Teams">
      {state.teams.map(team => {
        return (
          <div
            id={team.id}
            key={'team' + team.id}
            className="list-item"
            onClick={handleTeamClick(state, team)}
          >
            <div className="prevent-overflow">{team.name}</div>
          </div>
        );
      })}
    </Card>
  );
};

export default enhanced(CardTeamListStats);
