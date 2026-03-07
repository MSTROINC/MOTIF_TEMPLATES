#!/bin/bash

# Startup script for Vite dev server
function ping_server() {
    counter=0
    response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5173")
    while [[ ${response} -ne 200 ]]; do
        let counter++
        if (( counter % 10 == 0 )); then
            echo "Waiting for Vite server to start..."
        fi
        sleep 0.5
        response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5173")
    done
}

ping_server &
cd /home/user && npm run dev -- --host 0.0.0.0
