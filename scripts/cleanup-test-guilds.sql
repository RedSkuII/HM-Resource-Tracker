-- Clean up test guilds: Test1, Test69, Test70
-- Keep House Melange and Whitelist Second Guild

-- First, delete leaderboard entries for resources in test guilds
DELETE FROM leaderboard 
WHERE resource_id IN (
  SELECT id FROM resources 
  WHERE guild_id IN ('y9Ndpe-ngqPnLGW-LfHGH', '7_O3qIardsLbi6r26pSLO', 'wprzBRhmyv0MBF8a9JOpn')
);

-- Delete resource history for resources in test guilds
DELETE FROM resource_history 
WHERE resource_id IN (
  SELECT id FROM resources 
  WHERE guild_id IN ('y9Ndpe-ngqPnLGW-LfHGH', '7_O3qIardsLbi6r26pSLO', 'wprzBRhmyv0MBF8a9JOpn')
);

-- Delete resources for test guilds
DELETE FROM resources 
WHERE guild_id IN ('y9Ndpe-ngqPnLGW-LfHGH', '7_O3qIardsLbi6r26pSLO', 'wprzBRhmyv0MBF8a9JOpn');

-- Finally, delete the test guilds themselves
DELETE FROM guilds 
WHERE id IN ('y9Ndpe-ngqPnLGW-LfHGH', '7_O3qIardsLbi6r26pSLO', 'wprzBRhmyv0MBF8a9JOpn');

-- Verify remaining guilds
SELECT id, title, discord_guild_id FROM guilds;
