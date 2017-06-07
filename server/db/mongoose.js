var mongoose = require('mongoose')

// setup connection to database
mongoose.Promise = global.Promise
mongoose.connect('mongodb://localhost:27017/TodoApp')

module.exports = {
  mongoose
}