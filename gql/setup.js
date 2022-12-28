var fs = require("fs")
const { gql } = require("apollo-server-express")
const DataLoader = require("dataloader")
const { authors, books } = require("../data/data")
const db = require("../db")

export const typeDefs = gql`
  ${fs.readFileSync(__dirname.concat("/schema.graphql"), "utf8")}
`
export const resolvers = {
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

export const storeItems = new Map([
  [1, { price: 14, name: "Donation" }],
  [2, { price: 30, name: "All Access Subscription" }],
])
