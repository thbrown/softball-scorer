import React, { Component } from 'react';
import state from 'state';
import dialog from 'dialog';
import FileSaver from 'file-saver';
import css from 'css';
import network from 'network';
import Card from 'elements/card';
import { setRoute } from 'actions/route';

export default class CardMenu extends Component {
  constructor(props) {
    super(props);
    this.state = {};

    this.handleTeamsClick = function() {
      setRoute('/teams');
    };

    this.handlePlayersClick = function() {
      setRoute('/players');
    };

    this.handleOptimizationsClick = function() {
      setRoute('/optimizations');
    };

    this.handleLogoutClick = async function() {
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
            await new Promise(function(resolve) {
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

        let response = await network.request('POST', 'server/account/logout');
        if (response.status === 204) {
          state.resetState();
          dialog.show_notification('Logout successful', function() {
            setRoute('/menu/login');
          });
        } else {
          // We can't delete our sid cookie in javascript because is has the httpOnly header, it has to be done from the server.
          // TODO: I think we can get aroud this by having two session cookies, one httpOnly and one we can remove with javascript. Both would be required to auth.
          dialog.show_notification(
            `Logout failed. You must be online to logout (${response.status})`,
            function() {
              setRoute('/menu');
            }
          );
        }
      });
    };

    this.handleLoginClick = function() {
      setRoute('/menu/login');
    };

    this.handleSyncClick = async function() {
      let buttonDiv = document.getElementById('sync');
      buttonDiv.innerHTML = 'Sync (In Progress)';
      buttonDiv.classList.add('disabled');
      let status = await state.sync();
      if (status === 200) {
        buttonDiv.innerHTML = 'Sync (Success)';
      } else if (status === 403) {
        dialog.show_notification('Please log in');
        buttonDiv.innerHTML = 'Force Sync';
      } else if (status === -1) {
        dialog.show_notification('Sync Failed. App is in offline mode');
        buttonDiv.innerHTML = 'Force Sync';
      } else {
        buttonDiv.innerHTML = `Sync (Fail - ${status})`;
      }
      buttonDiv.classList.remove('disabled');
    };

    this.handleSaveClick = function() {
      const today = new Date().getTime();
      const blob = new Blob([JSON.stringify(state.getLocalState(), null, 2)], {
        type: 'text/plain;charset=utf-8',
      });
      FileSaver.saveAs(blob, 'save' + today + '.json');
    };

    this.handleLoadClick = function() {
      setRoute('/menu/import');
    };

    this.handleAddToHomeScreenClick = function() {
      dialog.show_confirm(
        "**Would you like to add Softball.app to your homescreen as a standalone app?** Presssing yes will cause your browser to issue an 'add to home screen' prompt. If you dismiss the browser's prompt, this menu option will disappear for a while.",
        () => {
          let deferredPrompt = state.getAddToHomescreenPrompt().prompt();
          // Wait for the user to respond to the prompt
          deferredPrompt.userChoice.then(choice => {
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
        <div
          id="teams"
          className="list-item"
          onClick={this.handleTeamsClick.bind(this)}
          style={{
            backgroundColor: css.colors.BG,
          }}
        >
          Teams
        </div>
        <div
          id="players"
          className="list-item"
          onClick={this.handlePlayersClick.bind(this)}
          style={{
            backgroundColor: css.colors.BG,
          }}
        >
          Players
        </div>
        <div
          id="optimizations"
          className="list-item"
          onClick={this.handleOptimizationsClick.bind(this)}
          style={{
            backgroundColor: css.colors.BG,
          }}
        >
          Optimizations
        </div>
        {state.getAddToHomescreenPrompt() && (
          <div
            id="addToHomescreen"
            className="list-item"
            onClick={this.handleAddToHomeScreenClick.bind(this)}
            style={{
              backgroundColor: css.colors.BG,
            }}
          >
            Add App to Homescreen
          </div>
        )}
        {state.isSessionValid() ? (
          <div
            id="logout"
            className="list-item"
            onClick={this.handleLogoutClick.bind(this)}
            style={{
              backgroundColor: css.colors.BG,
            }}
          >
            Logout
          </div>
        ) : (
          <div
            id="login"
            className="list-item"
            onClick={this.handleLoginClick.bind(this)}
            style={{
              backgroundColor: css.colors.BG,
            }}
          >
            Login/Signup
          </div>
        )}
        <div
          id="sync"
          className="list-item"
          onClick={this.handleSyncClick.bind(this)}
          style={{
            backgroundColor: css.colors.BG,
          }}
        >
          Force Sync
        </div>
        <div
          id="save"
          className="list-item"
          onClick={this.handleSaveClick.bind(this)}
          style={{
            backgroundColor: css.colors.BG,
          }}
        >
          Save as File
        </div>
        <div
          id="load"
          className="list-item"
          onClick={this.handleLoadClick.bind(this)}
          style={{
            backgroundColor: css.colors.BG,
          }}
        >
          Load from File
        </div>
      </Card>
    );
  }
}
