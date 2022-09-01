import React, { Component } from 'react';
import css from 'css';
import state from 'state';
import Card from 'elements/card';
import dialog from 'dialog';
import { setRoute } from 'actions/route';
import SharedLib from '../../shared-lib';
import HrTitle from 'elements/hr-title';

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
  }

  // TODO: only have this if account email is not verified
  render() {
    const MAX_LOCAL_STORAGE = 5000; // To keep cross-browser behavior consistent, we'll lock this at 5MB, some browsers can do more
    let localStorageUsage = state.getLocalStorageUsage();
    console.log(localStorageUsage);
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
      </Card>
    );
  }
}
