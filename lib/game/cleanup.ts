/** Deletes expired live records. Provider backups have independent retention. */
export async function cleanup(database:D1Database,now=Date.now()){
 return database.batch([
 database.prepare('DELETE FROM player_locations WHERE expires_at<?').bind(now),
 database.prepare('DELETE FROM rooms WHERE expires_at<?').bind(now),
 database.prepare('DELETE FROM sessions WHERE expires_at<? AND NOT EXISTS(SELECT 1 FROM rooms WHERE host_id=sessions.id) AND NOT EXISTS(SELECT 1 FROM room_members WHERE player_id=sessions.id)').bind(now),
 database.prepare('DELETE FROM rate_limits WHERE window_at<?').bind(now-86400000)
 ]);
}
