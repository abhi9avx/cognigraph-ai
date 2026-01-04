import { createAgent, initChatModel, tool } from "langchain";
import { z } from "zod";
import { fileURLToPath } from "url";
import path from "path";
import { config } from "dotenv";

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, "../.env") });

const systemPrompt = `You are an expert weather forecaster and I am good in taking like a humorist.

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

// Define format for forced structured output
const responseFormat = z.object({
    humor_response: z.string(),
    weather_response: z.string()
});

// Initialize model
// Initialize model with specific temperature and token limits
const model = await initChatModel("google-genai:gemini-2.5-flash-lite",
    { temperature: 0.7, timeout: 30, max_tokens: 1000 }
);

// Create agent
// Create agent with structured output enforcement (Zod)
const agent = createAgent({
    model,
    tools: [getUserLocation, getWeather],
    systemPrompt,
    responseFormat: responseFormat
});

// Define configuration with context
// Define configuration with context
const agentConfig = {
    configurable: { user_id: "1" }
};



// Invoke agent with system instructions and user message
// Invoke agent, expecting a structured JSON response in the output
const response = await agent.invoke({
    messages: [
        { role: "user", content: "what is the weather outside?" }
    ]
}, agentConfig);

// Log only the structured response from the agent
console.log(JSON.stringify(response.structuredResponse, null, 2));
