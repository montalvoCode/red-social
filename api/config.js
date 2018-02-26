module.exports = {
    port: process.env.port || 3001,
    db: process.env.MONGODB || 'mongodb://localhost:27017/redSocial'
}