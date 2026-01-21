#!/bin/bash
cd /home/kavia/workspace/code-generation/chess-mastery-platform-309890-309900/frontend_react
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

