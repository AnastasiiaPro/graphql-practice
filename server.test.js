const request = require('supertest');
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');

const typeDefs = `#graphql
  type Book {
    id: ID!
    title: String!
    author: String!
  }

  type Query {
    books: [Book!]!
    book(id: ID!): Book
  }
`;

let books = [
  { id: '1', title: 'The Hobbit', author: 'J.R.R. Tolkien' },
];

const resolvers = {
  Query: {
    books: () => books,
    book: (parent, args) => books.find((b) => b.id === args.id),
  },
};

let url;
let server;

beforeAll(async () => {
  const apollo = new ApolloServer({ typeDefs, resolvers });
  const result = await startStandaloneServer(apollo, {
    listen: { port: 0 },
  });
  url = result.url;
  server = apollo;
});

afterAll(async () => {
  await server.stop();
});

test('возвращает список книг', async () => {
  const response = await request(url)
    .post('/')
    .send({
      query: `
        query {
          books {
            id
            title
          }
        }
      `,
    })
    .expect(200);

  expect(response.body.errors).toBeUndefined();
  expect(response.body.data.books).toHaveLength(1);
  expect(response.body.data.books[0].title).toBe('The Hobbit');
});

test('возвращает null для несуществующей книги', async () => {
  const response = await request(url)
    .post('/')
    .send({
      query: `
        query {
          book(id: "999") {
            title
          }
        }
      `,
    });

  expect(response.body.errors).toBeUndefined();
  expect(response.body.data.book).toBeNull();
});

test('ошибка валидации при несуществующем поле', async () => {
  const response = await request(url)
    .post('/')
    .send({
      query: `
        query {
          books {
            price
          }
        }
      `,
    });

  expect(response.body.errors).toBeDefined();
  expect(response.body.errors.length).toBeGreaterThan(0);
});