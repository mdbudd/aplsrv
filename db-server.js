const bodyParser = require("body-parser")
const middleware = require("./middleware")
var fs = require("fs")
var http = require("http")
var https = require("https")
var privateKey = fs.readFileSync("cert/cloudcert.key", "utf8")
var certificate = fs.readFileSync("cert/cloudcert.pem", "utf8")
var credentials = { key: privateKey, cert: certificate }
const jwt = require("jsonwebtoken")
const data = require("./data/users")
const db = require("./db")
const cors = require("cors")
import { corsOptionsDelegate } from "./cors/setup.js"
const { ApolloServer } = require("apollo-server-express")
import { typeDefs, resolvers, storeItems } from "./gql/setup.js"
const paypal = require("@paypal/checkout-server-sdk")
const express = require("express")
const app = express()
const dotenv = require("dotenv")
dotenv.config()
const { JWT_SECRET } = require("./data/data")
const Environment = process.env.NODE_ENV === "dev" ? paypal.core.SandboxEnvironment : paypal.core.LiveEnvironment
const ID = process.env.NODE_ENV === "dev" ? process.env.PPS_CID : process.env.PP_CID
const KEY = process.env.NODE_ENV === "dev" ? process.env.PPS_SEC : process.env.PP_SEC
const paypalClient = new paypal.core.PayPalHttpClient(new Environment(ID, KEY))
const port = process.env.PORT || 2096

app.use(cors(corsOptionsDelegate))

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

app.post("/api/register", (req, res) => {
  let user = db.members.list().filter(user => {
    return user.name == req.body.name
  })
  if (user.length) {
    let response = { message: "Username already gone, please try again." }
    return res.status("409").json(response)
  } else {
    db.members.create({ name: req.body.name, password: req.body.password, role: "" })
    let response = { message: "You are registered, welcome!" }
    return res.status(200).json(response)
  }
})

app.post("/api/login", (req, res) => {
  let user = db.members.list().filter(user => {
    return user.name == req.body.name && user.password == req.body.password
  })
  if (user.length) {
    let token_payload = { name: user[0].name, role: user[0].role }
    let token = jwt.sign(token_payload, JWT_SECRET, { expiresIn: "2h" })
    var decoded = jwt.verify(token, JWT_SECRET)
    console.log(decoded) // bar
    let response = { message: "Token Created, Authentication Successful!", token: token, user: { name: decoded.name, role: decoded.role } }

    return res.status(200).json(response)
  } else {
    return res.status("409").json("Authentication failed. member not found.")
  }
})

app.post("/api/subscribe", (req, res) => {
  var decoded = jwt.verify(req.body.token, JWT_SECRET)
  if (decoded) {
    let user = db.members.list().filter(user => {
      return user.name == decoded.name
    })

    if (user.length && req.body.order.status === "COMPLETED") {
      db.members.update({ id: user[0].id, name: user[0].name, password: user[0].password, role: req.body.role })
      let token_payload = { name: user[0].name, role: req.body.role }
      let token = jwt.sign(token_payload, JWT_SECRET, { expiresIn: "2h" })
      var decodedNew = jwt.verify(token, JWT_SECRET)

      if (decodedNew) {
        let response = { message: "Now a subscriber, User Welcome!", token: token, user: { name: decodedNew.name, role: decodedNew.role } }

        // return the information including token as JSON
        console.info(response)
        return res.status(200).json(response)
      } else {
        return res.status("409").json("Authentication failed.")
      }
    } else {
      return res.status("404").json("User not verified. Please contact the administrator who will sort your subscription or refund if money has changed hands.")
    }
  } else {
    return res.status("409").json("Authentication failed.")
  }
})

app.post("/api/user", (req, res) => {
  var decoded = jwt.verify(req.body.token, JWT_SECRET)
  if (decoded) {
    let response = { message: "Token Decoded, User Welcome!", token: req.body.token, user: { name: decoded.name, role: decoded.role } }

    // return the information including token as JSON
    console.info(response)
    return res.status(200).json(response)
  } else {
    return res.status("409").json("Authentication failed.")
  }
})

app.get("/api/pp", (req, res) => {
  res.status(200).json({
    paypalClientId: ID,
  })
})

app.post("/create-order", async (req, res) => {
  // { items: [{ id: 1, quantity: 1 }] }
  const request = new paypal.orders.OrdersCreateRequest()
  console.info(req.body)
  const total = req.body.items.reduce((sum, item) => {
    return sum + storeItems.get(item.id).price * item.quantity
  }, 0)
  request.prefer("return=representation")
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "GBP",
          value: total,
          breakdown: {
            item_total: {
              currency_code: "GBP",
              value: total,
            },
          },
        },
        items: req.body.items.map(item => {
          const storeItem = storeItems.get(item.id)
          return {
            name: storeItem.name,
            unit_amount: {
              currency_code: "GBP",
              value: storeItem.price,
            },
            quantity: item.quantity,
          }
        }),
      },
    ],
  })

  try {
    const order = await paypalClient.execute(request)
    res.json({ id: order.result.id })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get("/api/members", (req, res) => {
  return res.status(200).json(db.members.list())
})

// app.listen({ port: port }, () => console.log(`🚀 Server ready at http://localhost:${port}${server.graphqlPath}`))
var httpServer = http.createServer(app)
var httpsServer = https.createServer(credentials, app)

httpServer.listen({ port: 9000 }, () => console.log(`🚀 http Server ready at http://localhost:9000${server.graphqlPath}`))
httpsServer.listen({ port: 2096 }, () => console.log(`🚀 https Server ready at https://localhost:2096${server.graphqlPath}`))
