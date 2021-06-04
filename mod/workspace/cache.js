const file = require('./file');

const http = require('./http');

const cloudfront = require('../provider/cloudfront');

const getFrom = {
  https: (ref) => http(ref),
  file: (ref) => file(`../../public/workspaces/${ref.split(':')[1]}`),
  cloudfront: (ref) => cloudfront(ref.split(':')[1]),
};

const assignTemplates = require('./assignTemplates');

const defaults = require('./defaults');

const assignDefaults = require('./assignDefaults');

let workspace = null;

const { nanoid } = require('nanoid');

const logger = require('../logger');

module.exports = async (req) => {
  if (process.env.WORKSPACE === 'dynamic') {
    return await getDynamicWorkspace(req);
  }
  const timestamp = Date.now();

  // Cache workspace if empty.
  if (!workspace) {
    logger(`Workspace empty @${timestamp}`, 'workspace');
    await cache();
  }

  // Logically assign timestamp.
  workspace.timestamp = workspace.timestamp || timestamp;

  // Cache workspace if expired.
  if (timestamp - workspace.timestamp > 3600000) {
    logger(
      `Workspace ${workspace.nanoid} cache expired @${timestamp}`,
      'workspace'
    );
    await cache();
    workspace.timestamp = timestamp;
  } else {
    logger(
      `Workspace ${workspace.nanoid} age ${timestamp - workspace.timestamp}`,
      'workspace'
    );
  }

  return workspace;
};

async function cache() {
  // Get workspace from source.
  workspace =
    (process.env.WORKSPACE &&
      (await getFrom[process.env.WORKSPACE.split(':')[0]](
        process.env.WORKSPACE
      ))) ||
    {};

  // Return error if source failed.
  if (workspace instanceof Error) return workspace;

  workspace.nanoid = nanoid(6);

  // Assign default locale as locales if missing.
  workspace.locales = workspace.locales || { zero: defaults.locale };

  await assignTemplates(workspace);

  await assignDefaults(workspace);

  // Substitute all SRC_* variables in locales.
  workspace.locales = JSON.parse(
    JSON.stringify(workspace.locales).replace(
      /\$\{(.*?)\}/g,
      (matched) =>
        process.env[`SRC_${matched.replace(/\$|\{|\}/g, '')}`] || matched
    )
  );
}

async function getDynamicWorkspace(req) {
  if (!req) return new Error('Not request found');
  const { slug, project, lang } = req.query;
  if (!slug) {
    return new Error('No slug specified');
  }
  if (!project) {
    return new Error('No project specified');
  }
  if (!lang) {
    return new Error('No lang specified');
  }
  const uri = process.env.MONGO_URL;
  const { MongoClient, ObjectId } = require('mongodb');
  const mongoClient = new MongoClient(uri, { useUnifiedTopology: true });
  await mongoClient.connect();
  const Page = mongoClient.db('acorn').collection('pages');
  const Version = mongoClient.db('acorn').collection('versions');
  const proposalPage = await Page.findOne({
    slug,
    type: 'map',
    projectId: new ObjectId(project),
    active: true,
  });
  if (!proposalPage) return;
  // get the most recent version id
  const contentVersionId = proposalPage?.content[lang][0];
  if (!contentVersionId) return;
  const proposalContent = await Version.findOne({
    _id: ObjectId(contentVersionId),
  });
  workspace = proposalContent.content.geolytixWorkspace;
  await assignTemplates(workspace);

  await assignDefaults(workspace);
  return workspace;
}
