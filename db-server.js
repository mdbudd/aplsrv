const bodyParser = require("body-parser")
const middleware = require("./middleware")
var fs = require("fs")
var http = require("http")
var https = require("https")
var privateKey = fs.readFileSync("cert/cloudcert.key", "utf8")
var certificate = fs.readFileSync("cert/cloudcert.pem", "utf8")
var credentials = { key: privateKey, cert: certificate }
const jwt = require("jsonwebtoken")
const DataLoader = require("dataloader")
const data = require("./data/users")
const { authors, books, whitelist, JWT_SECRET } = require("./data/data")
const cors = require("cors")
const express = require("express")
const db = require("./db")
const { ApolloServer, gql } = require("apollo-server-express")

const port = process.env.PORT || 2096
const app = express()

// const corsOptions = {
//   origin: function (origin, callback) {
//     console.log(origin)
//     if (whitelist.indexOf(req.header('Origin')) !== -1) {
//       callback(null, true)
//     } else {
//       callback(new Error("Not allowed by CORS"))
//     }
//   },
// }

var corsOptionsDelegate = function (req, callback) {
  // console.log(req.headers.origin)
  // console.log(req.connection.remoteAddress)
  // console.log(req.headers)
  if (
    whitelist.indexOf(req.headers.origin) !== -1 ||
    whitelist.indexOf(req.header("Origin")) !== -1 ||
    whitelist.indexOf(req.connection.remoteAddress.split(`:`).pop()) !== -1 ||
    req.headers.host == "localhost:9000"
  ) {
    callback(null, true)
  } else {
    callback(new Error("Not allowed by CORS"))
    // callback(null, true)
  }
}

app.use(cors(corsOptionsDelegate))
const typeDefs = gql`
  ${fs.readFileSync(__dirname.concat("/schema.graphql"), "utf8")}
`
const resolvers = {
  Query: {
    test: () => "Test Success, GraphQL server is up & running !!",
    greeting: () => "Hello GraphQL  From TutorialsPoint !!",
    getStudents: () => db.students.list(),
    getJobs: () => db.jobs.list(),
    getSkills: () => db.skills.list(),
    getHits: () => db.hits.list(),
    studentById: (root, args, context, info) => {
      return db.students.get(args.id)
    },
    books: () => books,
  },
  Book: {
    // author: parent => {
    //   console.log(authors.find(author => author.id === parent.author))
    //   return authors.find(author => author.id === parent.author)
    // },
    author: parent => {
      const authorLoader = new DataLoader(keys => {
        const result = keys.map(authorId => {
          // console.log(authors.find((author) => author.id === authorId))
          return authors.find(author => author.id === authorId)
        })

        console.log(result)
        return Promise.resolve(result)
      })

      // console.log(authorLoader.load(parent.author))
      return authorLoader.load(parent.author)
    },
  },
  Mutation: {
    createStudent: (root, args, context, info) => {
      const id = db.students.create({ email: args.email, firstName: args.firstName, lastName: args.lastName, password: args.password, new: args.new })
      // console.log(db.students.get(id))
      return db.students.get(id)
    },
    createJob: (root, args, context, info) => {
      const id = db.jobs.create({ title: args.title, from: args.from, to: args.to, company: args.company, description: args.description })
      // console.log(db.jobs.get(id))
      return db.jobs.get(id)
    },
    createSkill: (root, args, context, info) => {
      const id = db.skills.create({ title: args.title, link: args.link, description: args.description, level: args.level })
      // console.log(db.skills.get(id))
      return db.skills.get(id)
    },
    createHit: (root, args, context, info) => {
      const id = db.hits.create({ title: args.title, ref: args.ref, lat: args.lat, lon: args.lon, date: args.date })
      // console.log(process)
      // console.log(db.hits.get(id))
      return db.hits.get(id)
    },
  },
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  dataSources: () => ({
    DB: db,
  }),
})

server.applyMiddleware({ app })
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.post("/api/auth", (req, res) => {
  // console.log(req.body)
  let user = data.users.filter(user => {
    return user.name == req.body.username && user.password == req.body.password
  })
  if (user.length) {
    // create a token using user name and password vaild for 2 hours
    let token_payload = { name: user[0].name, password: user[0].password }
    let token = jwt.sign(token_payload, JWT_SECRET, { expiresIn: "2h" })
    let response = { message: "Token Created, Authentication Successful!", token: token }

    // return the information including token as JSON
    return res.status(200).json(response)
  } else {
    return res.status("409").json("Authentication failed. admin not found.")
  }
})

// app.listen({ port: port }, () => console.log(`🚀 Server ready at http://localhost:${port}${server.graphqlPath}`))
var httpServer = http.createServer(app)
var httpsServer = https.createServer(credentials, app)

httpServer.listen({ port: 9000 }, () => console.log(`🚀 http Server ready at http://localhost:9000${server.graphqlPath}`))
httpsServer.listen({ port: 2096 }, () => console.log(`🚀 https Server ready at https://localhost:2096${server.graphqlPath}`))
