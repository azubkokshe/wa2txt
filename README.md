# Telegram bot for converterting WhatsApp / Telegram audio messages to text 

**1. Create your own telegram bot<br/>**
[botfather](https://t.me/botfather)

**2. Create an user-defined bridge network**<br/>
```bash
docker network create wa2txt
```

**3. Run Kaldi**<br/>
```bash
docker run --network=wa2txt -p 2700:2700 --name kaldi -d alphacep/kaldi-ru:latest
```

**4. Run telegram bot**<br/>
```bash
docker run --restart=always --network=wa2txt -e TG_TOKEN={token} -e WS_URL=ws://kaldi:2700 --name wa2txt -d zzzubalex/wa2txt:latest
```

_change {token} to your token without '{}'_