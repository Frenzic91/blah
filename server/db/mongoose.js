var mongoose = require('mongoose')

// setup connection to database
mongoose.Promise = global.Promise
mongoose.connect(process.env.MONGODB_URI)

module.exports = {mongoose}