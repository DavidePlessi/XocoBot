const request = require('request');
const fs = require('fs');
const telegraf = require('telegraf');
const { JSDOM } = require("jsdom");
const schedule = require('node-schedule');

const imgSelector = "#teecommerce > div.content.body-product > div > div > div > div:nth-child(2) > div.col-md-4 > div > a"
const botToken = require('./botkey.json').botToken;
const bot = new telegraf(botToken);

var users;
var jobs = {};
var latestTshirt = "";
var newDesignNotified = false;
var getTshirtUpdateMessage = () => {
    var res = latestTshirt + "\n\nhttps://www.teetee.eu\n\nHere the last design!!!";
    //console.log(res);
    return res;
};

function addNewUser(name, chatId){
    users[chatId] = name;    
    console.log(`${new Date()}: user added ${chatId}: ${name}`);
    writeUserJson();
    sendTelegraf(chatId, getTshirtUpdateMessage());
}

function readUserJson(){
    users = JSON.parse(fs.readFileSync('./users.json'));
}

function writeUserJson(){
    fs.writeFileSync('./users.json', JSON.stringify(users));
}

function getTshirtUpdated(){
    request.get('https://www.teetee.eu', (error, response, body) => {
        const { window } = new JSDOM(body);
        var $ = require("jquery")(window);
        var imgUrl = $(imgSelector).attr('href');
        if (imgUrl !== latestTshirt){
            latestTshirt = imgUrl;
            newDesignNotified = false;
            console.log(`${new Date()}: Tshirtd updated ${imgUrl}`);
        }       
    });
}

function sendTshirtToAllChat(){
    sendTelegrafToAllChat(getTshirtUpdateMessage());
}

function sendTelegrafToAllChat(message){
    Object.keys(users).forEach((value) => {
        sendTelegraf(value, message);
    })    
}

function sendTelegraf(chatId, message){
    bot.telegram.sendMessage(chatId, message);
    console.log(`${new Date()}: message send to ${chatId}`);
}

function checkAdmin(chatId, func){
    if(chatId === 219448283){
        func();
        return true;
    } else {
        return false;
    }
}

readUserJson();
getTshirtUpdated();

jobs["UpdateTshirt"] = schedule.scheduleJob({hour: 0, minute: 10}, () => {
    getTshirtUpdated();
});

jobs["NotifyNewDesign"] = schedule.scheduleJob({hour: 10, minute: 00}, () => {
    if(newDesignNotified) return;
    sendTshirtToAllChat();
    newDesignNotified = true;
});

bot.start((ctx) => addNewUser(ctx.chat.first_name, ctx.chat.id));
bot.hears('update', (ctx) => sendTelegraf(ctx.chat.id, getTshirtUpdateMessage()));
bot.hears('updateTshirt', (ctx) => {
    if(checkAdmin(ctx.chat.id, getTshirtUpdated)){        
        ctx.reply('T-Shirt aggiornata!');
    } else {
        ctx.reply('E sticazzi?');
    }
});
bot.hears('sendAll', (ctx) => {
    if(!checkAdmin(ctx.chat.id, sendTshirtToAllChat))
        ctx.reply('E sticazzi?');
});
console.log(`${new Date()}: BOT started`);
bot.launch();

