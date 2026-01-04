import { config } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, "../.env") });

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { createAgent, dynamicSystemPromptMiddleware } from "langchain";


import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";

// Initialize DocxLoader with the file path
const loader = new DocxLoader("/Users/abhinav/Documents/CogniGraphAI/ProjectDocs/nike-growth-story.docx");
const docs = await loader.load(); // Load the document content
console.log(docs.length);


// Initialize text splitter to chunk documents
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
});

// Split documents into chunks for embedding
const splitDocs = await textSplitter.splitDocuments(docs);
// Filter out any documents with empty content to avoid embedding errors
const filteredDocs = splitDocs.filter(doc => doc.pageContent.trim().length > 0);
console.log(filteredDocs.length);


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
    return `You are a helpful assistant that can answer questions about the growth story of Nike. please check the context and answer the question.  ${context}`;
})


// Create an agent with the Gemini model and RAG middleware
const agent = createAgent({
    model: "google-genai:gemini-2.5-flash",
    tools: [],
    middleware: [ragMiddleware]
});


// Invoke the agent with a user query
const response = await agent.invoke({
    messages: [
        { role: "user", content: "What are the key highlight of the nike growth story?" }
    ]
})
console.log(response);  