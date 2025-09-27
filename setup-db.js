const Database = require('better-sqlite3');
const fs = require('fs');

const db = new Database('local.db');

// Apply all migrations in order
console.log('Creating database tables...');

// Migration 0000 - Create initial tables
const migration0000 = `
CREATE TABLE resources (
	id text PRIMARY KEY NOT NULL,
	name text NOT NULL,
	quantity integer DEFAULT 0 NOT NULL,
	description text,
	category text,
	last_updated_by text NOT NULL,
	created_at integer NOT NULL,
	updated_at integer NOT NULL
);

CREATE TABLE user_sessions (
	id text PRIMARY KEY NOT NULL,
	user_id text NOT NULL,
	roles text NOT NULL,
	is_in_guild integer NOT NULL,
	created_at integer NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
);

CREATE TABLE users (
	id text PRIMARY KEY NOT NULL,
	discord_id text NOT NULL,
	username text NOT NULL,
	avatar text,
	created_at integer NOT NULL,
	last_login integer NOT NULL
);

CREATE UNIQUE INDEX users_discord_id_unique ON users (discord_id);
`;

// Migration 0001 - Add resource_history table
const migration0001 = `
CREATE TABLE resource_history (
	id text PRIMARY KEY NOT NULL,
	resource_id text NOT NULL,
	previous_quantity integer NOT NULL,
	new_quantity integer NOT NULL,
	change_amount integer NOT NULL,
	change_type text NOT NULL,
	updated_by text NOT NULL,
	reason text,
	created_at integer NOT NULL,
	FOREIGN KEY (resource_id) REFERENCES resources(id) ON UPDATE no action ON DELETE no action
);
`;

// Migration 0002 - Add columns to resources
const migration0002 = `
ALTER TABLE resources ADD icon text;
ALTER TABLE resources ADD status text;
ALTER TABLE resources ADD target_quantity integer;
`;

// Migration 0003 - Add image_url to resources
const migration0003 = `
ALTER TABLE resources ADD image_url text;
`;

// Migration 0004 - Add custom_nickname to users
const migration0004 = `
ALTER TABLE users ADD custom_nickname text;
`;

// Migration 0005 - Add leaderboard table (check if exists)
const migration0005 = `
CREATE TABLE leaderboard (
	id text PRIMARY KEY NOT NULL,
	user_id text NOT NULL,
	action_type text NOT NULL,
	resource_name text NOT NULL,
	resource_category text NOT NULL,
	points_earned real NOT NULL,
	multiplier real DEFAULT 1.0 NOT NULL,
	resource_multiplier real DEFAULT 1.0 NOT NULL,
	status_bonus real DEFAULT 0.0 NOT NULL,
	total_points real NOT NULL,
	action_date integer NOT NULL,
	created_at integer NOT NULL,
	updated_at integer NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
);
`;

try {
  // Apply migrations
  db.exec(migration0000);
  console.log('✓ Migration 0000 applied - Created initial tables');
  
  db.exec(migration0001);
  console.log('✓ Migration 0001 applied - Created resource_history table');
  
  db.exec(migration0002);
  console.log('✓ Migration 0002 applied - Added columns to resources');
  
  db.exec(migration0003);
  console.log('✓ Migration 0003 applied - Added image_url to resources');
  
  db.exec(migration0004);
  console.log('✓ Migration 0004 applied - Added custom_nickname to users');
  
  db.exec(migration0005);
  console.log('✓ Migration 0005 applied - Created leaderboard table');
  
  console.log('\n🎉 Database setup complete!');
  console.log('Tables created:');
  
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  tables.forEach(table => console.log(`  - ${table.name}`));
  
} catch (error) {
  console.error('❌ Error setting up database:', error.message);
} finally {
  db.close();
}