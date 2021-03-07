const { spawn } = require('child_process');
const websocket = require('ws');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const uuid = require('uuid-random');
const nodemailer = require('nodemailer');
const rimraf = require("rimraf");

const AUDIO_PATH = './temp/';
let WS_URL = process.env.WS_URL;
let token = process.env.TG_TOKEN;
let statEMail = process.env.STAT_EMAIL;

const bot = new TelegramBot(token, { polling: true });

//Почистим диру после старта от возможного мусора
if (fs.existsSync(AUDIO_PATH)) rimraf.sync(AUDIO_PATH);

if (!fs.existsSync(AUDIO_PATH)) fs.mkdirSync(AUDIO_PATH);

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'wa2txtbot@gmail.com',
        pass: 'wa2txt2021'
    }
});

function sendStat(text) {
    if (!statEMail) {
        return;
    }

    let mailOptions = {
        from: 'wa2txtbot@gmail.com',
        to: statEMail,
        subject: 'Бот wa2txt',
        text: text
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

function getWAAudio(id, success, error) {
    let outputFile = id + '.wav';
    let inputFileName = id;

    const ffmpeg = spawn('ffmpeg',
        ['-nostdin',
            '-loglevel',
            'quiet',
            '-i',
            inputFileName,
            '-ar',
            '8000',
            '-ac',
            '1',
            '-f',
            's16le',
            outputFile]);

    ffmpeg.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    ffmpeg.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
    });

    ffmpeg.on('close', (code) => {
        fs.unlinkSync(inputFileName);
        if (code === 0) {
            success(outputFile);
        } else {
            error(outputFile);
        }
    });
}

function getText(inputFileName, success) {
    let result = '';

    const ws = new websocket(WS_URL);

    ws.on('open', function open() {
        let readStream = fs.createReadStream(inputFileName);
        readStream.on('data', function (chunk) {
            ws.send(chunk);
        });
        readStream.on('end', function () {
            ws.send('{"eof" : 1}');
        });
    });

    ws.on('message', function incoming(data) {
        data = JSON.parse(data);
        if ('text' in data) {
            result += ' ' + data.text;
        }
    });

    ws.on('close', function close() {
        success(result);
    });
}

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    if (msg.audio || msg.voice) {
        let audioObj = msg.audio || msg.voice;
        bot.sendChatAction(chatId, 'typing');
        let uPath =  AUDIO_PATH + "/" + uuid();
        if (!fs.existsSync(uPath)) fs.mkdirSync(uPath);
        bot.downloadFile(audioObj.file_id, uPath).then(function(url) {
            let inputFileName = url;
            getWAAudio(inputFileName, function (fileName) {
                getText(fileName, function (text) {
                    fs.unlinkSync(fileName);
                    rimraf.sync(uPath);

                    sendStat('Кто то воспользовался ботом :)');

                    if (!text.trim()) {
                        bot.sendMessage(chatId, 'К сожалению я не смог ни чего разобрать в этой аудио записи');
                    } else {
                        bot.sendMessage(chatId, text);
                    }
                })
            }, function (fileName) {
                fs.unlink(fileName, function () {
                    rimraf.sync(uPath);
                    bot.sendMessage(chatId, 'К сожалению произошла ошибка');
                    return;
                })
            })
        })
    } else {
        bot.sendMessage(chatId, 'Не могу распознать аудио');
        return;
    }
});

bot.on('polling_error', (error) => {
    console.log(error.code);
});
