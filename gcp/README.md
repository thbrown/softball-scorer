# Note: most of this does not apply anymore. TODO: remove almost everything.

# GCP Compute

This directory contains instructions and a start up script for running optimizations on gcp compute instances. These
instructions are for running both the app server and the compute instances in gcp, not just the optimization compute instances.

Prerequisite: you must have a Google Cloud Platform (GCP) account.

## Setup:

### Authentication

_Generate a key file for use in later steps_

In the GCP web console in your browser:

Create auth key for external applications.

1. Search for API,
2. Click Credentails
3. Create new service account key
4. Name it `optimization`
5. Add two roles 'Compute Admin' (allows turning on and off instances and 'Service Account User' (allows it to be attached to an instance on create)
6. Choose JSON
7. Click create. This will download a file.
8. Rename it to cred.json. Put cred.json in this project's root directory on the app server. This is a secret! Keep it out of source control.

### Create a Snapshot

_Create a snapshot that is used as a tempalte for the instances the simulation jar will run on_

From the GCP web UI:

1. Create a micro instance on gcp. Debian GNU/Linux 10 (buster), 10GB persistent disk.
2. Ssh into that instance
3. Update the instance (`sudo apt-get update`)
4. Install the jre (`sudo apt-get install -y default-jre-headless`)
5. Install wget if it's not already (`sudo apt-get install wget`)
6. Download SoftballSim.jar (`wget https://github.com/thbrown/softball-sim/releases/download/v0.6/softball-sim.jar`)
7. Add startup script

`sudo nano /etc/init.d/mystartup.sh`

Paste in the script below (make a substitution below for your_home_directory)`

```
#!/bin/sh
HOME_DIRECTORY="your_home_directory"
for i in 1 2 3 4 5; do
  REMOTE_IP=$(curl http://metadata.google.internal/computeMetadata/v1/instance/attributes/remote-ip -H "Metadata-Flavor: Google" --connect-timeout 5 --max-time 10 --retry 5 --retry-delay 0 --retry-max-time 60 -f)
  OPTIMIZATION_ID=$(curl http://metadata.google.internal/computeMetadata/v1/instance/attributes/optimization-id -H "Metadata-Flavor: Google" --connect-timeout 5 --max-time 10 --retry 5 --retry-delay 0 --retry-max-time 60 -f)
  if [ ! -z "$REMOTE_IP" ] && [ ! -z "$OPTIMIZATION_ID" ]; then
      break
  fi
  echo "Metadata values were not set, retrying in 2 seconds"
  sleep 2
done
echo "Optimization Id: $OPTIMIZATION_ID"
echo "Remote Ip: $REMOTE_IP"

cd "/home/$HOME_DIRECTORY"
java -jar /home/$HOME_DIRECTORY/softball-sim.jar NETWORK $REMOTE_IP $OPTIMIZATION_ID true
```

8. Make the script executable `sudo chmod +x /etc/init.d/mystartup.sh`
9. Link so it will run on startup `sudo ln -s /etc/init.d/mystartup.sh /etc/rc3.d/S99mystartup`
10. Add cleanup.sh script to the root of softball-sim project (this ensures that the instance is deleted after an optimization completes or is terminated)

cleanup.sh should contain the following content:

`nano cleanup.sh`

```
#!/bin/sh
NAME=$(curl -X GET http://metadata.google.internal/computeMetadata/v1/instance/name -H 'Metadata-Flavor: Google' -f)
ZONE=$(curl -X GET http://metadata.google.internal/computeMetadata/v1/instance/zone -H 'Metadata-Flavor: Google' -f)
DELETE_ON_SHUTDOWN=$(curl http://metadata.google.internal/computeMetadata/v1/instance/attributes/delete-on-shutdown -H 'Metadata-Flavor: Google' -f)
echo "Delete Parameters --  Name: $NAME Zone: $ZONE Delete on Shutdown? $DELETE_ON_SHUTDOWN"
if [ ! -z "$DELETE_ON_SHUTDOWN" ]; then
  echo "Attempting to delete this instance"
  gcloud auth activate-service-account --key-file=cred.json
  gcloud --quiet compute instances delete $NAME --zone=$ZONE
else
  echo "Skipped delete because metadata value DELETE_ON_SHUTDOWN was not set"
fi
```

https://cloud.google.com/compute/docs/instances/create-start-preemptible-instance#:~:text=Creating%20a%20preemptible%20instance,-Create%20a%20preemptible&text=In%20the%20Cloud%20Console%2C%20go%20to%20the%20VM%20instances%20page.&text=Click%20Create%20instance.,disks%2C%20networking%2C%20sole%20tenancy.

11. Make cleanup.sh executable `sudo chmod +x ./cleanup.sh`
12. Add the cred.json (from the authentication section above) to the same directory as the cleanup script
13. Shutdown the instance.
14. In the gcp ui. Click snapshots, then Create Snapshot. Give it the name 'optimization-base'. Select the disk you attached to the instance you created above. Select multi-regional, then the same region the source disk is under (this should be the default). Click 'Create' and wait for it to complete.
15. After snapshot completes, delete the micro instance you just made.

### Configuration

_Make sure the app server knows about gcp_

Add/Modify the compute node to/in the src-srv config.js. Make sure you are mofifying your config, not the template config. If you don't see a local config file, do a build, it will be auto-generated for you based on the template. Alternativly, you may copy the template file manually and rename it config.js. The config file fragment should look something like this:

```
...
compute: {
    mode: "gcp",
    params: {
      project: "some-project-185223",
      projectNumber: "012345678910"
      zones: [
        "us-central1-c",
        "us-central1-b",
        "us-central1-a",
        "us-central1-f"
      ],
      snapshotName: "optimization-base"
    }
  }
...
```

Note1: Zones are listed in priority order, put the zones closest to your app server location first
Note2: You can find project and projectNumber at `https://console.cloud.google.com/home/dashboard`

### Other notes

#### Debugging

Startup script logs can be seen using `cat /var/log/daemon.log | grep "mystartup.sh"` on debian linux

If a gcp instance insertion command succeeds but then the instance immidiatly shuts off. Take a look at the stack
driver logging to see more information `https://console.cloud.google.com/logs/viewer`. Quota limits are a possible
cause `https://console.cloud.google.com/iam-admin/quotas` (you may have to request an increase in core count, both global and per region)

#### Simulation estimation times accuracy

For accurate compute time estimation you'll need to generate timing constants by running a junit test
from softball-sim on the instance you'll be running the optimization on.

`sudo apt-get update`
`sudo apt-get upgrade`
`sudo apt-get install -y git-core`
`sudo apt-get install -y default-jdk`
`git clone https://github.com/thbrown/softball-sim.git`
`cd softball-sim`
`sudo apt-get install screen`
`screen`
Press enter
`./gradlew clean test --info`
`ctrl A` then `d`
Wait a long time (several hours probably, unless you have a server with a ton of cores)
Rename the `estimated-time-config.js` to something that identifies it as having been run on your machine (e.g. `xenon-skylake-8.js`)
Move that file to the `time-estimation-configs` directory in this project
Modify `simulation-time-estimator.js` to point to your new config
