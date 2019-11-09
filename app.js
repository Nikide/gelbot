/*
Настройка и инфа для запуска
*/
require('dotenv').config();
/*Константы*/
const gb = require('./gbapi.js')
const Telegraf = require('telegraf')
const Markup = require('telegraf/markup')
const Extra = require('telegraf/extra')
const mongoose = require('mongoose');
const debug = require('debug');
const fs = require('fs');

let logger = txt => console.log('\x1b[32m%s\x1b[0m', txt);
let error = txt => console.error('\x1b[31m%s\x1b[0m', txt);

logger(`Запуск...`)
mongoose.connect('mongodb://niki:Qweasd32@ds063158.mlab.com:63158/gbot2', { useNewUrlParser: true });
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => logger(`БД работает`));

//database

var usersSchema = new mongoose.Schema({
    uid: String,
    search: String,
    tick: Number,
    data: String,
    state: String,
    pid: Number
});
var Users = mongoose.model('Users', usersSchema);
//Функция с промисом на проверку юзера возвращает тру если есть юзер
function checkUser(uid) {
    return new Promise((resolve, reject) => {
        Users.findOne({ uid: uid }, (err, user) => {
            user ? debug('bot:checkUser')(`User found`, uid) : debug('bot:checkUser')(`User not found`, uid)
            err ? reject(err) :
                user ? resolve(true) : resolve(false)
        }) //ES2015 ЕПТА
    })
}

function findUser(uid) {

    return new Promise((resolve, reject) => {
        debug('gbot:findUser')(uid)
        Users.findOne({ uid: uid }, (err, user) => {
            err ? reject(err) :
                user ? resolve(user) : reject(false)
        }) //ES2015 ЕПТА
    })
}

//Делаем юзера
function createUser(uid, search, tick, data, state, pid) {
    return new Promise((reslove, reject) =>
        Users.create({ uid: uid, search: search, tick: tick, data: data, state: state, pid: pid }, (err, create) =>
            err ? reject(err) : reslove(create))
    )
}
//Обновляем поиск
function updateSearch(uid, search, data, state) {
    return new Promise((reslove, reject) => Users.updateOne({ uid: uid }, {
        search: search,
        data: data,
        tick: 0,
        pid: 0,
        state: state
    }, (err, update) => err ? reject(err) : reslove(update)))
}

//минифункции

let updateTick = (uid, tick) => {
    return new Promise((reslove, reject) =>
        Users.updateOne({ uid: uid }, { tick: tick }, (err, update) =>
            err ? reject(err) : reslove(update)))
}

//Ворксейс бота
const bot = new Telegraf(process.env.BOT_TOKEN)

function createMessage(ctx, res, tick) {
    return new Promise((reslove, reject) => {
        let data = JSON.parse(res)
        debug('gbot:createMessage')(`For ${ctx.message.from.id} with media ${data[tick ? tick : 0].file_url} has TICK ${tick}`)
        ctx.replyWithPhoto(
            data[tick ? tick : 0].file_url,
            data.length != 0 && Extra.markup((m) =>
                m.inlineKeyboard(
                    [
                        [m.callbackButton('Next', 'next')],
                        [m.callbackButton('Random', 'rand'),m.callbackButton('As album', 'group')],
                        [m.callbackButton('See tags', 'tags')]
                    ]
                )
            )
        ).then(data => reslove(data)).catch(err => ctx.reply(`Uhh... Sorry... Telegram servers can't load this media :( Please, use command /retry or send another request`))
    })
}

function createMediaGroup(ctx) {
    return new Promise(resolve => findUser(ctx.chat.id).then(user => {
        try {
            let media = JSON.parse(user.data)
            let send = [];
            for (let i = 0; i <= 9; i++) {
                logger(media[i + user.tick].length)
                if (i > media.length - 1) {

                    continue;

                } else {
                    send.push({
                        type: media[i + user.tick].file_url.indexOf('.gif') + 1 ? 'video' : 'photo',
                        media: media[i + user.tick].file_url,
                        caption: media[i + user.tick].tags
                    })
                    i == 9 && updateTick(ctx.chat.id, user.tick + i).then(() => ctx.replyWithMediaGroup(send)).then(data=>resolve(data)).catch(e=> ctx.reply('Error! Try Next'));
                    logger(i);
                }
            }
        } catch {
            ctx.reply(`Error:Out of images`)
        }

    }))
}

let startText = `<b>Warning, this bot can show NSFW content!</b>
\nHow to use: Send tags like <code>ahegao</code> <code>nude</code> <code>sex</code> or something... Also, you can combine tags in one request. Enjoy!\n
Check @nikidev for updates!`

bot.command(['start', 'help'], ctx => ctx.reply(startText, Extra.HTML()))

//Media group

bot.command('next',ctx => createMediaGroup(ctx));

bot.hears('Next' ,ctx  => createMediaGroup(ctx))

bot.action('group',ctx =>
  ctx.deleteMessage().then(()=>ctx.reply('Loading...',
   Extra.markup(
    Markup.keyboard(['Next']).resize())
   ).then(()=>createMediaGroup(ctx))))

bot.command('retry', ctx =>
    findUser(ctx.message.from.id).then(user =>
        updateTick(ctx.message.from.id, user.tick + 1).then(() =>
            createMessage(ctx, user.data, user.tick + 1))))


bot.on('text', (ctx) => {
    ctx.reply(`Loading...`,Extra.markup(
    Markup.removeKeyboard()))
    gb.fromTags(`-webm+${ctx.message.text}`, 400, 0).then(res => {
        debug('gbot:onText')(`User ${ctx.message.from.id} request: ${ctx.message.text}`)
        try {
            let test = JSON.parse(res);
            checkUser(ctx.message.from.id).then(is => {
                if (is) {
                    updateSearch(ctx.message.from.id, ctx.message.text, res, 0).then(to =>
                        ctx.replyWithChatAction('upload_photo').then(() => createMessage(ctx, res)).catch(e => debug('gbot:err')(e)))
                } else {
                    createUser(ctx.message.from.id, ctx.message.text, 0, res, 0, 0).then(to =>
                        ctx.replyWithChatAction('upload_photo').then(() => createMessage(ctx, res)).catch(e => debug('gbot:err')(e)))
                }

            }).catch(err => error(err))
        } catch (e) {
            ctx.reply(`<b>Not found</b>\nCheck your request. Also, you can send <code>*</code>  if you don't know what you need`, Extra.HTML())
        }



    });


});



bot.action('next', (ctx) => {
    findUser(ctx.chat.id).then(user => {
        ctx.editMessageCaption(`test`); //Костыль без которого не работает вебхук лол
        let media = JSON.parse(user.data)
        debug(`gbot:nextAction`)(`Next action for ${ctx.chat.id} with media ${media[user.tick + 1].file_url} and TICK ${user.tick}`)
        let img = media[user.tick + 1].file_url.toString();
        ctx.editMessageMedia({
            type: img.indexOf('.gif') + 1 ? 'animation' : 'photo',
            media: img
        }, Extra.HTML().markup((m) =>
            m.inlineKeyboard(
                [media.length != user.tick && [m.callbackButton('Next', 'next')], media.length != 0 && [m.callbackButton('Prev', 'prev')],
                    [m.callbackButton('See tags', 'tags')]
                ]
            )
        )).then(res => updateTick(ctx.chat.id, user.tick + 1)).catch(err =>
            updateTick(ctx.chat.id, user.tick + 1).then(() => ctx.editMessageCaption(`Error load ${img}`, Extra.markup((m) =>
                m.inlineKeyboard(
                    [m.callbackButton('Retry', 'next')]
                )))))
    })

})
bot.action('prev', (ctx) => {
    findUser(ctx.chat.id).then(user => {
        ctx.editMessageCaption(`retry`);
        let media = JSON.parse(user.data)
        debug(`gbot:prevAction`)(`Next action for ${ctx.chat.id} with media ${media[user.tick + 1].file_url} and TICK ${user.tick}`)
        let img = media[user.tick - 1].file_url.toString();
        ctx.editMessageMedia({
            type: img.indexOf('.gif') + 1 ? 'animation' : 'photo',
            media: img
        }, Extra.markup((m) =>
            m.inlineKeyboard(
                [media.length != user.tick && [m.callbackButton('Next', 'next')], user.tick - 1 != 0 && [m.callbackButton('Prev', 'prev')],
                    [m.callbackButton('See tags', 'tags')]
                ]
            )
        )).then(res => updateTick(ctx.chat.id, user.tick - 1)).catch(err =>
            updateTick(ctx.chat.id, user.tick - 1).then(() => ctx.editMessageCaption(`Error load ${img}`, Extra.markup((m) =>
                m.inlineKeyboard(
                    [m.callbackButton('Retry', 'prev')]
                )))))
    })

})
bot.action('rand', (ctx) => {
    findUser(ctx.chat.id).then(user => {
        ctx.editMessageCaption(`retry`); //Я рил хз почему без этого вебхук не работает
        let media = JSON.parse(user.data)
        let random = Math.floor(Math.random() * media.length);
        updateTick(ctx.chat.id, random) //Чтоб работала иннфа по тегам
        let img = media[random].file_url.toString();
        debug(`gbot:randAction`)(`Next action for ${ctx.chat.id} with media ${media[user.tick + 1].file_url} and TICK ${user.tick}`)
        ctx.editMessageMedia({
            type: img.indexOf('.gif') + 1 ? 'animation' : 'photo',
            media: img
        }, Extra.markup((m) =>
            m.inlineKeyboard(
                [
                    [m.callbackButton('Next random', 'rand')],
                    [m.callbackButton('See tags', 'tags')]
                ]
            )
        )).then(ok=>logger(ok)).catch(() => ctx.editMessageCaption(`Error load ${img}`, Extra.markup((m) =>
            m.inlineKeyboard(
                [
                    [m.callbackButton('Retry', 'rand')],
                    [m.callbackButton('See tags', 'tags')]
                ]
            ))))
    })

})

bot.action('tags', ctx => {
    ctx.replyWithChatAction('typing')
    findUser(ctx.chat.id).then(user => {
        let data = JSON.parse(user.data);
        let tags = data[user.tick].tags.trim().split(/\s+/)
        let message = ''
        tags.forEach((item, i) => {
            message += `<code>[${item}]</code> `;
            i + 1 == tags.length && ctx.reply(message, Extra.HTML()
                .markup(m =>
                    m.inlineKeyboard([m.callbackButton('Close', 'close')])
                ));
        })
    })
})
bot.action('close', ctx => ctx.deleteMessage().then(ok=>logger(ok)));
if (process.env.SET_WEBHOOK) {
    const https = require('https')
    const express = require('express')
    let tlsOptions = {
        key: fs.readFileSync('client.key'),
        cert: fs.readFileSync('client.pem'),
        ca: fs.readFileSync('ca.pem')
    }
    bot.telegram.setWebhook(`https://${process.env.HOST}/bot${process.env.BOT_TOKEN}`, { source: tlsOptions.cert }).then(ok => console.log(ok)).catch(e => console.log(e));
    // bot.startWebhook(`bot${process.env.BOT_TOKEN}`, tlsOptions, process.env.PORT);

    let app = express();
    let httpsServer = https.createServer(tlsOptions, app)
    app.get('/', (req, res) => res.send('Hi @nikide'))
    app.use(bot.webhookCallback('/bot' + process.env.BOT_TOKEN))
    httpsServer.listen(process.env.PORT, () => {
        logger('HTTPS WEBHOOK UP')
    })

    /*bot.launch({
        webhook: {
            domain: process.env.HOST,
            port: process.env.PORT,
            tlsOptions: {
                key: fs.readFileSync('client.key'),
                cert: fs.readFileSync('client.pem'),
                ca: fs.readFileSync('ca.pem')
      }

        }
    }).then((res) => { logger(`Бот работает WH`) })*/

} else {
    bot.launch().then(() => { logger(`Бот работает LP`) })
}
//gb.fromTags(`loli`,2,0).then(res => console.log(res));
//---------