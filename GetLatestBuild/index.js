const mongodb = require('mongodb')

const mongodbUri = process.env['MONGODB_URI']
const mongodbUser = process.env['MONGODB_USER']
const mongodbPass = process.env['MONGODB_PASS']
const mongodbDatabase = process.env['MONGODB_DATABASE']
const mongodbCollection = process.env['MONGODB_COLLECTION']

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

  const project = {
    build: 1,
    tag: 1,
    sha: 1,
    ts: 1,
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
      .limit(1)
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
