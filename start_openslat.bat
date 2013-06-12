@echo off

REM Start the server
start node app.js & echo Starting Node server...

REM See if the server is listening on port 8080
set count=0
:begin
netstat -an | find ":8080"
FOR /F %%a in ('netstat -an ^| find "127.0.0.1:8080"') do set /A count = count + 1

REM If it is, open the browser. Otherwise, try again
if %count% GEQ 1 (
	start "" http://localhost:8080/
) else (
	echo Trying to connect...
	goto :begin
)
