# GCP Compute

This directory contains instructions and a start up script for running optimizations on gcp compute instances. These
instructions are for running both the app server and the compute instances in gcp, not just the optimization compute instances.

Prerequisite: you must have a Google Cloud Platform (GCP) account.

## Setup:

### Create a Snapshot

From the GCP web UI:

1. Create a micro instance on gcp. Debian GNU/Linux 9 (stretch), 10GB persistent disk.
2. Ssh into that instance
3. Update the instance (`sudo apt-get update`)
4. Install the jre (`sudo apt-get install -y default-jre-headless`)
5. Download SoftballSim.jar (`wget https://github.com/thbrown/softball-sim/releases/download/v0.5/softball-sim.jar`)
6. Add startup script

```
cd /etc/init.d
sudo nano mystartup.sh # Paste in the script below (make substitutions for <your_home_directory>)
sudo chmod +x /etc/init.d/mystartup.sh
sudo ln -s /etc/init.d/mystartup.sh /etc/rc3.d/S99mystartup
```

Startup Script:

```
#! /bin/bash
REMOTE_IP=$(curl http://metadata.google.internal/computeMetadata/v1/instance/attributes/remote-ip -H "Metadata-Flavor: Google")
OPTIMIZATION_ID=$(curl http://metadata.google.internal/computeMetadata/v1/instance/attributes/optimization-id -H "Metadata-Flavor: Google")
cd '/home/<your_home_directory>'
echo $OPTIMIZATION_ID
echo $REMOTE_IP
java -jar /home/<your_home_directory>/softball-sim.jar NETWORK $REMOTE_IP $OPTIMIZATION_ID true
```

7. Shutdown the instance.
8. In the gcp ui. Click snapshots, then Create Snapshot. Give it the name 'optimization-base'. Select the disk you attached to the instance you created above. Select regional, then the same region the source disk is under (this should be the default). Click 'Create' and wait for it to complete.
9. After snapshot completes, delete the micro instance you just made.

### Authentication

In the GCP web console in your browser:

Create auth key for external applications.

1. Search for API,
2. Click Credentails
3. Create new service account key
4. Name it anything
5. Choose JSON
6. Click create. This will download a file.
7. Rename it to cred.json. Put cred.json in this project's root directory. This is a secret! Keep it out of soruce control.

### Configuration

Add/Modify the compute node to/in the src-srv config.js. Make sure you are mofifying your config, not the template config. If you don't see a local config file, do a build, it will be auto-generated for you based on the template. Alternativly, you may copy the template file manually and rename it config.js. The config file fragment should look something like this:

```
...
  compute: {
    type: "gcp",
    params: {
      project: "some-project-123456",
      zones: ["us-central1-b", "us-central1-c", "us-central1-a", "us-central1-f"],
      snapshotName: "optimization-base"
    }
  }
...
```

Note: zones are listed in priority order, put the zones closest to your app server location first

### Other notes

Startup script logs can be seen using `cat /var/log/daemon.log`
