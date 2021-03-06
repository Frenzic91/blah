const expect = require('expect')
const request = require('supertest')
const {ObjectID} = require('mongodb')

const {app} = require('./../server')
const {Todo} = require('./../models/todo')
const {User} = require('./../models/user')
const {todos, populateTodos, users, populateUsers} = require('./seed/seed')

beforeEach(populateUsers)
beforeEach(populateTodos)

describe('POST /todos', () => {
  it('should create a new todo', (done) => {
    var text = 'Test todo text'

    request(app)
      .post('/todos')
      .send({text})
      .expect(200)
      .expect((res) => {
        expect(res.body.text).toBe(text)
      })
      .end((err, res) => {
        if (err) {
          return done(err)
        }

        Todo.find({text}).then((todos) => {
          expect(todos.length).toBe(1)
          expect(todos[0].text).toBe(text)
          done()
        }).catch((e) => done(e))
      })
  })

  it('should not create todo with invalid body data', (done) => {
    request(app)
      .post('/todos')
      .send({})
      .expect(400)
      .expect((res) => {
        expect(res.body).toInclude({_message: 'Todo validation failed'})
      })
      .end((err, res) => {
        if (err) {
          return done(err)
        }

        Todo.find().then((todos) => {
          expect(todos.length).toBe(2)
          done()
        }).catch((e) => done(e))
      })
  })
})

describe('GET /todos', () => {
  it('should get all todos', (done) => {
    request(app)
      .get('/todos')
      .expect(200)
      .expect((res) => {
        expect(res.body.todos.length).toBe(2)
      })
      .end(done)
  })
})

describe('GET /todos/:id', () => {
  it('should return todo doc', (done) => {
    request(app)
      .get(`/todos/${todos[1]._id.toHexString()}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toInclude({todo: {
          "_id": `${todos[1]._id.toHexString()}`,
          "__v": 0,
          "text": "Jebem ti mamicu",
          "completedAt": 333,
          "completed": true
        }})
      })
      .end(done)
  })

  it('should return a 400 id if param is invalid', (done) => {
    request(app)
      .get('/todos/123456')
      .expect(400)
      .expect((res) => {
        expect(res.body).toEqual({})
      })
      .end(done)
  })

  it('should return a 404 if todo not found', (done) => {
    var hexId = new ObjectID().toHexString()
    request(app)
      .get(`/todos/${hexId}`)
      .expect(404)
      .expect((res) => {
        expect(res.body).toEqual({})
      })
      .end(done)
  })
})

describe('DELETE /todos/:id', () => {
  it('should remove a todo', (done) => {
    var hexId = todos[1]._id.toHexString()
    request(app)
      .delete(`/todos/${hexId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.todo._id).toBe(hexId)
      })
      .end((err, res) => {
        if (err) {
          return done(err)
        }

        Todo.findById(hexId).then((todo) => {
          expect(todo).toNotExist()
          done()
        }).catch((e) => {
          done(e)
        })
      })
  })

  it('should return 404 if todo not found', (done) => {
    var hexId = new ObjectID().toHexString()
    request(app)
      .delete(`/todos/${hexId}`)
      .expect(404)
      .expect((res) => {
        expect(res.body).toEqual({})
      })
      .end(done)
  })

  it('should return 400 if todo is invalid', (done) => {
    request(app)
      .delete('/todos/123456')
      .expect(400)
      .expect((res) => {
        expect(res.body).toEqual({})
      })
      .end(done)
  })
})

describe('PATCH /todos/:id', () => {
  it('should update the todo', (done) => {
    var hexId = todos[0]._id.toHexString()
    var text = 'ello dere'

    request(app)
      .patch(`/todos/${hexId}`)
      .send({text, completed: true})
      .expect(200)
      .expect((res) => {
        expect(res.body.todo.text).toBe(text)
        expect(res.body.todo.completed).toBe(true)
        expect(res.body.todo.completedAt).toBeA('number')
      })
      .end((err, res) => {
        if (err) {
          return done(err)
        }

        Todo.findById(hexId).then((todo) => {
          expect(todo.text).toBe(text)
          expect(todo.completed).toBe(true)
          expect(todo.completedAt).toBeA('number')

          done()
        }).catch((e) => {
          done(e)
        })
      })
  })

  it('should clear completedAt when todo is not completed', (done) => {
    var hexId = todos[1]._id.toHexString()

    request(app)
      .patch(`/todos/${hexId}`)
      .send({completed: false})
      .expect(200)
      .expect((res) => {
        expect(res.body.todo.completed).toBe(false)
        expect(res.body.todo.completedAt).toNotExist()
      })
      .end((err, res) => {
        if (err) {
          return done(err)
        }

        Todo.findById(hexId).then((todo) => {
          expect(todo.completed).toBe(false)
          expect(todo.completedAt).toNotExist()

          done()
        }).catch((e) => done(e))
      })
  })
})

describe('GET /users/me', () => {
  it('should return user if authenticated', (done) => {
    request(app)
      .get('/users/me')
      .set('x-auth', users[0].tokens[0].token)
      .expect(200)
      .expect((res) => {
        expect(res.body._id).toBe(users[0]._id.toHexString())
        expect(res.body.email).toBe(users[0].email)
      })
      .end(done)
  })

  it('should return a 401 if not authenticated', (done) => {
    request(app)
      .get('/users/me')
      .expect(401)
      .expect((res) => {
        expect(res.body).toEqual({})
      })
      .end(done)
  })
})

describe('POST /users', () => {
  it('should create a user', (done) => {
    var email = 'example@example.com'
    var password = '123mnb!'

    request(app)
      .post('/users')
      .send({email, password})
      .expect(200)
      .expect((res) => {
        expect(res.headers['x-auth']).toExist()
        expect(res.body._id).toExist()
        expect(res.body.email).toBe(email)
      })
      .end((err) => {
        if (err) {
          return done(err)
        }

        User.findOne({email}).then((user) => {
          expect(user).toExist()
          expect(user.password).toNotBe(password)
          done()
        })
      })
  })

  it('should return validation errors if request invalid', (done) => {
    var email = 'feckyeh'
    var password = '1b'

    request(app)
      .post('/users')
      .send({email, password})
      .expect(400)
      .end(done)
  })

  it('should not create user if email in use', (done) => {
    var email = users[0].email
    var password = users[0].password

    request(app)
      .post('/users')
      .send({email, password})
      .expect(400)
      .end(done)
  })
})