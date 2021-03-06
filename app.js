const { spawn } = require('child_process');
const websocket = require('ws');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const uuid = require('uuid-random');

const AUDIO_PATH = './temp/';
const WS_URL = process.env.WS_URL;
const token = process.env.TG_TOKEN;

const bot = new TelegramBot(token, { polling: true });

if (!fs.existsSync(AUDIO_PATH)) fs.mkdirSync(AUDIO_PATH);

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
                    fs.rmdirSync(uPath, { recursive: true });
                    bot.sendMessage(chatId, text);
                })
            }, function (fileName) {
                fs.unlink(fileName, function () {
                    fs.rmdirSync(uPath, { recursive: true });
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
