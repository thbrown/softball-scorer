import React, { Component } from 'react';
import state from 'state';
import dialog from 'dialog';
import FileSaver from 'file-saver';
import css from 'css';
import Card from 'elements/card';
import ListButton from 'elements/list-button';
import { setRoute } from 'actions/route';

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

    this.handleLogoutClick = async function () {
      dialog.show_confirm('Are you sure you want to log out?', async () => {
        // Do a sync if necessary
        if (state.getSyncState() !== state.getSyncStateEnum().COMPLETE) {
          let abort = true;
          let status = await state.sync();
          if (status !== 200) {
            let message =
              'Could not sync account data prior to logout. You may be offline. If you continue to sign out you will lose unsynced data. You might consider backing up your data [here](/menu) before continuing. Continue anyways?';

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

        let response = await state.request('POST', 'server/account/logout');
        if (response.status === 204) {
          state.resetState();
          dialog.show_notification('Logout successful', function () {
            setRoute('/menu/login');
          });
        } else {
          // If we're offline we can't delete our sid cookie in javascript because is has the httpOnly header, it has to be done from the server.
          // Instead we'll delete our nonHttpOnlyToken cookie locally. Since both are required for performing an authenticated request
          // the server will invalidate the sid cookie next time any request succeeds.
          document.cookie =
            'nonHttpOnlyToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          state.resetState();
          dialog.show_notification('Logout successful', function () {
            setRoute('/menu/login');
          });
        }
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
      const status = await state.sync();
      if (status === 200) {
        this.setState({
          forceSyncText: 'Sync (Success)',
          forceSyncDisabled: true,
        });
      } else if (status === 403) {
        dialog.show_notification('Please log in');
        this.setState({
          forceSyncText: 'Force Sync',
          forceSyncDisabled: false,
        });
      } else if (status === -1) {
        dialog.show_notification('Sync Failed. App is in offline mode');
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
      const blob = new Blob([JSON.stringify(state.getLocalState(), null, 2)], {
        type: 'text/plain;charset=utf-8',
      });
      FileSaver.saveAs(blob, 'save' + today + '.json');
    };

    this.handleLoadClick = function () {
      setRoute('/menu/import');
    };

    this.handleAddToHomeScreenClick = function () {
      dialog.show_confirm(
        "**Would you like to add Softball.app to your home screen as a standalone app?** Pressing yes will cause your browser to issue an 'add to home screen' prompt. If you dismiss the browser's prompt, this menu option will disappear for a while.",
        () => {
          let deferredPrompt = state.getAddToHomescreenPrompt().prompt();
          // Wait for the user to respond to the prompt
          deferredPrompt.userChoice.then((choice) => {
            state.setAddToHomescreenPrompt(null);
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
        {state.getAddToHomescreenPrompt() && (
          <ListButton
            id="addToHomescreen"
            onClick={this.handleAddToHomeScreenClick.bind(this)}
          >
            Add App to Homescreen
          </ListButton>
        )}
        {state.isSessionValid() ? (
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
        {state.isSessionValid() ? (
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
          Save as File
        </ListButton>
        <ListButton
          id="load"
          className={'list-item'}
          onClick={this.handleLoadClick.bind(this)}
          style={{
            backgroundColor: css.colors.BG,
          }}
        >
          Load from File
        </ListButton>
      </Card>
    );
  }
}

export default CardMenu;
