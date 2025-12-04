import app from "../src/server.js";
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export default app;
