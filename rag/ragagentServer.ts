import { fileURLToPath } from "url";
import path from "path";
import { config } from "dotenv";

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, "../.env") });

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { MemorySaver, MessagesAnnotation, StateGraph, START, END } from "@langchain/langgraph";
import { SystemMessage } from "@langchain/core/messages";


// Initialize PDF loader with the file path
const pdfPaths = ["/Users/abhinav/Documents/CogniGraphAI/ProjectDocs/nke-10k-2023.pdf",
    "/Users/abhinav/Documents/CogniGraphAI/ProjectDocs/Nike-Inc-2025_10K.pdf",
    "/Users/abhinav/Documents/CogniGraphAI/ProjectDocs/nike-growth-story.pdf"];

// Lazy initialization singleton for the vector store
let vectorStoreInstance: HNSWLib | null = null;

async function getVectorStore() {
    if (vectorStoreInstance) {
        return vectorStoreInstance;
    }

    const allDocs = [];
    // Load all documents from the specified paths
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

    // Split documents into chunks for embedding
    const splitDocs = await textSplitter.splitDocuments(allDocs);
    // Filter out any documents with empty content to avoid embedding errors
    const filteredDocs = splitDocs.filter(doc => doc.pageContent.trim().length > 0);

    // Initialize Google Generative AI Embeddings model
    const embeddings = new GoogleGenerativeAIEmbeddings({
        model: "text-embedding-004"
    });

    // Create and return the vector store
    vectorStoreInstance = await HNSWLib.fromDocuments(filteredDocs, embeddings);
    return vectorStoreInstance;
}

// Initialize the Gemini chat model
const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0
});

const callModel = async (state: typeof MessagesAnnotation.State) => {
    // Ensure vector store is ready
    const vectorStore = await getVectorStore();

    // Get last user message
    const userMessage = state.messages[state.messages.length - 1];
    const query = typeof userMessage.content === "string" ? userMessage.content : "";

    const result = await vectorStore.similaritySearch(query);
    const context = result.map(doc => doc.pageContent).join("\n");

    const systemMessage = new SystemMessage(`You are a helpful assistant that can answer questions about the Nike. please check the context and answer the question.  ${context}`);

    // Invoke model with context
    const response = await model.invoke([systemMessage, ...state.messages]);

    return { messages: [response] };
};

// Define the state graph for the agent workflow
const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", callModel)
    .addEdge(START, "agent")
    .addEdge("agent", END);

export const graph = workflow.compile({ checkpointer: new MemorySaver() });