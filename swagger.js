const swaggerAutogen = require("swagger-autogen")();

const doc = {
  info: {
    title: "CalmKit API",
    description:
      "Mental wellness app API with emotion logging, AI coaching, anchor phrases, and guided routines",
    version: "1.0.0",
  },
  host: "localhost:3001",
  schemes: ["http"],
  securityDefinitions: {
    bearerAuth: {
      type: "apiKey",
      name: "x-auth-token",
      in: "header",
      description: "JWT token for authentication",
    },
  },
  security: [{ bearerAuth: [] }],
  definitions: {
    User: {
      id: "string",
      email: "user@example.com",
      username: "string",
      avatarColor: "#4A9093",
    },
    Log: {
      _id: "string",
      user: "string",
      trigger: "string",
      emotion: "Happy",
      intensity: 7,
      anchor: "string",
      contributing: ["Grateful", "Stressed"],
      time: "2024-01-01T12:00:00.000Z",
      moodScore: 8.5,
    },
    Anchor: {
      _id: "string",
      user: "string",
      text: "I am grounded in this moment",
      group: "Grounding",
      isFavorite: false,
      favoriteRank: null,
      isUserCreated: false,
    },
    Routine: {
      _id: "string",
      name: "Deep Breathing",
      description: "A calming breathing exercise",
      icon: "🫁",
      tags: ["Breathing", "Quick"],
      steps: [
        {
          title: "Prepare",
          text: "Find a comfortable position",
          duration: 30,
        },
      ],
    },
    Error: {
      msg: "Error message",
    },
  },
};

const outputFile = "./openapi.json";
const routes = ["./server.js"];

swaggerAutogen(outputFile, routes, doc).then(() => {
  console.log("OpenAPI specification generated successfully!");
});
