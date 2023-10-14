import React, { Component } from 'react';
import { getGlobalState } from 'state';
import dialog from 'dialog';
import FileSaver from 'file-saver';
import css from 'css';
import Card from 'elements/card';
import ListButton from 'elements/list-button';
import { setRoute } from 'actions/route';
import HrTitle from 'elements/hr-title';
import Chip from 'elements/chip';
import SharedLib from 'shared-lib';
import { logout } from 'utils/functions';

class CardMenu extends Component {
  constructor(props) {
    super(props);
    this.state = {
      forceSyncText: 'Force Sync',
      forceSyncDisabled: false,
    };

    this.handleTeamsClick = function () {
      setRoute('/teams');
    };

    this.handlePlayersClick = function () {
      setRoute('/players');
    };

    this.handleOptimizationsClick = function () {
      setRoute('/optimizations');
    };

    this.handleDetailsClick = function () {
      setRoute('/account');
    };

    this.handleLogoutClick = async function () {
      dialog.show_confirm('Are you sure you want to log out?', async () => {
        // Do a sync if necessary
        if (
          getGlobalState().getSyncState() !==
          getGlobalState().getSyncStateEnum().COMPLETE
        ) {
          let abort = true;
          let status = await getGlobalState().sync();
          if (status !== 200) {
            let message = (
              <div>
                Could not sync account data prior to logout. You may be offline.
                If you continue to sign out you will lose un-synced data. You
                might consider backing up your data <a href="/menu">here</a>{' '}
                before continuing.
                <p>Continue anyways?</p>
              </div>
            );
            // Wait for user to select an option
            // TODO: make all dialogs return promises
            await new Promise(function (resolve) {
              dialog.show_confirm(
                message,
                () => {
                  abort = false;
                  resolve();
                },
                () => {
                  resolve();
                }
              );
            });
          } else {
            console.log('Sync completed successfully, continuing logout');
            abort = false;
          }
          if (abort) {
            console.log('Aborting logout');
            return;
          }
        }

        logout(state, dialog, setRoute);
      });
    };

    this.handleLoginClick = function () {
      setRoute('/menu/login');
    };

    this.handleSyncClick = async function () {
      this.setState({
        forceSyncText: 'Sync (In Progress)',
        forceSyncDisabled: true,
      });
      const status = await getGlobalState().sync();
      if (status === 200) {
        this.setState({
          forceSyncText: 'Sync (Success)',
          forceSyncDisabled: true,
        });
      } else if (status === 403) {
        dialog.show_notification('Please log in.');
        this.setState({
          forceSyncText: 'Force Sync',
          forceSyncDisabled: false,
        });
      } else if (status === -1) {
        dialog.show_notification('Sync Failed. App is in offline mode.');
        this.setState({
          forceSyncText: 'Force Sync',
          forceSyncDisabled: false,
        });
      } else {
        this.setState({
          forceSyncText: `Sync (Fail - ${status})`,
          forceSyncDisabled: false,
        });
      }
    };

    this.handleSaveClick = function () {
      const today = new Date().getTime();
      const clientData = getGlobalState().getLocalState();
      const exportData =
        SharedLib.schemaValidation.convertDocumentToExport(clientData);
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'text/plain;charset=utf-8',
      });
      FileSaver.saveAs(blob, 'save' + today + '.json');
    };

    this.handleLoadClick = function () {
      setRoute('/menu/import');
    };

    this.handleAddToHomeScreenClick = function () {
      dialog.show_confirm(
        <div>
          <b>
            Would you like to add Softball.app to your home screen as a
            standalone app?
          </b>
          <div style={{ marginTop: '1rem' }}>
            Tapping yes will cause your browser to issue an 'Add to Home Screen'
            prompt.
          </div>
          <div>
            If you dismiss the browser's prompt, this menu option will disappear
            for a while.
          </div>
        </div>,
        () => {
          let deferredPrompt = getGlobalState()
            .getAddToHomescreenPrompt()
            .prompt();
          // Wait for the user to respond to the prompt
          deferredPrompt.userChoice.then((choice) => {
            getGlobalState().setAddToHomescreenPrompt(null);
            if (choice.outcome === 'accepted') {
              console.log('User accepted the prompt');
            } else {
              console.log('User dismissed the prompt');
            }
          });
        }
      );
    };
  }

  render() {
    return (
      <Card
        title="Menu"
        rightHeaderProps={{
          showBlogLink: true,
        }}
      >
        <div
          style={{
            margin: '0px 10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Chip type={getGlobalState().isOnline() ? 'SUCCESS' : 'WARNING'}>
            {getGlobalState().isOnline() ? 'Online' : 'Offline'}
          </Chip>
          <Chip>
            {getGlobalState().getActiveUser() == null
              ? 'Guest'
              : getGlobalState().getActiveUser()}
          </Chip>
          {/* <div>'Time Till Sync: ' + getGlobalState().getTimeTillSync()</div> */}
        </div>
        <HrTitle title="Application"></HrTitle>
        <ListButton
          id="teams"
          onClick={this.handleTeamsClick.bind(this)}
          style={{
            backgroundColor: css.colors.BG,
          }}
        >
          Teams
        </ListButton>
        <ListButton
          id="players"
          onClick={this.handlePlayersClick.bind(this)}
          style={{
            backgroundColor: css.colors.BG,
          }}
        >
          Players
        </ListButton>
        <ListButton
          id="optimizations"
          onClick={this.handleOptimizationsClick.bind(this)}
          style={{
            backgroundColor: css.colors.BG,
          }}
        >
          Optimizations
        </ListButton>
        <HrTitle title="Data"></HrTitle>
        {getGlobalState().isSessionValid() ? (
          <ListButton
            id="sync"
            className={
              'list-item' + (this.state.forceSyncDisabled ? ' disabled' : '')
            }
            onClick={this.handleSyncClick.bind(this)}
            style={{
              backgroundColor: css.colors.BG,
            }}
          >
            {this.state.forceSyncText}
          </ListButton>
        ) : null}
        <ListButton
          id="save"
          className={'list-item'}
          onClick={this.handleSaveClick.bind(this)}
          style={{
            backgroundColor: css.colors.BG,
          }}
        >
          Export To File
        </ListButton>
        <ListButton
          id="load"
          className={'list-item'}
          onClick={this.handleLoadClick.bind(this)}
          style={{
            backgroundColor: css.colors.BG,
          }}
        >
          Import From File
        </ListButton>
        <HrTitle title="Account"></HrTitle>
        <ListButton
          id="details"
          className={'list-item'}
          onClick={this.handleDetailsClick.bind(this)}
          style={{
            backgroundColor: css.colors.BG,
          }}
        >
          Settings
        </ListButton>
        {getGlobalState().isSessionValid() ? (
          <ListButton
            id="logout"
            onClick={this.handleLogoutClick.bind(this)}
            style={{
              backgroundColor: css.colors.BG,
            }}
          >
            Logout
          </ListButton>
        ) : (
          <ListButton
            id="login"
            className={'list-item'}
            onClick={this.handleLoginClick.bind(this)}
            style={{
              backgroundColor: css.colors.BG,
            }}
          >
            Login/Signup
          </ListButton>
        )}
        {getGlobalState().getAddToHomescreenPrompt() && (
          <HrTitle title="Site"></HrTitle>
        )}
        {getGlobalState().getAddToHomescreenPrompt() && (
          <ListButton
            id="addToHomescreen"
            onClick={this.handleAddToHomeScreenClick.bind(this)}
          >
            Add App to Homescreen
          </ListButton>
        )}
      </Card>
    );
  }
}

export default CardMenu;
