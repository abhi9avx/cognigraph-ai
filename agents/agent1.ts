import { createAgent, initChatModel, tool } from "langchain";
import { z } from "zod";
import { fileURLToPath } from "url";
import path from "path";
import { config } from "dotenv";

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, "../.env") });

// Define weather tool with Zod schema for city input
const getWeather = tool((input) => {
    // In a real app, this would fetch from an API
    return `The weather in ${input.city} is 27 degrees.`;
}, {
    name: "get_weather",
    description: "get weather in a city",
    schema: z.object({
        city: z.string(),
    })
});

// Define time tool to simulate fetching current time
const getTime = tool((input) => {
    return `The current time in ${input.city} is 3:00 PM`;
},
    {
        name: "get_time",
        description: "get the current time in given city",
        schema: z.object({
            city: z.string(),

        })
    }
)

// Initialize the Google Gemini model using the universal chat model interface
const model = await initChatModel("google-genai:gemini-2.5-flash-lite");

// Create the agent with the model and tools
// Initialize the agent with valid tools and the model
const agent = createAgent({
    model,
    tools: [getWeather, getTime]
});

// Invoke the agent with a multi-tool query
// Invoke the agent with a multi-tool query to test parallel tool calling
const response = await agent.invoke({
    //messages: [{ role: "user", content: "what is weather in bangalore? should i wear a jacket?" }]
    // messages: [{ role: "user", content: "what is the time in bangalore?" }]
    messages: [{ role: "user", content: "what is the weather and  time in bangalore?" }]
});

// Output the full JSON response from the agent
console.log(JSON.stringify(response, null, 2));