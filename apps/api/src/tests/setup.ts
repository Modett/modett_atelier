/**
 * Load env before any test or module that needs DATABASE_URL / REDIS_URL.
 */
import dotenv from 'dotenv'

dotenv.config()