import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { api } from "../functions/api/resource";

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any unauthenticated user can "create", "read", "update", 
and "delete" any "Todo" records.
=========================================================================*/
const schema = a.schema({
  Todo: a
    .model({
      content: a.string(),
    })
    .authorization((allow) => [
      allow.guest().to(["read"]),
      allow.authenticated().to(["create", "update", "delete"]),
    ]),

  DbUserProfile: a.customType({
    id: a.id().required(),
    name: a.string().required(),
    age: a.integer().required(),
    bio: a.string(),
    instruments: a.string().array().required(),
  }),

  DbArtist: a.customType({
    id: a.id().required(),
    name: a.string().required(),
    description: a.string(),
  }),

  DbLikeArtist: a.customType({
    id: a.id().required(),
    userId: a.id().required(),
    artistId: a.id().required(),
  }),

  DbQuestion: a.customType({
    id: a.id().required(),
    title: a.string().required(),
    content: a.string().required(),
    userId: a.id().required(),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime().required(),
    attachments: a.string().array().required(),
    showUsername: a.boolean().required(),
    category: a.string().required(),
  }),

  DbComment: a.customType({
    id: a.id().required(),
    questionId: a.id().required(),
    userId: a.id().required(),
    content: a.string().required(),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime().required(),
    attachments: a.string().array().required(),
    showUsername: a.boolean().required(),
    parentCommentId: a.id(),
  }),

  listDbUserProfiles: a
    .query()
    .returns(a.ref("DbUserProfile").array())
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(api)),

  listDbArtists: a
    .query()
    .returns(a.ref("DbArtist").array())
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(api)),

  listDbLikeArtists: a
    .query()
    .returns(a.ref("DbLikeArtist").array())
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(api)),

  listDbQuestions: a
    .query()
    .returns(a.ref("DbQuestion").array())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(api)),

  listDbComments: a
    .query()
    .returns(a.ref("DbComment").array())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(api)),

  createDbUserProfile: a
    .mutation()
    .arguments({
      name: a.string().required(),
      age: a.integer().required(),
      bio: a.string(),
      instruments: a.string().array().required(),
    })
    .returns(a.ref("DbUserProfile"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(api)),

  updateDbUserProfile: a
    .mutation()
    .arguments({
      name: a.string(),
      age: a.integer(),
      bio: a.string(),
      instruments: a.string().array(),
    })
    .returns(a.ref("DbUserProfile"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(api)),

  deleteDbUserProfile: a
    .mutation()
    .returns(a.boolean())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(api)),

  createDbArtist: a
    .mutation()
    .arguments({
      name: a.string().required(),
      description: a.string(),
    })
    .returns(a.ref("DbArtist"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(api)),

  updateDbArtist: a
    .mutation()
    .arguments({
      id: a.id().required(),
      name: a.string(),
      description: a.string(),
    })
    .returns(a.ref("DbArtist"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(api)),

  deleteDbArtist: a
    .mutation()
    .arguments({
      id: a.id().required(),
    })
    .returns(a.boolean())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(api)),

  createDbLikeArtist: a
    .mutation()
    .arguments({
      artistId: a.id().required(),
    })
    .returns(a.ref("DbLikeArtist"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(api)),

  deleteDbLikeArtist: a
    .mutation()
    .arguments({
      id: a.id().required(),
    })
    .returns(a.boolean())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(api)),

  createDbQuestion: a
    .mutation()
    .arguments({
      title: a.string().required(),
      content: a.string().required(),
      attachments: a.string().array().required(),
      showUsername: a.boolean(),
      category: a.string(),
    })
    .returns(a.ref("DbQuestion"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(api)),

  updateDbQuestion: a
    .mutation()
    .arguments({
      id: a.id().required(),
      title: a.string(),
      content: a.string(),
      attachments: a.string().array(),
      showUsername: a.boolean(),
      category: a.string(),
    })
    .returns(a.ref("DbQuestion"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(api)),

  deleteDbQuestion: a
    .mutation()
    .arguments({
      id: a.id().required(),
    })
    .returns(a.boolean())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(api)),

  createDbComment: a
    .mutation()
    .arguments({
      questionId: a.id().required(),
      content: a.string().required(),
      attachments: a.string().array().required(),
      showUsername: a.boolean(),
      parentCommentId: a.id(),
    })
    .returns(a.ref("DbComment"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(api)),

  updateDbComment: a
    .mutation()
    .arguments({
      id: a.id().required(),
      content: a.string(),
      attachments: a.string().array(),
      showUsername: a.boolean(),
    })
    .returns(a.ref("DbComment"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(api)),

  deleteDbComment: a
    .mutation()
    .arguments({
      id: a.id().required(),
    })
    .returns(a.boolean())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(api)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
