"use strict"

var express = require('express');
var app = express();


app.get('/', function(req, res){
    console.log("Hello World!");
    res.send("Hello World!");
});

var server = app.listen(8080, function(){
    var now = new Date().toUTCString();
    var port = server.address().port;

    console.log(`${now} - [Server] - Server started on port: ${port}`)
});


/**
 * Status Message Reference:
 * 
 * Server Message:
 *      `${new Date().toUTCString} - [Server] -
 * 
 * Database Message: 
 *      `${new Date().toUTCString} - [Database] -
 * 
 * Error Message:
 *      Minor -> `${new Date().toUTCString} - [Error] - `
 *      Sever -> `${new Date().toUTCString} - [ERROR] - `
 *      Crash -> `${new Date().toUTCString} - [Crash] -
 */