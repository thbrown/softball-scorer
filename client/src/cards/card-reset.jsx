import React from 'react';
import { getGlobalState } from 'state';
import dialog from 'dialog';
import Card from 'elements/card';
import { setRoute } from 'actions/route';

export default class CardReset extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.promptForReset = async function () {
      dialog.show_confirm(
        'Would you like to reset your client? You will lose any changes that have not been synced.',
        () => {
          getGlobalState().resetState();
          dialog.show_notification(
            "Your client has been reset. You will be redirected to the main menu. Once you've arrived there, please refresh the page.",
            () => {
              setRoute('/menu');
            }
          );
        }
      );
    };
  }

  componentDidMount() {
    this.promptForReset();
  }

  render() {
    return (
      <Card
        title="Reset"
        titleProps={{ className: 'card-title-text-with-arrow' }}
      >
        <div style={{ padding: '15px' }}></div>
      </Card>
    );
  }
}
