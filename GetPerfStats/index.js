const mongodb = require('mongodb');

/**
 * Returns list of perf results on master branch, sorted by build number desc
 * @param example - Returns results for all perf examples by default. This param can filter results for single example.
 * @param buildLt - Returns last 50 results by default. With this param you can get 50 results before the build number specified.
 */
module.exports = async function (context, req) {
    const mongodbUri = process.env["MONGODB_URI"];
    const mongodbUser = process.env["MONGODB_USER"];
    const mongodbPass = process.env["MONGODB_PASS"];

    const mongoClient = await mongodb.MongoClient.connect(mongodbUri, { // TODO: share persistent connection among requests
        auth: {
            user: mongodbUser,
            password: mongodbPass
        }
    });

    const query = {
        branch: 'master'
    }

    if (req.query.buildLt && /^\d+$/.exec(req.query.buildLt)) {
        query.build = {
            '$lt': Number(req.query.buildLt)
        };
    }

    const project = {
        build: 1,
        tag: 1,
        sha: 1
    };

    if (req.query.example && /^[\w\d]+$/.exec(req.query.example)) {
        project[`performance.${req.query.example}`] = 1;
    }
    else {
        project.performance = 1;
    }

    context.log('Query', JSON.stringify(query, null, 2));
    context.log('Project', JSON.stringify(project, null, 2));

    try {
        const data = await mongoClient
            .db('stardust')
            .collection('stats')
            .find(query)
            .project(project)
            .sort([['_id', -1]]) // build === _id and _id is indexed
            .limit(50)
            .toArray();

        context.res = {
            body: data,
            headers: {
                'Content-Type': 'application/json'
            }
        };
    } catch (err) {
        await mongoClient.close();
        const errorMessage = err.errmsg ? err.errmsg : `Unknown error when querying documents from DB: ${err}`
        context.log.error(errorMessage)
        context.res = {
            status: 400,
            body: errorMessage
        };
        return;
    }
    await mongoClient.close();
};