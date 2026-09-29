import { config } from 'dotenv';
import * as path from 'path'

// Load environment variables from .env.test file for testing purposes 
// This loads before any test module imports
config({ 
    path: path.resolve(__dirname, '../.env.test') 
});