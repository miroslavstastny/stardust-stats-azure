const mongodb = require('mongodb')

const mongodbUri = process.env['MONGODB_URI']
const mongodbUser = process.env['MONGODB_USER']
const mongodbPass = process.env['MONGODB_PASS']
const mongodbDatabase = process.env['MONGODB_DATABASE']
const mongodbCollection = process.env['MONGODB_COLLECTION']

const itemLimit = 250 // number of items returned when public-only filter is off
const publicItemLimit = 30 // number of items returned when public-only filter is on (default)

/**
 * Returns list of perf results on master branch, sorted by build number desc
 * @param example - Returns results for all perf examples by default. This param can filter results for single example.
 * @param buildLt - Returns last `itemLimit` (or `publicItemLimit`) results by default. With this param you can get `itemLimit` (or `publicItemLimit`) results before the build number specified.
 * @param buildGt - Only return builds greater than the param.
 */
module.exports = async function(context, req) {
  const mongoClient = await mongodb.MongoClient.connect(mongodbUri, {
    // TODO: share persistent connection among requests
    auth: {
      user: mongodbUser,
      password: mongodbPass,
    },
  })

  const query = {
    branch: 'master',
  }

  const hasBuildLt = req.query.buildLt && /^\d+$/.exec(req.query.buildLt)
  const hasBuildGt = req.query.buildGt && /^\d+$/.exec(req.query.buildGt)

  if (hasBuildLt) {
    query._id = {
      $lt: Number(req.query.buildLt),
    }
  }
  if (hasBuildGt) {
    query._id = {
      ...(query._id ? query._id : {}),
      $gt: Number(req.query.buildGt),
    }
  }

  if (!req.query.withPrivateBuilds) {
    query.tag = {
      $exists: 1,
    }
  }

  const project = {
    build: 1,
    tag: 1,
    sha: 1,
    ts: 1,
  }

  if (req.query.example && /^[\w\d]+$/.exec(req.query.example)) {
    project[`performance.${req.query.example}`] = 1
    project[`bundleSize.${req.query.example}`] = 1
  } else {
    project.performance = 1
    project.bundleSize = 1
  }

  context.log('Query', JSON.stringify(query, null, 2))
  context.log('Project', JSON.stringify(project, null, 2))

  try {
    const data = await mongoClient
      .db(mongodbDatabase)
      .collection(mongodbCollection)
      .find(query)
      .project(project)
      .sort([['_id', -1]]) // build === _id and _id is indexed
      .limit(req.query.withPrivateBuilds ? itemLimit : publicItemLimit)
      .toArray()

    context.res = {
      body: data,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  } catch (err) {
    await mongoClient.close()
    const errorMessage = err.errmsg
      ? err.errmsg
      : `Unknown error when querying documents from DB: ${err}`
    context.log.error(errorMessage)
    context.res = {
      status: 400,
      body: errorMessage,
    }
    return
  }
  await mongoClient.close()
}
