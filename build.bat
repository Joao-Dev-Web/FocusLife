@echo off

xcopy css www\css /E /Y /I
xcopy js www\js /E /Y /I
xcopy icons www\icons /E /Y /I

copy index.html www\
copy manifest.json www\
copy sw.js www\

call "C:\Program Files\nodejs\npx.cmd" cap sync

cd android
call gradlew.bat assembleDebug

pause