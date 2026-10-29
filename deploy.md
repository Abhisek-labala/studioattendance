sudo -u postgres psql

-- 1. Create a database for Attendance System
CREATE DATABASE studio_gfx;

-- 2. Create a dedicated user
CREATE USER studio_app WITH ENCRYPTED PASSWORD 'studi_@!ogfx';

-- 3. Grant permissions
GRANT ALL PRIVILEGES ON DATABASE studio_gfx TO studio_app;
\c studio_gfx;
GRANT USAGE, CREATE ON SCHEMA public TO studio_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO studio_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO studio_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO studio_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO studio_app;

\q