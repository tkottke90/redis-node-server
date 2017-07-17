"use strict"

// Import Modules
    var redis = require('redis');
    var smc = require('./server-message-creator.js');

// Variables
    var client = redis.createClient();
    var monitor;
    var monitor_status = false;

    // DB Statistics
    var redis_stats = {
        "redis_version" : "",
        "port" : "",
        "uptime" : {
            "seconds" : "",
            "days" : ""
        },
        "clients_connected" : 0,
        "storage" : {
            "db_last_save": 0,
            "db_changes" : 0,
            "db_save_status" : "",
            "logs_enabled" : false,
            "log_status" : ""
        }
    };

    // DB Memory Monitoring
    var redis_memory_stats = {}

module.exports = {
    client,
// System Methods
    /**
     * Method calls getStatus Method to update server info in redis_stats
     */
    updateStatus(){
        getStatus();
    },

    /**
     * Method outputs redis_status object for use elsewhere
     */
    redisStats(){
        return redis_stats;
    },

    /**
     * Method to start or stop the Monitoring Function in Redis DB.  Feature implemented as
     * the monitoring feature is resource expensive and can hider the processing speed of the DB
     * @param {string} command 
     */
    redisMonitor(command){
        // Array of accepted states for moitoring
        var commands = [ "start", "shutdown" ];


        switch(command){
            case commands[0]: // Start Monitoring
                // If monitoring is already running, inform the user and do no start
                if(monitor_status == "start"){ return "Monitoring Already Running!"; }
                
                // Setup client to monitor DB actions
                monitor = client.monitor(function(err, res){
                    // Log Error if there is one
                    if(err){ smc.getMessage(3,5,"Error Starting Monitoring!"); }
                    // Log Action
                    smc.getMessage(1,null,"DB Monitoring Mode Enabled");
                    // Set Current Monitor Status
                    monitor_status = "start";
                    // Return OK if all commands are suggessful
                    return "OK";
                });
                break;
            case commands[1]: // Shutdown Monitoring
                // If monitoring is not running, inform the user that it cant be stopped
                if(monitor_status == "shutdown"){ return "Monitoring Not Running!"; }
                // Log Action
                smc.getMessage(2,null,"Closing Monitoring Session, Connection Restarting");
                // Reset monitor variable
                monitor = null;
                // Currently (Redis v3.0) to close monitoring the client session must be disconnected
                client.quit(function(err, res){
                    // Log Error during shutdown
                    if(err){ smc.getMessage(3,5,"Error Shutting Down Monitoring!"); }
                    if(res == "OK"){ 
                        // If quit successful, set monitor_status
                        monitor_status = "shutdown";
                        // Restart redis connection
                        client = redis.createClient();

                        return "OK";
                    }
                });
                break;
            default:
                // Notify user that the command they used was invalid 
                smc.getMessage(1,null,`${command} is not a valid command for Redis Monitor`);
        }
    }    
}

function refresh(){}

/**
 * Method Triggered on Error from Redis DB
 */
client.on('error', function(err){
    smc.getMessage(1,5,"Redis Connection Error");
});

/**
 * Method Triggered on connection request to Redis DB
 */
client.on('connect', function(){
    smc.getMessage(1,null,"Connecting to Redis DB");
    getStatus();
});

client.on('reconnecting', function(){
    smc.getMessage(1,5,"Attempting to Reconnect to Redis DB")
})

/**
 * Method Triggered on successful connection to Redis DB
 */
client.on('ready', function(){
    smc.getMessage(1,null,`Redis Client Connected`);
});

client.on('monitor', function(time, args, raw_reply){
    smc.getMessage(2,null,`${args}`)
});

/**
 * Function updates local object that stores information about the Redis DB.  This is
 * designed to be used to monitor the DB and allow for more advanced analysis of events from the db
 * 
 */
function getStatus(){
    // Server - redis_version, tcp_port,uptime_in_seconds,updtime_in_days
    client.INFO('server',function(err, data){
        data = data.split("\n");
        redis_stats.redis_version = data[1].split(":")[1].split("\r")[0];
        redis_stats.port = data[11].split(":")[1].split("\r")[0];
        redis_stats.uptime.seconds = data[12].split(":")[1].split("\r")[0];
        redis_stats.uptime.days = data[13].split(":")[1].split("\r")[0];
    });
    
    // Clients - connected_clients
    client.INFO('clients', function(err, data){
        data = data.split("\n");
        redis_stats.clients_connected = data[1].split(":")[1].split("\r")[0];
    });


    // Persistence - rdb_changes_since_last_save, rdb_bgsave_in_progress, rdb_last_save_time
    client.INFO('persistence', function(err, data){
        data = data.split("\r\n");
        // rdb_last_save_time
        var date = new Date(0);
        date.setUTCSeconds(data[4].split(":")[1]);
        redis_stats.storage.db_last_save = date;
        // rdb_chagnes_since_last_save
        redis_stats.storage.db_changes = data[2].split(":")[1];
        // rdb_bgsave_in_progress
        data[3].split(":")[1] == 0 ? redis_stats.storage.db_save_status = "idle" : redis_stats.storage.db_save_status = "saving"; 
        // aof_enabled
        data[8].split(":")[1] == 1 ? redis_stats.storage.logs_enabled = true : redis_stats.storage.logs_enabled = false;
        // aof_rewrite_in_progress
        data[9].split(":")[1] == 1 ? redis_stats.storage.log_status = "saving" : redis_stats.storage.log_status = "idle";
    });
}   