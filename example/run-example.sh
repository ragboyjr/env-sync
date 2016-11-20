#!/usr/bin/env bash

function cmd {
    echo "$ "$1
    $1
}

cmd "cat .env.example"
cmd "cat .env"
cmd "node env-sync.js"
