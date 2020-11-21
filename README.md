# Telegram bot for converterting WhatsApp / Telegram audio messages to text 

**1. Create an user-defined bridge network**<br/>
docker network create wa2txt

**2. Run Kaldi**<br/>
docker run --network=wa2txt -p 2700:2700 --name kaldi -d alphacep/kaldi-ru:latest

**3. Run telegram bot**<br/>
docker run --network=wa2txt -e TG_TOKEN={token} -e WS_URL=ws://kaldi:2700 --name wa2txt -d zzzubalex/wa2txt:latest