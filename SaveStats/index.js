const mongodb = require('mongodb')

module.exports = async function (context, req) {
    const mongodbUri = process.env["MONGODB_URI"];
    const mongodbUser = process.env["MONGODB_USER"];
    const mongodbPass = process.env["MONGODB_PASS"];

    context.log('JavaScript HTTP trigger function processed a request.');
    context.log('DB:', mongodbUri);

    if (!req.body) {
        context.res = {
            status: 400,
            body: "No body in request"
        };        
    }
    else if (!req.body.bundleSize) {
        context.res = {
            status: 400,
            body: "No bundleSize in request"
        };        
    }
    else if (req.query.name || (req.body && req.body.name)) {

        context.res = {
            // status: 200, /* Defaults to 200 */
            body: "Hello " + (req.query.name || req.body.name)
        };

        const mongoClient = await mongodb.MongoClient.connect(mongodbUri, {
            auth: {
                user: mongodbUser,
                password: mongodbPass
            }
        });

        context.log('connected to mongodb')
        await mongoClient.db('stardust').collection('stats').insertOne({
            name: req.body.name,
            bundleSize: req.body.bundleSize
        });
        context.log('document inserted')
        await mongoClient.close()
    }
    else {
        context.res = {
            status: 400,
            body: "Please pass a name on the query string or in the request body"
        };
    }
};