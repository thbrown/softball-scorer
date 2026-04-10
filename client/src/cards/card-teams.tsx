import React from 'react';
import Card from 'elements/card';
import TeamList from 'components/team-list';

const CardTeams = () => {
  return <Card title="Teams">{<TeamList />}</Card>;
};

export default CardTeams;
