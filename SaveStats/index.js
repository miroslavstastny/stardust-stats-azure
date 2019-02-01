const mongodb = require('mongodb');
const _ = require('lodash');

function checkDataContainsFields(data, requiredFields) {
    for (let i = 0; i < requiredFields.length; i++) {
        const key = requiredFields[i]
        if (data[key] === undefined) {
            return `${key} field not set`
        }
    }
}

const mandatoryFields = ['sha', 'branch', 'build', 'bundleSize', 'ts'];
const optionalFields = ['tag', 'pr'];

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
        return;
    }

    const err = checkDataContainsFields(req.body, mandatoryFields);
    if (err !== undefined) {
        context.log('Error:', err);
        context.res = {
            status: 400,
            body: err
        };
        return;
    }

    const mongoClient = await mongodb.MongoClient.connect(mongodbUri, {
        auth: {
            user: mongodbUser,
            password: mongodbPass
        }
    });

    context.log('connected to mongodb')
    await mongoClient.db('stardust').collection('stats').insertOne(_.pick(req.body, [...mandatoryFields, ...optionalFields]));
    context.log('document inserted')
    await mongoClient.close()

    context.res = {
        // status: 200, /* Defaults to 200 */
        body: `Stats saved`
    };
};