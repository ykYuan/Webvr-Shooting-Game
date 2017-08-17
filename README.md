# Webvr-Shooting-Game

A meteor shooting game made using Three.js for the frontend and Node.js for the backend. 

See example of game here:
http://g.recordit.co/pdJBAncpHk.gif

To have game work on local desktop, the following are the setup instructions:
1. Download entire folder
2. cd to directory with app.js
3. npm install
4. node app.js
5. Then go to http://localhost:8081 to play the game


Instructions:
1. Right click to move center cursor around the screen
2. Asteroid explodes after cursor has been on the asteroid for certain period of time, the green ring in the cursor is used as a countdown
3. Game ends when timer goes out
4. Game ends when not reaching enough points on certain checkpoints along the path
5. First player to enter game is admin; when admin presses start game starts for all the players
6. Refresh page to start again

Note: Multiplayer feature enabled but requires remote server to host the Node.js backend. For the single player version you can simply open mutiple windows to test the multiplayer feature.


