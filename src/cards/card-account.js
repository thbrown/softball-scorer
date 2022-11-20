import React, { Component } from 'react';
import css from 'css';
import state from 'state';
import Card from 'elements/card';
import dialog from 'dialog';
import { setRoute } from 'actions/route';
import SharedLib from '../../shared-lib';
import HrTitle from 'elements/hr-title';
import { logout } from 'utils/functions';

export default class CardAccount extends Component {
  constructor(props) {
    super(props);
    this.state = {};

    // TODO: only render this button if email has not yet been validated
    this.handleEmailValidationClick = async function () {
      let buttonDiv = document.getElementById('email-validation');
      buttonDiv.classList.add('disabled');

      let response = await state.request(
        'POST',
        'server/account/send-verification-email'
      );
      let message;
      if (response.status === 204) {
        message = 'Email has been sent.';
      } else if (response.status === 400) {
        message = 'Email not sent, your email has already been validated.';
      } else if (response.status === -1) {
        message =
          'Email can not be sent while offline. Try again when you have a connection.';
      } else {
        message = `An unexpected error occurred. Response: ${JSON.stringify(
          response
        )}`;
      }
      buttonDiv.classList.remove('disabled');

      dialog.show_notification(message, function () {
        setRoute('/menu');
      });
    };

    this.handleDeleteDataClick = async function () {
      dialog.show_input(
        'Are you sure you want to delete all the data in your account? All your data will be permanently deleted. If you\'d like to continue deleting your account data type "delete" into the box below. Otherwise, click cancel to return the the main menu.',
        async (input) => {
          // Did they enter the correct thing?
          if (input !== 'delete') {
            dialog.show_notification(
              `You typed '${input}' not 'delete'. Try again.`
            );
            return;
          }

          // Yes, okay delete the data then do a sync
          state.deleteAllData();
          await state.sync();
          dialog.show_notification('Data successfully deleted', function () {
            setRoute('/menu');
          });
        },
        '',
        ''
      );
    };

    this.handleDeleteAccountClick = async function () {
      dialog.show_input(
        'Are you sure you want to delete your account? All your data will be permanently deleted. If you\'d like to continue deleting your account type "delete" into the box below. Otherwise, click cancel to return the the main menu.',
        async (input) => {
          // Did they enter the correct thing?
          if (input !== 'delete') {
            dialog.show_notification(
              `You typed '${input}' not 'delete'. Try again.`
            );
            return;
          }

          // Yes, okay send the delete request
          let buttonDiv = document.getElementById('delete-account');
          buttonDiv.classList.add('disabled');

          let response = await state.requestAuth('DELETE', 'server/account');
          let message;
          if (response.status === 204) {
            message = 'Your account has been deleted.';
            logout(state, dialog, setRoute);
          } else if (response.status === 400) {
            message =
              'App encountered a problem while deleting your account. Try again later.';
          } else if (response.status === -1) {
            message =
              'Application is offline, try deleting your account again after getting a better internet connection.';
          } else {
            message = `An unexpected error occurred. Response: ${JSON.stringify(
              response
            )}`;
          }
          buttonDiv.classList.remove('disabled');

          dialog.show_notification(message, function () {
            setRoute('/menu');
          });
        },
        '',
        ''
      );
    };
  }

  render() {
    const MAX_LOCAL_STORAGE = 5000; // To keep cross-browser behavior consistent, we'll lock this at 5MB, some browsers can do more
    let localStorageUsage = state.getLocalStorageUsage();

    let emailSection = state.isEmailValidated() ? undefined : (
      <div>
        <HrTitle title="Email"></HrTitle>
        <div
          id="email-validation"
          className="list-button button left"
          onClick={this.handleEmailValidationClick.bind(this)}
          style={{
            backgroundColor: css.colors.BG,
          }}
        >
          Re-send email validation email
        </div>
      </div>
    );

    return (
      <Card title="Account">
        <HrTitle title="Storage"></HrTitle>
        <div className="storage-container">
          <div className="storage-row">
            <div style={{ paddingLeft: '0px' }} className="storage-label">
              Total Usage (
              {SharedLib.commonUtils.formatPercentage(
                localStorageUsage.total / MAX_LOCAL_STORAGE
              )}{' '}
              full)
            </div>{' '}
            <div className="storage-value">
              {SharedLib.commonUtils.round(localStorageUsage.total, 2)} KiB
            </div>
          </div>
          <div className="storage-row">
            <div className="storage-label">Players:</div>{' '}
            <div className="storage-value">
              {SharedLib.commonUtils.round(localStorageUsage.players, 2)} KiB
            </div>
          </div>
          <div className="storage-row">
            <div className="storage-label">Teams:</div>
            <div className="storage-value">
              {SharedLib.commonUtils.round(localStorageUsage.teams, 2)} KiB
            </div>
          </div>
          <div className="storage-row">
            <div className="storage-label">Optimizations:</div>
            <div className="storage-value">
              {SharedLib.commonUtils.round(localStorageUsage.optimizations, 2)}{' '}
              KiB
            </div>
          </div>
          <div className="storage-row">
            <div className="storage-label">System:</div>
            <div className="storage-value">
              {SharedLib.commonUtils.round(localStorageUsage.system, 2)} KiB
            </div>
          </div>
        </div>
        <HrTitle title="Delete"></HrTitle>
        <div
          id="delete-data"
          className="list-button button left"
          onClick={this.handleDeleteDataClick.bind(this)}
          style={{
            backgroundColor: css.colors.BG,
          }}
        >
          Delete all data
        </div>
        <div
          id="delete-account"
          className="list-button button left"
          onClick={this.handleDeleteAccountClick.bind(this)}
          style={{
            backgroundColor: css.colors.BG,
          }}
        >
          Delete account
        </div>
        {emailSection}
      </Card>
    );
  }
}
