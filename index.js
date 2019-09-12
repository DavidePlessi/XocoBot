const request = require('request');
const {readFileSync, writeFileSync} = require('fs');
const telegraf = require('telegraf');
const { JSDOM } = require("jsdom");
const schedule = require('node-schedule');

const imgSelector = "#teecommerce > div.content.body-product > div > div > div > div:nth-child(2) > div.col-md-4 > div > a";
const botToken = require('./botkey.json').botToken;
const bot = new telegraf(botToken);

let users;
const jobs = {};
let latestShirt = "";
let newDesignNotified = false;
const getShirtUpdateMessage = () => latestShirt + "\n\nhttps://www.teetee.eu\n\nHere the last design!!!";

const log = (message) => { console.log(`${new Date()}: ${message}`); }

function addNewUser(name, chatId){
    users[chatId] = name;    
    log(`user added ${chatId}: ${name}`);
    writeUserJson();
    sendTelegraf(chatId, getShirtUpdateMessage());
}

function readUserJson(){
    users = JSON.parse(readFileSync('./users.json').toString());
}

function writeUserJson(){
    writeFileSync('./users.json', JSON.stringify(users));
}

function getShirtUpdated(){
    request.get('https://www.teetee.eu', (error, response, body) => {
        const { window } = new JSDOM(body);
        const $ = require("jquery")(window);
        const imgUrl = $(imgSelector).attr('href');
        if (imgUrl !== latestShirt){
            latestShirt = imgUrl;
            newDesignNotified = false;
            log(`T-Shirt updated ${imgUrl}`);
        }       
    });
}

function sendShirtToAllChat(){
    sendTelegrafToAllChat(getShirtUpdateMessage());
}

function sendTelegrafToAllChat(message){
    if(!message) log(`sendTelegraf -> pass this fucking message`)
    Object.keys(users).forEach((value) => {
        sendTelegraf(value, message);
    })    
}

function sendTelegraf(chatId, message){
    bot.telegram.sendMessage(chatId, message).then(() => log(`message send to ${chatId}`));
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
getShirtUpdated();

jobs["UpdateShirt"] = schedule.scheduleJob({hour: 1, minute: 00}, () => {
    getShirtUpdated();
});

jobs["NotifyNewDesign"] = schedule.scheduleJob({hour: 10, minute: 0}, () => {
    if(newDesignNotified) return;
    sendShirtToAllChat();
    newDesignNotified = true;
});

bot.start((ctx) => addNewUser(ctx.chat.first_name, ctx.chat.id));
bot.hears('update', (ctx) => sendTelegraf(ctx.chat.id, getShirtUpdateMessage()));
bot.hears('updateShirt', (ctx) => {
    if(checkAdmin(ctx.chat.id, getShirtUpdated)){
        ctx.reply('T-Shirt updated!').then(() => log(`updateShirt -> yeah`));
    } else {
        ctx.reply('E sticazzi?').then(() => log(`updateShirt -> sticazzi`));
    }
});
bot.hears('sendAll', (ctx) => {
    if(!checkAdmin(ctx.chat.id, sendShirtToAllChat))
        ctx.reply('E sticazzi?').then(() => log(`updateShirt -> sticazzi`));
});

bot.launch().then(() => log(`BOT started`));

