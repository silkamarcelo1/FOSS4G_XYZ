const dotenv = require('dotenv');
const compression = require('compression')

dotenv.config();

const express = require('express');

const cookieParser = require('cookie-parser');

const cors = require('cors');

const app = express();

app.use(process.env.DIR || '', compression(), express.static('public'));

app.use(`/xyz/docs`, express.static('docs'));

app.use(cookieParser());
app.use(cors());

const mongoConnection = async () => {
  const uri = process.env.MONGO_URL;
  const { MongoClient } = require('mongodb');
  const mongoClient = new MongoClient(uri, { useUnifiedTopology: true });
  await mongoClient.connect();
  return mongoClient;
};

const _api = require('./api/api');

mongoConnection().then(async (db) => {
  const api = (req, res) => {
    req.mongoClient = db;
    return _api(req, res);
  };

  app.get(`${process.env.DIR || ''}/api/proxy`, api);

  app.get(`${process.env.DIR || ''}/api/provider/:provider?`, api);

  app.post(
    `${process.env.DIR || ''}/api/provider/:provider?`,
    express.json({ limit: '5mb' }),
    api
  );

  app.get(`${process.env.DIR || ''}/api/query/:template?`, api);

  app.post(
    `${process.env.DIR || ''}/api/query/:template?`,
    express.json({ limit: '5mb' }),
    api
  );

  app.get(`${process.env.DIR || ''}/api/gazetteer`, api);

  app.get(`${process.env.DIR || ''}/api/workspace/get/:key?`, api);

  app.get(`${process.env.DIR || ''}/api/layer/:format?/:z?/:x?/:y?`, api);

  app.get(`${process.env.DIR || ''}/api/location/:method?`, api);

  app.post(
    `${process.env.DIR || ''}/api/location/:method?`,
    express.json({ limit: '5mb' }),
    api
  );

  app.get(`${process.env.DIR || ''}/api/user/:method?/:key?`, api);

  app.post(
    `${process.env.DIR || ''}/api/user/:method?/:key?`,
    express.urlencoded({ extended: true }),
    api
  );

  //sudo ./caddy_linux_amd64 reverse-proxy --from localhost:443 --to localhost:3000
  app.get(`${process.env.DIR || ''}/auth0/logout`, api);

  app.get(`${process.env.DIR || ''}/auth0/login`, api);

  app.get(`${process.env.DIR || ''}/auth0/callback`, api);

  app.get(`${process.env.DIR || ''}/saml/metadata`, api);

  app.get(`${process.env.DIR || ''}/saml/logout`, api);

  app.get(`${process.env.DIR || ''}/saml/login`, api);

  app.post(
    `${process.env.DIR || ''}/saml/acs`,
    express.urlencoded({ extended: true }),
    api
  );

  //sudo ./caddy_linux_amd64 reverse-proxy --from localhost:443 --to localhost:3000
  app.get(`${process.env.DIR||''}/saml/metadata`, api)
  app.get(`${process.env.DIR || ''}/view/:template?`, api);

  app.get(`${process.env.DIR || ''}/`, api);

  app.get(`${process.env.DIR || ''}/ping`, (req, res) =>
    res.json({ works: true })
  );

  process.env.DIR && app.get(`/`, api);

  app.listen(process.env.PORT || 3000);
});
