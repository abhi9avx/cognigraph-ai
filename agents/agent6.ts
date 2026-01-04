import { createAgent, llmToolSelectorMiddleware, modelFallbackMiddleware, summarizationMiddleware, tool } from "langchain";
import { fileURLToPath } from "url";
import path from "path";
import { config } from "dotenv";

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, "../.env") });
import { z } from "zod";


// Search tool for internet-based queries
const searchTool = tool(({ query }) => {
    return `Search result for ${query} : found 5 articles returned`;
},
    {
        name: "search",
        description: "Search in internet for information",
        schema: z.object({
            query: z.string()
        })
    })


// Email tool to simulate sending emails
const emailTool = tool(({ recipient, subject }) => {
    return `Email sent successfully to ${recipient} with subject ${subject}`;
},
    {
        name: "send_email",
        description: "Send an email to someone",
        schema: z.object({
            recipient: z.string(),
            subject: z.string(),
        })
    })


// Utility tool for weather data
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


const systemPrompt = "You are a helpful assistant with access to search, email, and weather tools. Use them whenever needed to fulfill user requests.";

// Create the agent with advanced middleware
const agent = createAgent({
    model: "google-genai:gemini-2.5-flash",
    tools: [searchTool, emailTool, getWeather],
    systemPrompt,
    // If the first model fails, it will fall back to the second one.
    middleware: [
        // Automatically falls back to lite model if flash model fails
        modelFallbackMiddleware("google-genai:gemini-2.5-flash", "google-genai:gemini-2.5-flash-lite"),
        // Compresses history to stay within context limits
        summarizationMiddleware({
            model: "google-genai:gemini-2.5-flash-lite",
            trigger: { tokens: 8000 },
            keep: { messages: 20 },
        }),
        // Pre-selects tools using a basic model for efficiency
        llmToolSelectorMiddleware({
            model: "google-genai:gemini-2.5-flash-lite",
        })
    ]
});


// Invoke the agent with a complex query requiring multiple tools
const response = await agent.invoke({
    messages: [{ role: "user", content: "Search for the weather in Bangalore and then send an email with the weather to boss@example.com with subject 'Weather Update'" }]
});

// Output full JSON trace of the agent execution
console.log(JSON.stringify(response, null, 2));
