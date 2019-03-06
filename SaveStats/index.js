const mongodb = require('mongodb')
const _ = require('lodash')

function checkDataContainsFields(data, requiredFields) {
  for (let i = 0; i < requiredFields.length; i++) {
    const key = requiredFields[i]
    if (data[key] === undefined) {
      return `${key} field not set`
    }
  }
}

const mandatoryFields = ['sha', 'branch', 'build', 'bundleSize', 'ts']
const optionalFields = ['tag', 'pr', 'performance']

module.exports = async function(context, req) {
  const mongodbUri = process.env['MONGODB_URI']
  const mongodbUser = process.env['MONGODB_USER']
  const mongodbPass = process.env['MONGODB_PASS']

  context.log('SaveStats, DB:', mongodbUri)

  if (!req.body) {
    context.res = {
      status: 400,
      body: 'No body in request',
    }
    return
  }

  const err = checkDataContainsFields(req.body, mandatoryFields)
  if (err !== undefined) {
    context.log('Error:', err)
    context.res = {
      status: 400,
      body: err,
    }
    return
  }

  const mongoClient = await mongodb.MongoClient.connect(mongodbUri, {
    auth: {
      user: mongodbUser,
      password: mongodbPass,
    },
  })

  context.log('connected to mongodb')
  const document = _.pick(req.body, [...mandatoryFields, ...optionalFields])
  document._id = Number(document.build)
  document.build = Number(document.build)
  document.ts = new Date(document.ts)
  try {
    await mongoClient
      .db('stardust')
      .collection('stats')
      .insertOne(document)
    context.log('document inserted')
  } catch (err) {
    const errorMessage = err.errmsg
      ? err.errmsg
      : `Unknown error when inserting document into DB: ${err}`
    context.log.error(errorMessage)
    context.res = {
      status: 400,
      body: errorMessage,
    }
    return
  }
  await mongoClient.close()
  context.res = {
    // status: 200, /* Defaults to 200 */
    body: `Stats saved`,
  }
}
