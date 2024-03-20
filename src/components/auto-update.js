import React, { useEffect, useRef, useState } from 'react';
import { joinRoom, selfId } from 'trystero/firebase'; // (trystero-firebase.min.js)
import { getGlobalState } from 'state';

const config = {
  appId: 'https://optimum-library-250223-default-rtdb.firebaseio.com',
};

const AutoUpdate = (props) => {
  const roomRef = useRef(null);

  const [refreshKey, setRefreshKey] = useState(Math.random());
  const [connectedPeers, setConnectedPeers] = useState([]);

  useEffect(() => {
    // Join the room on mount
    console.warn('Joining room', props.roomId);
    const room = joinRoom(config, props.roomId);
    roomRef.current = room;

    room.onPeerJoin((peerId) => {
      console.log('HELLO', peerId, room.getPeers());
      setConnectedPeers(Object.keys(room.getPeers()));
    });
    room.onPeerLeave((peerId) => {
      console.log('BYE ', peerId, room.getPeers());
      setConnectedPeers(Object.keys(room.getPeers()));
    });
    setRefreshKey(Math.random());

    // Leave the room on dismount
    return () => {
      console.warn(`Leaving room ${props.roomId}`);

      room.leave();
      getGlobalState().removeSyncHook(props.roomId);
    };
  }, []);

  if (roomRef.current) {
    return (
      <AutoUpdateInner
        key={refreshKey}
        connectedPeers={connectedPeers}
        roomId={props.roomId}
        roomRef={roomRef}
        mode={props.mode}
      ></AutoUpdateInner>
    );
  } else {
    return <div>NOT CONNECTED</div>;
  }
};

const AutoUpdateInner = (props) => {
  const [sendUpdate, getSendUpdate] =
    props.roomRef.current.makeAction('update');

  getSendUpdate((data, peerId) => {
    console.log(`Syncing because webRTC says there is an update`, peerId, data);
    if (props.mode === 'sync') {
      getGlobalState().sync({ skipHooks: true });
    } else if (props.mode === 'refresh') {
      // eslint-disable-next-line no-restricted-globals
      location.reload();
    }
  });

  useEffect(() => {
    getGlobalState().addSyncHook(`room-${props.roomId}`, (data, peerId) => {
      console.log('webRTC send update');
      sendUpdate({});
    });
  }, []);

  const handleClick = () => {
    // Only do this if there are other peers connected?
    console.log('webRTC send update (button)');
    sendUpdate({});
  };

  return (
    <div>
      <button onClick={handleClick}>Some Button</button>
      <div>
        Joined room: <b>{props.roomId}</b>
      </div>
      <div>
        My Id: <b>{selfId}</b>
      </div>
      <div>
        Connected Peers: <b>{props.connectedPeers.join(',')}</b>
      </div>
    </div>
  );
};

export default AutoUpdate;
