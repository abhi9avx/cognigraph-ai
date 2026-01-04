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


// Initialize PDF loader with the file path
const loader = new PDFLoader("/Users/abhinav/Documents/CogniGraphAI/ProjectDocs/nke-10k-2023.pdf");
const docs = await loader.load(); // Load the document content
console.log(docs.length);
console.log(docs[0]);

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

// Perform a similarity search on the vector store
const result = await vectorStore.similaritySearch("When was nike incorparated?");

// control how many documnet we need 

// Invoke the retriever to get relevant documents
const retrival = await vectorStore.asRetriever({
    k: 5,
    searchType: "similarity"
}).invoke("When was nike incorparated?");
console.log(retrival);

console.log(result);
