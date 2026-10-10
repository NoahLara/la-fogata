-- Petitions, who is with them and who reported them. There is no column for an author: the only link back to a
-- person is a hash of the secret key their browser keeps, and nothing here can be turned back into the key.

CREATE TABLE petitions (
  id TEXT PRIMARY KEY,
  -- A hash of the owner's key (never the key). It is never sent out.
  owner_hash TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  -- The day it was written, as the author's calendar says, `YYYY-MM-DD`.
  created_on TEXT NOT NULL,
  answered_at INTEGER,
  answered_on TEXT,
  answer_note TEXT,
  -- How many people are with it (the ichthys): one counter, no likes, no ranking.
  prayers INTEGER NOT NULL DEFAULT 0,
  -- 'hidden' once enough different people have reported it: it is no longer shown, and waits for a review.
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden'))
);

-- "My petitions", and how many someone has made in the last minute.
CREATE INDEX petitions_by_owner ON petitions (owner_hash, created_at);
-- The sky: the ones with the fewest prayers first, reading only as many rows as it shows.
CREATE INDEX petitions_for_sky ON petitions (status, prayers);

-- Someone is with a petition: once each. The visitor is only a hash.
CREATE TABLE prayers (
  petition_id TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (petition_id, visitor_hash)
) WITHOUT ROWID;
CREATE INDEX prayers_by_visitor ON prayers (visitor_hash, created_at);

-- A petition someone reported: saved for review, and hidden from them from then on.
CREATE TABLE reports (
  petition_id TEXT NOT NULL,
  reporter_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (petition_id, reporter_hash)
) WITHOUT ROWID;
CREATE INDEX reports_by_reporter ON reports (reporter_hash);
