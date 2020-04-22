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
mongoose.connect('mongodb://' + process.env.DB_URL, { useNewUrlParser: true });
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
        console.log(data[tick ? tick : 0])
        let sample = `https://img2.gelbooru.com/samples/${data[tick ? tick : 0].directory}/sample_${data[tick ? tick : 0].hash}.jpg`
        ctx.replyWithPhoto(
            data[tick ? tick : 0].sample == 0 ? data[tick ? tick : 0].file_url : sample,
            data.length != 0 && Extra.markup((m) =>
                m.inlineKeyboard(
                    [
                        [m.callbackButton('Next', 'next')],
                        [m.callbackButton('Random', 'rand')/*, m.callbackButton('As album', 'group')*/],
                        [m.callbackButton('See tags', 'tags')]
                    ]
                )
            )
        ).then(data => reslove(data)).catch(err => ctx.reply(`Uhh... Sorry... Telegram servers can't load this media :( Please, use command /retry or send another request`))
    })
}

function createMediaGroup(ctx) {
   /* return new Promise(resolve => findUser(ctx.chat.id).then(user => {
        // ctx.reply('Please, wait. This may take several seconds...')
        try {
            let media = JSON.parse(user.data)
            let send = [];
            for (let i = 0; i <= 9; i++) {
                logger(media[i + user.tick].length)
                if (i > media.length - 1) {

                    continue;

                } else {
                    let sample = `https://img2.gelbooru.com/samples/${media[i + user.tick].directory}/sample_${media[i + user.tick].hash}.jpg`
                    media[i + user.tick].file_url.indexOf('.webm') + 1 == 0 &&
                        send.push({
                            type: media[i + user.tick].file_url.indexOf('.gif') + 1 ? 'video' : 'photo',
                            media: media[i + user.tick].sample == 0 && !media[i + user.tick].file_url.toString().indexOf('.gif') + 1 ? media[i + user.tick].file_url.toString() : sample,
                            //caption: media[i + user.tick].tags
                        })
                    console.log(media[i + user.tick]);

                    i == 9 && updateTick(ctx.chat.id, user.tick + i).then(() => ctx.replyWithMediaGroup(send)).then(data => resolve(data)).catch(e => ctx.reply('Error'));
                    logger(i);
                }
            }
        } catch {
            ctx.reply(`Бот сломался лол`)
        }

    }))*/
}
/**
 * Send Sticker With Text
 * @param {*} ctx Context
 * @param {*} sticker - sticker id
 * @param {*} text - message
 */
function sendSWT(ctx, sticker, text) {
    return new Promise((resolve, reject) =>
        ctx.replyWithSticker(sticker).then(() =>
            ctx.reply(text)
                .then(out => resolve(out))
                .catch(err => reject(err))
        ))
}
let loadingSticker = ['CAACAgIAAxkBAAEbM2heltcIdcUlSkCCagf6F5M3ixv8GAACgQIAArzR-Qt7Tmfu3izz7BgE',
    'CAACAgIAAxkBAAEbM2xeltcPJUUaq0n42wcKXeExBGwdqgACGAIAArzR-QvSNOGI3IAF8RgE',
    'CAACAgIAAxkBAAEbM3VeltcZRf177IZz4fsPMG3unhxYjQAClgEAArzR-QvOXIZehxnEcxgE',
    'CAACAgIAAxkBAAEbM3teltcoLLomLmyUn_FfOazQirbHwAAC-AcAArcKFwABuhd1LvaG8twYBA',
    'CAACAgQAAxkBAAEbM4Reltc4e5Rz4v_eSAAB83Fvpt_37LIAAtgAAzjhGgABCY8AARUXzkJ6GAQ',
    'CAACAgIAAxkBAAEbM4peltdO4FSQAAGA__3PE5dINVR9icIAAkMIAALZJDgF4N717T95djgYBA',
    'CAACAgIAAxkBAAEbM5Beltdayw15CdZHIUFZrnFxziidugACpAkAAtkkOAXaL3picxckMxgE',
    'CAACAgQAAxkBAAEbM5Zeltdw6QyA2Jjo9qMKorujeY3gAAMwBQACo46_AAEQisqLIZGDXBgE'
]
let startText = `<b>Warning, this bot can show NSFW content!</b>
\nHow to use: Send tags like <code>ahegao</code> <code>nude</code> <code>sex</code> or something... Also, you can combine tags in one request. Enjoy!\n
Check @nikidev for updates!`

bot.command(['start', 'help'], ctx => ctx.reply(startText, Extra.HTML())).catch(e => console.log(e))

//Media group

bot.command('next', ctx => createMediaGroup(ctx));

bot.hears('Next', ctx => createMediaGroup(ctx))

bot.action('group', ctx =>
    ctx.reply('Please, wait. This may take several seconds...',
        Extra.markup(
            Markup.keyboard(['Next']).resize())
    ).then(() => createMediaGroup(ctx)))

bot.command('retry', ctx =>
    findUser(ctx.message.from.id).then(user =>
        updateTick(ctx.message.from.id, user.tick + 1).then(() =>
            createMessage(ctx, user.data, user.tick + 1))))

/*bot.on('sticker', ctx => {
    ctx.replyWithSticker(ctx.message.sticker.file_id).then(() =>
        ctx.reply(`Debug:\n${ctx.message.sticker.file_id}`))

    console.log(ctx.message.sticker);
});*/
bot.on('text', (ctx) => {
    let searchText = `Loading`;
    let messageId = null;
    let progress = text => messageId != null ? bot.telegram.editMessageText(
        ctx.message.from.id,
        messageId,
        null,
        `${searchText} ${text}`
    ) : console.log('null')
    ctx.replyWithSticker(loadingSticker[Math.floor(Math.random() * 6)], Extra.markup(
        Markup.removeKeyboard())).then(() =>
            ctx.reply(searchText + ' ▁▁▁▁▁▁▁▁▁▁▁▁▁ 0%').then(
                mi => {
                    messageId = mi.message_id
                }
            ))
    progress('█▁▁▁▁▁▁▁▁▁ 10%')
    gb.fromTags(`-webm ${ctx.message.text}`, 400, 0).then(res => {
        progress('██████▁▁▁▁▁▁ 50%')
        debug('gbot:onText')(`User ${ctx.message.from.id} request: ${ctx.message.text}`)
        try {
            let test = JSON.parse(res);
            checkUser(ctx.message.from.id).then(is => {
                progress('█████████▁ 90%')
                if (is) {
                    updateSearch(ctx.message.from.id, ctx.message.text, res, 0).then(to =>
                        ctx.replyWithChatAction('upload_photo').then(() => createMessage(ctx, res)).then(() => progress('██████████ 100%')).catch(e => debug('gbot:err')(e)))
                } else {
                    createUser(ctx.message.from.id, ctx.message.text, 0, res, 0, 0).then(to =>
                        ctx.replyWithChatAction('upload_photo').then(() => createMessage(ctx, res)).then(() => progress('██████████ 100%')).catch(e => debug('gbot:err')(e)))
                }

            }).catch(err => error(err))
        } catch (e) {

            progress(`██████████ 100%\n❌Not found❌\nCheck your request. Also, you can send *  if you don't know what you need`)
        }



    });


});



bot.action('next', (ctx) => {
    try {
        findUser(ctx.chat.id).then(user => {
            // ctx.editMessageCaption(`test`); //Костыль без которого не работает вебхук лол
            let media = JSON.parse(user.data)
            debug(`gbot:nextAction`)(`Next action for ${ctx.chat.id} with media ${media[user.tick + 1].file_url} and TICK ${user.tick}`)
            let sample = `https://img2.gelbooru.com/samples/${media[user.tick + 1].directory}/sample_${media[user.tick + 1].hash}.jpg`
            let img = media[user.tick + 1].sample == 0 && !media[user.tick + 1].file_url.toString().indexOf('.gif') + 1 ? media[user.tick + 1].file_url.toString() : sample;
            console.log(media[user.tick + 1])
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
    } catch (e) {
        ctx.reply(e);
    }

})
bot.action('prev', (ctx) => {
    try {
        findUser(ctx.chat.id).then(user => {
            // ctx.editMessageCaption(`retry`);
            let media = JSON.parse(user.data)
            debug(`gbot:prevAction`)(`Next action for ${ctx.chat.id} with media ${media[user.tick + 1].file_url} and TICK ${user.tick}`)
            let sample = `https://img2.gelbooru.com/samples/${media[user.tick - 1].directory}/sample_${media[user.tick - 1].hash}.jpg}`
            let img = media[user.tick - 1].sample == 0 && !media[user.tick - 1].file_url.toString().indexOf('.gif') + 1 ? media[user.tick - 1].file_url.toString() : sample;
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
    } catch (e) {
        ctx.reply(e);
    }

})
bot.action('rand', (ctx) => {
    findUser(ctx.chat.id).then(user => {
        // ctx.editMessageCaption(`retry`); //Я рил хз почему без этого вебхук не работает
        let media = JSON.parse(user.data)
        let random = Math.floor(Math.random() * media.length);
        updateTick(ctx.chat.id, random) //Чтоб работала иннфа по тегам
        let sample = `https://img2.gelbooru.com/samples/${media[random].directory}/sample_${media[random].hash}.jpg`
        let img = media[random].sample == 0 && !media[random].file_url.toString().indexOf('.gif') + 1 ? media[random].file_url.toString() : sample;
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
        )).then(ok => logger(ok)).catch(() => ctx.editMessageCaption(`Error load ${img}`, Extra.markup((m) =>
            m.inlineKeyboard(
                [
                    [m.callbackButton('Retry', 'rand')],
                    [m.callbackButton('See tags', 'tags')]
                ]
            ))))
    })

})

bot.action('tags', ctx => {
    // ctx.replyWithChatAction('typing')
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
bot.action('close', ctx => ctx.deleteMessage().then(ok => logger(ok)));
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
    bot.startPolling(10000,50)
}
//gb.fromTags(`loli`,2,0).then(res => console.log(res));
//---------
