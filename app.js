const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "cricketMatchDetails.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server is running at http://localhost:3000")
    );
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertPlayerDBObjectToResponseObject = (eachPlayer) => {
  return {
    playerId: eachPlayer.player_id,
    playerName: eachPlayer.player_name,
  };
};

const convertMatchDbObjectToResponseObject = (match) => {
  return {
    matchId: match.match_id,
    match: match.match,
    year: match.year,
  };
};

//Get All Players API
app.get("/players/", async (request, response) => {
  const getAllPlayersQuery = `
        SELECT * 
        FROM player_details
    `;
  const playersArray = await db.all(getAllPlayersQuery);
  response.send(
    playersArray.map((eachPlayer) =>
      convertPlayerDBObjectToResponseObject(eachPlayer)
    )
  );
});

//Get Player Detail API
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `
        SELECT * 
        FROM player_details
        WHERE player_id = ${playerId}
    `;
  const player = await db.get(getPlayerQuery);
  response.send(convertPlayerDBObjectToResponseObject(player));
});

//Update PLayer Detail API
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const playerDetails = request.body;
  const { playerName } = playerDetails;

  const updatePlayerDetailQuery = `
    UPDATE player_details
    SET 
        player_name = '${playerName}'
    WHERE player_id = ${playerId}
  `;
  await db.run(updatePlayerDetailQuery);
  response.send("Player Details Updated");
});

//Get Match Detail API
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchDetailQuery = `
        SELECT * 
        FROM match_details
        WHERE match_id = ${matchId}
    `;
  const match = await db.get(getMatchDetailQuery);
  response.send(convertMatchDbObjectToResponseObject(match));
});

//Returns a list of all the matches of a player
app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerMatchQuery = `
    SELECT
      *
    FROM player_match_score 
      NATURAL JOIN match_details
    WHERE
      player_id = ${playerId};`;
  const matchArray = await db.all(getPlayerMatchQuery);
  response.send(
    matchArray.map((eachMatch) =>
      convertMatchDbObjectToResponseObject(eachMatch)
    )
  );
});

//Returns a list of players of a specific match
app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getMatchPlayerQuery = `
        SELECT *
        FROM player_match_score 
            NATURAL JOIN player_details
        WHERE 
            match_id = ${matchId}
    `;
  const playersArray = await db.all(getMatchPlayerQuery);
  response.send(
    playersArray.map((eachPlayer) =>
      convertPlayerDBObjectToResponseObject(eachPlayer)
    )
  );
});

//Returns the statistics of the total score, fours, sixes of a specific player based on the player ID
app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerStatisticsQuery = `
        SELECT 
            player_id AS playerId,
            player_name AS playerName,
            SUM(score) AS totalScore,
            SUM(fours) AS totalFours,
            SUM(sixes) AS totalSixes
        FROM player_match_score
            NATURAL JOIN player_details
        WHERE
            player_id = ${playerId};
    `;
  const playerMatchDetails = await db.get(getPlayerStatisticsQuery);
  response.send(playerMatchDetails);
});

module.exports = app;
