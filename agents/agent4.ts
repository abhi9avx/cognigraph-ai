import { createAgent, initChatModel, tool } from "langchain";
import { z } from "zod";
import { fileURLToPath } from "url";
import path from "path";
import { config } from "dotenv";

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, "../.env") });
import { MemorySaver } from "@langchain/langgraph";


const systemPrompt = `You are an expert weather forecaster and I am good in talking like a humorist.

You have access to two tools:

- get_weather_for_location: use this to get the weather for a specific location
- get_user_location: use this to get the user's location

If a user asks you for the weather, make sure you know the location first. If you can tell from the question that they mean wherever they are, use the get_user_location tool to find their location.`;

// Basic weather tool for city-based forecasts
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

// Tool to retrieve user location from context/metadata
const getUserLocation = tool((_, config) => {
    // Context is passed via configurable in LangChain/LangGraph
    const user_id = config.configurable?.user_id;

    // Database lookup simulation
    const location = user_id === "1" ? "bangalore" : "chennai";
    return location;
}, {
    name: "get_user_location",
    description: "Get the current user's city. Call this immediately if the user asks about the weather 'outside' or 'here'.",
    schema: z.object({}),
});

const responseFormat = z.object({
    humor_response: z.string(),
    weather_response: z.string()
});

// In-memory checkpointer for conversation history (memory)
const checkpointer = new MemorySaver();

// Initialize model
// Initialize model with specific temperature and token limits
const model = await initChatModel("google-genai:gemini-2.5-flash-lite",
    { temperature: 0.7, timeout: 30, max_tokens: 1000 }
);

// Create agent
// Create agent with checkpointer for state persistence
const agent = createAgent({
    model,
    tools: [getUserLocation, getWeather],
    systemPrompt,
    responseFormat: responseFormat as any,
    checkpointer: checkpointer
});

// Define configuration with context
// Define configuration with context
const agentConfig = {
    configurable: {
        thread_id: "1",
        user_id: "1"
    }
};



// Invoke agent with system instructions and user message
// First invocation: User asks about weather
// The checkpointer stores this state associated with the thread_id
const response = await agent.invoke({
    messages: [
        { role: "user", content: "what is the weather outside?" }
    ]
}, agentConfig);

// Second invocation: User asks a follow-up question
// The agent retrieves context from the previous turn via checkpointer
const response2 = await agent.invoke({
    messages: [
        { role: "user", content: "what location you tell about ?" }
    ]
}, agentConfig);

// Third invocation: Another follow-up
// The agent maintains the full conversation history
const response3 = await agent.invoke({
    messages: [
        { role: "user", content: "what are the good place in that location" }
    ]
}, agentConfig);

// Output formatted structured responses for each turn
console.log("Response 1:", JSON.stringify(response.structuredResponse, null, 2));
console.log("Response 2:", JSON.stringify(response2.structuredResponse, null, 2));
console.log("Response 3:", JSON.stringify(response3.structuredResponse, null, 2));

