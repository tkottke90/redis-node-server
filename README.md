# redis-node-server

RESTful Backend design using ExpressJS, Node.js, and Redis DB.  

Web Serivce allows user to store, retrieve, update, and delete key-value pairs from a stand alone Redis DB



## Node.js Methods:

### GET Root:
Path returns information about the connection and logs the attempt to the server console 

Path: http://localhost:8080/

### GET Key
Path returns the value of the key in the uri request if a key is found, returns no key if no key with that name is listed in the redis db.  If the JSON path is used, then the key and value is returned as a JSON object

GET String Value Path: http://localhost:8080/redis/get/:key

GET JSON Object Path: http://localhost8080/redis/get/json/:key

### PUT
Path requires that a JSON object be set in the payload that includes both a key and a value or the key/value pair in the uri as parameters.  The service will then add the information to the Redis DB.  This method is does not check first if there is already an object and it is up to the user to either first check or use the POST path to confirm that the key is not overwriting previous data.

Data Structure:
{
  key : Key,
  value : Value
}

PUT JSON Path: http://localhost:8080/redis/put/json

PUT URI Path: http://localhost8080/redis/put/:key.:value

### POST
Like the PUT Path, this also requires a JSON object or include the values in the uri, with an included "overwrite" field/parameter that contains a boolean.  If this value is true, any pre-existing key will be overwritten, otherwise the service will return that a key already exists.

Data Structure:
{
  key : Key,
  value : Value,
  overwrite: boolean
}


Path: http://localhost:8080/redis/post

### DELETE
Path will delete a key from the database if it currently exsists there.  As a backup for this process and to protect from accidental deletion, the method will first make a copy of the key-value pair and store it in a JSON file called delete_log.json and then delete it from the db.

Path: http://localhost:8080/redis/delete/:key

### OPTIONS
Path will send a list of options available to the user from this service

http://localhost:8080/options

### OPTIONS/SET
Path uses a PUT command to allow the user to set various preferences in the webserver by passing uri params

Current Options Available:
 
  - DEBUG
    - Enables/Disables the logging of various debug level information in the Services Runtime Log
  
  - Monitor
    - Enables/Disables the logging of database level monitoring data

## Redis DB:
Redis DB is an in-memory data structures server

### Methods
#### MONITOR DB
Method made available by the Redis DB Client Object.  Produces results of any intereactions between the client and the Redis server.  This is made available in this service in the console as part of the log

Start Path: http://localhost:8080/options/set/monitor.start

End Path: http://localhost:8080/options/set/monitor.shutdown

## Other Modules:
### Server Message Creator:
Module is designed to standardize the logs pushed out to the server with a uniform look 

#### getMessage
Method returns a standardized method that uses 1 - 2 stored listes as references, then uses a template string to write that information to the console.

Examples: 

    - Sun, 23 Jul 2017 04:02:51 GMT - [SERVER] - Server started on port: 8080
    - Sun, 23 Jul 2017 04:02:53 GMT - [DATABASE] - [ERROR] - Attempting to Reconnect to Redis DB

## References: 

Redis DB - https://www.redis.io

Tutorials Point on RESTful API Dev  https://www.tutorialspoint.com/restful/restful_introduction.htm
