const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const server = require('http').Server(app);
const port = 3000;
const helmet = require('helmet');

const { EventHubConsumerClient } = require("@azure/event-hubs");
const { ContainerClient } = require("@azure/storage-blob");
const { BlobCheckpointStore } = require("@azure/eventhubs-checkpointstore-blob");
const { Console } = require('console');

const connectionString = "Endpoint=sb://widgetevents.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=uccw4FWj/RSlhHzDhv8vV9/C3NZZP1dUjlnTySJC0to=";
const eventHubName = "widgeteventhub";
const consumerGroup = "$Default"; // name of the default consumer group
const storageConnectionString = "DefaultEndpointsProtocol=https;AccountName=keenhaussa;AccountKey=aotT2qKnp4NZ0Tm0iTSEPzLlHwGKtlRVZaRD3Zg45GJKpMTT1s1+jmgV1o8gLQ3z1tEOgFNGE+eDdAdN8EN5yw==;EndpointSuffix=core.windows.net";
const containerName = "wwblobcontainer";

var widgetsWereabouts = { timeStamp: null };


app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');
	next();
});

//pre-flight requests
app.options('*', function (req, res) {
	res.send(200);
});

server.listen(port, (err) => {
	if (err) {
		throw err;
	}
    /* eslint-disable no-console */

    //main().catch((err) => {
    //    console.log("Error occurred: ", err);
    //});
	console.log('Node Endpoints working :)');
});

app.get('/', (err, res) => {
    res.status(200);
    let wereaboutsJson = JSON.stringify(widgetsWereabouts);
    res.json(wereaboutsJson);
	res.end();
});



// azure event hub
async function main() {
    // Create a blob container client and a blob checkpoint store using the client.
    const containerClient = new ContainerClient(storageConnectionString, containerName);
    const checkpointStore = new BlobCheckpointStore(containerClient);

    // Create a consumer client for the event hub by specifying the checkpoint store.
    const consumerClient = new EventHubConsumerClient(consumerGroup, connectionString, eventHubName, checkpointStore);

    // Subscribe to the events, and specify handlers for processing the events and errors.
    const subscription = consumerClient.subscribe({
        processEvents: async (events, context) => {
            if (events.length === 0) {
                console.log(`No events received within wait time. Waiting for next interval`);
                return;
            }

            for (const event of events) {
                console.log(`Received event: '${event.body}' from partition: '${context.partitionId}' and consumer group: '${context.consumerGroup}'`);
                // parse into wereabouts
                widgetsWereabouts.timeStamp = `${event.body}`
            }
            // Update the checkpoint.
            await context.updateCheckpoint(events[events.length - 1]);
        },

        processError: async (err, context) => {
            console.log(`Error : ${err}`);
        }
    }
    );

    // After 30 seconds, stop processing.
    //await new Promise((resolve) => {
    //    setTimeout(async () => {
    //        await subscription.close();
    //        await consumerClient.close();
    //        resolve();
    //    }, 30000);
    //});
}


main().catch((err) => {
    console.log("Error occurred: ", err);
});


module.exports = server;
console.log('End of startup')