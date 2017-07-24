"use strict"

// Import Modules
    var redis = require('redis');
    var fs = require('fs');
    var smc = require('./server-message-creator.js');

// Variables
    var client = redis.createClient();
    var monitor;
    var monitor_status = false;

    var DEBUG = true;

    // Calculations for converting milliseconds to:
    // [0] - Seconds
    // [1] - Minutes
    // [2] - Hours
    // [3] - Days
    var timeCalc = [ (1000), (1000*60), (1000*60*60), (1000*60*60*24) ];

    // Refresh information for 
    var refresh_config = 1;
    var refresh_timer;
    var refresh_rate = refresh_config * timeCalc[1]; // In Minutes
    
    // DB Statistics Object
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
    // Give other modules access to client and redis_stats objects, as well as DEBUG variable for options
    client,redis_stats,DEBUG,
// System Methods

    setDEBUG(d){ DEBUG = d; },

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
    redisMonitor(command, callback){
        // Array of accepted states for moitoring
        var commands = [ "start", "shutdown" ];


        switch(command){
            case commands[0]: // Start Monitoring
                // If monitoring is already running, inform the user and do no start
                if(monitor_status == "start"){ return "Monitoring Already Running!"; }
                
                // Setup client to monitor DB actions
                monitor = redis.createClient();

                monitor.on('monitor', function(time, args, raw_reply){
                    smc.getMessage(2,null,`${args}`)
                });

                monitor.monitor(function(err, res){
                    // Log Error if there is one
                    if(err){ smc.getMessage(3,5,"Error Starting Monitoring!"); }
                    // Set Current Monitor Status
                    monitor_status = "start";
                    // Return OK if all commands are suggessful
                    if(typeof callback == "function") { return callback(null,"OK") } else { return null };
                });
                break;
            case commands[1]: // Shutdown Monitoring
                // If monitoring is not running, inform the user that it cant be stopped
                if(monitor_status == "shutdown"){ return "Monitoring Not Running!"; }
                // Log Action
                smc.getMessage(2,null,"Closing Monitoring Session");
                // Currently (Redis v3.0) to close monitoring the client session must be disconnected
                monitor.quit(function(err, res){
                    // Log Error during shutdown
                    if(err){ smc.getMessage(3,5,"Error Shutting Down Monitoring!"); }
                    if(res == "OK"){ 
                        // If quit successful, set monitor_status
                        monitor_status = "shutdown";
                        // Restart redis connection
                        monitor = null;
                         if(typeof callback == "function") { return callback(null,"OK") };
                    }
                });
                break;
            default:
                // Notify user that the command they used was invalid 
                smc.getMessage(1,null,`${command} is not a valid command for Redis Monitor`);
                 if(typeof callback == "function") { return callback("Invalid Command",null) };
        }
    }    
}

/**
 * Method updates information about Redis, as well as forces a save if it has been
 * longer than 15 minutes
 */
function refresh(){
    getStatus(function(err, data){
        // Get time since last save in minutes
        var savediff = Math.ceil(getDateDiff(new Date(data.storage.db_last_save), new Date()) / timeCalc[1] );

        // Get number of changes to DB
        var changes = data.storage.db_changes;

        if(DEBUG){  
            smc.getMessage(4,null,`Database Refresh`);
            smc.getMessage(4,null,`DateDiff Time Between: ${ savediff } minutes`);
            smc.getMessage(4,null,`DB Changes: ${changes}`);
        }

        // Backup Database if more than 15 minues has passed or 5 or more changes have been made to the db
        if(savediff > (15) || changes > 5 ){
            smc.getMessage(1,6,"Database Backup Started")
            client.BGSAVE(function(err, res){
                if(err){ smc.getMessage(1,5,`Error Backing Up Redis: ${err}`); }
                else { smc.getMessage(1,null,"Backup Complete"); }
            });
        }
    });

    // Function calculates the difference between 2 date objects by comparing the objects milliseciond conversion of valueOf()
    function getDateDiff( date1, date2 ){
        if(date1 instanceof Date && date2 instanceof Date){
            var d1 = date1.valueOf(), d2 = date2.valueOf();
        
            return d2 - d1;
        }
        else { return 0; }
    }
}

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
    smc.getMessage(1,null,"Connected to Redis DB");
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
    getStatus(function(err,data){
        if(!err){ refresh_timer = setInterval(function(){ refresh() },refresh_rate); }
        else { smc.getMessage(1,5,`Error in getStatus(): ${err}`) }        
    })
});

client.on('end', function(){
    clearInterval(refresh_timer);
});

/**
 * Function updates local object that stores information about the Redis DB.  This is
 * designed to be used to monitor the DB and allow for more advanced analysis of events from the db
 * 
 */
function getStatus(callback){

    // Server - redis_version, tcp_port,uptime_in_seconds,updtime_in_days
    client.INFO('server',function(err, data){
        if(err){ response(err,null); }
        data = data.split("\n");
        redis_stats.redis_version = data[1].split(":")[1].trim();
        redis_stats.port = data[11].split(":")[1].trim();
        redis_stats.uptime.seconds = data[12].split(":")[1].trim();
        redis_stats.uptime.days = data[13].split(":")[1].trim();
        _getClients();
    });
    
    // Clients - connected_clients
    function _getClients() {
        client.INFO('clients', function(err, data){
            if(err){ response(err,null); }

            data = data.split("\n");
            redis_stats.clients_connected = data[1].split(":")[1].trim();
            _getPersis();
        });
    }


    // Persistence - rdb_changes_since_last_save, rdb_bgsave_in_progress, rdb_last_save_time
    function _getPersis(){
        client.INFO('persistence', function(err, data){
            
            if(err){ response(err,null); }

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
        
            response(null, redis_stats);
        });
    }

    // Function handles callback if there is a callback.  If there is no callback
    // in the function in the call.
    function response(err, data){
        if(typeof callback === "function"){ return callback(err, data); }
        else { return err != null ? err : "OK"; }
    }

} 