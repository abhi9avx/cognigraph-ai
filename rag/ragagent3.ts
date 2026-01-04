import { fileURLToPath } from "url";
import path from "path";
import { config } from "dotenv";

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, "../.env") });

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { createAgent, dynamicSystemPromptMiddleware } from "langchain";


// Define paths for multiple PDF documents
const pdfPaths = ["/Users/abhinav/Documents/CogniGraphAI/ProjectDocs/nke-10k-2023.pdf",
    "/Users/abhinav/Documents/CogniGraphAI/ProjectDocs/Nike-Inc-2025_10K.pdf",
    "/Users/abhinav/Documents/CogniGraphAI/ProjectDocs/nike-growth-story.pdf"];



const allDocs = [];

// Loop through each PDF path and load documents
for (const pdfPath of pdfPaths) {
    const loader = new PDFLoader(pdfPath);
    const docs = await loader.load();
    allDocs.push(...docs);
}



// Initialize text splitter to chunk documents
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
});

// Split all loaded documents into chunks for embedding
const splitDocs = await textSplitter.splitDocuments(allDocs);
// Filter out any documents with empty content to avoid embedding errors
const filteredDocs = splitDocs.filter(doc => doc.pageContent.trim().length > 0);



// Initialize Google Generative AI Embeddings model
const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "text-embedding-004"
});


// Create a vector store from the split documents and embeddings
const vectorStore = await HNSWLib.fromDocuments(filteredDocs, embeddings);


// Define middleware for RAG logic: retrieve context and augment prompt
const ragMiddleware = dynamicSystemPromptMiddleware(async (state) => {
    const userMessage = state.messages[state.messages.length - 1].content;
    const query = typeof userMessage === "string" ? userMessage : "";
    const result = await vectorStore.similaritySearch(query);
    const context = result.map(doc => doc.pageContent).join("\n");
    return `You are a helpful assistant that can answer questions about the Nike. please check the context and answer the question.  ${context}`;
})


// Create an agent with the Gemini model and RAG middleware
const agent = createAgent({
    model: "google-genai:gemini-2.5-flash",
    tools: [],
    middleware: [ragMiddleware]
});


// Invoke the agent with a complex query
const response = await agent.invoke({
    messages: [
        { role: "user", content: "What was nike revenue in 2023 and 2025 and from which town nike has grown fast and started  from which country ?" }
    ]
})
console.log(response);  