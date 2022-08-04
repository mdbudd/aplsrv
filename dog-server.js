const { ApolloServer, gql } = require('apollo-server');
const { RESTDataSource } = require('apollo-datasource-rest');

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
  type Query {
    randomDog: Dog
    breed(name: String!): Dog
  }

  type Dog {
    image: String
    status: String!
  }
`;

class DogAPI extends RESTDataSource {
  constructor(){
    super();
    this.baseURL = 'https://dog.ceo/api/';
  }

  async getRandomDog() {
    return await this.get('breeds/image/random');
  }
  
  async getAllBreeds() {
    const res = await this.get('breeds/list/all');
    return Object.keys(res.message);
  }

  async getRandomDogByBreed(breed) {
    const breeds = await this.getAllBreeds();
    if(!breeds.includes(breed)) return { status: "error: unknown breed" };
    
    const res = await this.get(`breed/${breed}/images`);
    
    if(!res || !res.message || !res.message.length) return null;

    const index = Math.floor(Math.random() * res.message.length);
    return {
      message: res.message[index],
      status: res.status
    };
  }

}

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    randomDog: (_, __, { dataSources }) => {
      return dataSources.dogAPI.getRandomDog();
    },
    breed: async (_, { name }, { dataSources }) => {
      const breed = name.replace(/\s+/g, ''); // remove spaces
      return dataSources.dogAPI.getRandomDogByBreed(breed);
    }
  },
  Dog: {
    image: ({ message }) => message
  }
};

const server = new ApolloServer({ 
  typeDefs, 
  resolvers, 
  dataSources: () => ({
    dogAPI: new DogAPI()
  }),
});

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`)
});