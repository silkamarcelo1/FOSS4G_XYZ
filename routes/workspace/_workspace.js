module.exports = fastify => {

  require('./get')(fastify);

  require('./set')(fastify);

};