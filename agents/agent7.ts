import { createAgent, piiMiddleware, tool } from "langchain";
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

// Create the agent with PII Redaction Middleware
const agent = createAgent({
    model: "google-genai:gemini-2.5-flash",
    tools: [searchTool, emailTool, getWeather],
    middleware: [
        // Redacts credit card numbers using regex pattern
        piiMiddleware("credit_card", { detector: /\d{4}-\d{4}-\d{4}-\d{4}/g, strategy: "redact" }),
        // Redacts Social Security Numbers (SSN)
        piiMiddleware("ssn", { detector: /\d{3}-\d{2}-\d{4}/g, strategy: "redact" }),
        // Redacts phone numbers
        piiMiddleware("phone_number", { detector: /\d{3}-\d{3}-\d{4}/g, strategy: "redact" })
    ]
});


// Invoke the agent with sensitive data to test redaction
const response = await agent.invoke({
    messages: [{ role: "user", content: "My credit card number is 2345-5423-6789-7654 and my ssn is 123-45-6789 and my phone number is 123-456-7890" }]
});

// Print full JSON showing redacted message content
console.log(JSON.stringify(response, null, 2));
