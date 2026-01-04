import { createAgent, createMiddleware, initChatModel, tool } from "langchain";
import { z } from "zod";
import { fileURLToPath } from "url";
import path from "path";
import { config } from "dotenv";

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, "../.env") });
import { MemorySaver } from "@langchain/langgraph";


const systemPrompt = `You are a helpful weather assistant. 

1. ALWAYS use the 'get_user_location' tool if you don't know where the user is.
2. Use the 'get_weather' tool to fetch data.
3. Use the 'answer' field in your response to answer the user's specific questions (like recommendations for places).
4. Use the 'humor_response' for a joke.
5. Use the 'weather_response' for the raw weather data.`;

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
    answer: z.string().describe("The main answer to the user's question, including tips or recommendations."),
    humor_response: z.string(),
    weather_response: z.string()
});

// Pre-initialize models for efficiency
// Flash-lite is faster and cheaper, used for simple queries
const liteModel = await initChatModel("google-genai:gemini-2.5-flash-lite");
// Flash is more powerful, used for complex queries requiring more reasoning
const flashModel = await initChatModel("google-genai:gemini-2.5-flash");

// Middleware to switch models based on conversation length (cost optimization)
const dynamicModelSelection = createMiddleware({
    name: "DynamicModelSelection",
    wrapModelCall: async (request, handler) => {
        const messageCount = request.messages.length;
        const selectedModel = messageCount < 5 ? liteModel : flashModel;
        console.log(`[Middleware] Message count: ${messageCount}. Selected model: ${messageCount < 5 ? "gemini-2.5-flash-lite" : "gemini-2.5-flash"}`);

        return handler({
            ...request,
            model: selectedModel
        });
    }
});

const checkpointer = new MemorySaver();

// Create the agent with dynamic model selection middleware
const agent = createAgent({
    model: liteModel, // Default model (can be overridden by middleware)
    tools: [getUserLocation, getWeather],
    systemPrompt,
    responseFormat: responseFormat as any,
    checkpointer,
    middleware: [dynamicModelSelection]
});


// Define configuration with context
const agentConfig = {
    configurable: {
        thread_id: "1",
        user_id: "1"
    }
};



// Invoke agent with system instructions and user message
// Invoke agent, simple query should use the lite model
const response = await agent.invoke({
    messages: [
        { role: "user", content: "what is the weather outside?" }
    ]
}, agentConfig);

// Follow-up query, extending the conversation history
const response2 = await agent.invoke({
    messages: [
        { role: "user", content: "what location you tell about ?" }
    ]
}, agentConfig);

// Complex query or long context might trigger the flash model via middleware
const response3 = await agent.invoke({
    messages: [
        { role: "user", content: "what are the good place in that location" }
    ]
}, agentConfig);

// Log responses showing context retention across conversation turns
console.log("Response 1:", JSON.stringify(response.structuredResponse, null, 2));
console.log("Response 2:", JSON.stringify(response2.structuredResponse, null, 2));
console.log("Response 3:", JSON.stringify(response3.structuredResponse, null, 2));

